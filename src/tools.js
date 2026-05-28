// ---------------------------------------------------------------------------
// ArkTerm — Tools: 5 local tool implementations + OpenAI function schemas
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const inquirer = require('inquirer');
const { isSafeCommand } = require('./security');

const WORKSPACE = process.cwd();

// ── Tool implementations ──────────────────────────────────────────────────

/**
 * View the directory structure of the workspace (depth ≤ 3).
 */
function viewStructure(rootDir) {
  const root = rootDir || WORKSPACE;
  const lines = [];
  lines.push(`📁 ${root}`);

  function walk(dir, prefix, depth) {
    if (depth > 3) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    // Sort: dirs first, then alphabetical
    entries.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory())
        return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const isLast = i === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      lines.push(prefix + connector + entry.name + (entry.isDirectory() ? '/' : ''));
      if (entry.isDirectory()) {
        const nextPrefix = prefix + (isLast ? '    ' : '│   ');
        walk(path.join(dir, entry.name), nextPrefix, depth + 1);
      }
    }
  }

  walk(root, '', 0);
  return lines.join('\n');
}

/**
 * Read a file (UTF-8) and return its content head/tail.
 */
function readFile(filePath) {
  const abs = path.resolve(WORKSPACE, filePath);
  if (!fs.existsSync(abs)) {
    return `[Error] 文件不存在: ${filePath}`;
  }
  const stat = fs.statSync(abs);
  if (!stat.isFile()) {
    return `[Error] 不是文件: ${filePath}`;
  }
  const content = fs.readFileSync(abs, 'utf-8');
  const lines = content.split('\n');
  const totalLines = lines.length;
  const totalChars = content.length;

  // Preview: first 50 + last 50 lines if too large
  if (totalLines > 200) {
    const head = lines.slice(0, 50).join('\n');
    const tail = lines.slice(-50).join('\n');
    return (
      `📄 ${filePath} (${totalLines} lines, ${totalChars} chars)\n` +
      `─── HEAD (1-50) ───\n${head}\n` +
      `─── ... (${totalLines - 100} lines omitted) ───\n` +
      `─── TAIL (${totalLines - 49}-${totalLines}) ───\n${tail}`
    );
  }

  return `📄 ${filePath} (${totalLines} lines, ${totalChars} chars)\n${content}`;
}

/**
 * Write (or overwrite) a file. Returns a confirmation string.
 * Supports both full content and patching instructions.
 */
function writeFile(filePath, content) {
  const abs = path.resolve(WORKSPACE, filePath);
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(abs, content, 'utf-8');
  const stat = fs.statSync(abs);
  return `✅ ${filePath} written (${stat.size} bytes).`;
}

/**
 * Apply a text replacement patch to an existing file.
 * Simulates the original Python `patch_file` logic.
 */
function patchFile(filePath, search, replace) {
  const abs = path.resolve(WORKSPACE, filePath);
  if (!fs.existsSync(abs)) {
    return `[Error] 文件不存在: ${filePath}`;
  }
  const original = fs.readFileSync(abs, 'utf-8');
  if (!original.includes(search)) {
    // try fuzzy: strip leading whitespace tolerance
    const normalized = original
      .split('\n')
      .map((l) => l.trimEnd())
      .join('\n');
    const searchNorm = search
      .split('\n')
      .map((l) => l.trimEnd())
      .join('\n');
    if (normalized.includes(searchNorm)) {
      // Reconstruct with original whitespace — just do direct replacement
      return `[Error] 精确匹配失败，存在空白符差异。请提供精确的原文片段。`;
    }

    // Try to locate similar lines
    const searchFirstLine = search.split('\n')[0].trim();
    const lines = original.split('\n');
    const similar = lines
      .map((l, i) => ({ line: l, index: i }))
      .filter(({ line }) => line.includes(searchFirstLine.slice(0, 30)));
    if (similar.length > 0) {
      const hints = similar
        .slice(0, 3)
        .map(({ line, index }) => `  L${index + 1}: ${line.slice(0, 80)}`)
        .join('\n');
      return (
        `[Error] 未找到精确匹配。附近行:\n${hints}\n` +
        `请提供精确的原文片段（注意缩进格式）`
      );
    }

    return `[Error] 未找到匹配内容: "${search.slice(0, 60)}..."`;
  }

  const updated = original.replace(search, replace);
  if (updated === original) {
    return `[Error] 替换后无变化，请检查 search/replace 内容。`;
  }

  fs.writeFileSync(abs, updated, 'utf-8');
  const replacedLen = search.length;
  return `✅ ${filePath} patched (${replacedLen} chars replaced).`;
}

/**
 * Execute a shell command (with security gate).
 */
async function executeCommand(command) {
  // ── Windows command translation ─────────────────────────────────────────
  if (process.platform === 'win32') {
    // ls → dir: strip -flags that don't map to Windows /flags
    command = command.replace(/^ls(\s+.*)?$/i, (_, trail) => {
      if (!trail) return 'dir';
      const cleaned = trail.replace(/(?:^|\s)--?\w+/g, '').replace(/\s+/g, ' ').trim();
      return cleaned ? `dir ${cleaned}` : 'dir';
    });
    // cat → type: same treatment
    command = command.replace(/^cat(\s+.*)?$/i, (_, trail) => {
      if (!trail) return 'type';
      const cleaned = trail.replace(/(?:^|\s)--?\w+/g, '').replace(/\s+/g, ' ').trim();
      return cleaned ? `type ${cleaned}` : 'type';
    });
  }

  // ── Security gate ──────────────────────────────────────────────────────
  if (!isSafeCommand(command)) {
    return `[Blocked] 命令被安全模块拦截 (匹配黑名单)。`;
  }

  console.log(chalk.yellow(`\n  [Security Warning] Executing: ${command}`));
  const { confirmed } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirmed',
    message: 'Execute this command?',
    default: false,
  }]);
  if (!confirmed) {
    return `[Denied] 用户未批准该命令。`;
  }

  // ── Execution ──────────────────────────────────────────────────────────
  try {
    const stdout = execSync(command, {
      cwd: WORKSPACE,
      timeout: 30_000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf-8',
      windowsHide: true,
    });
    const output = stdout || '(no output)';
    return `$ ${command}\n${output.slice(0, 3000)}${
      output.length > 3000 ? '\n… (output truncated)' : ''
    }`;
  } catch (err) {
    const stderr = err.stderr || err.message || '(unknown error)';
    const stdout = err.stdout || '';
    return `$ ${command}\n${chalk.red('Error:')} ${stderr.slice(0, 1000)}${
      stdout ? `\n${stdout.slice(0, 1000)}` : ''
    }`;
  }
}

// ── OpenAI Function‑Calling Schemas ───────────────────────────────────────

const TOOL_SCHEMAS = [
  {
    type: 'function',
    function: {
      name: 'view_structure',
      description:
        '查看工作区的目录结构（递归，最大深度 3 层）。排除 . 开头和 node_modules 目录。',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '可选的子路径，默认为工作区根目录',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取工作区内的一个 UTF‑8 文件并返回内容预览（大文件只返回首尾）。',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '文件路径（相对于工作区根目录）',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: '创建或覆盖写入一个文件（自动创建父目录）。',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '文件路径（相对于工作区根目录）',
          },
          content: {
            type: 'string',
            description: '文件完整内容',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'patch_file',
      description:
        '对已有文件执行精确的搜索‑替换操作。search 必须与原文精确匹配（包括缩进）。',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: '文件路径（相对于工作区根目录）',
          },
          search: {
            type: 'string',
            description: '要被替换的原文片段（必须精确匹配，包括缩进）',
          },
          replace: {
            type: 'string',
            description: '替换后的新内容',
          },
        },
        required: ['path', 'search', 'replace'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description:
        '在操作系统 Shell 中执行命令。会自动检查安全黑名单并征求用户批准。超时 30 秒。',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: '要执行的 Shell 命令',
          },
        },
        required: ['command'],
      },
    },
  },
];

// ── Dispatch table ────────────────────────────────────────────────────────

const TOOL_DISPATCH = {
  view_structure: async (args) => viewStructure(args.path || WORKSPACE),
  read_file: async (args) => readFile(args.path),
  write_file: async (args) => writeFile(args.path, args.content),
  patch_file: async (args) => patchFile(args.path, args.search, args.replace),
  execute_command: async (args) => executeCommand(args.command),
};

module.exports = {
  TOOL_SCHEMAS,
  TOOL_DISPATCH,
};
