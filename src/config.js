// ---------------------------------------------------------------------------
// ArkTerm — Config: env loading, model registry, switch, wizard
// ---------------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
const os = require('os');
const dotenv = require('dotenv');
const chalk = require('chalk');
const boxen = require('boxen');
const inquirer = require('inquirer');

// ── Env-file paths ──────────────────────────────────────────────────────────
const CWD_ENV = path.join(process.cwd(), '.env');
const HOME_ARKTERM_ENV = path.join(os.homedir(), '.arkterm.env');

function loadEnvFiles() {
  if (fs.existsSync(CWD_ENV)) dotenv.config({ path: CWD_ENV });
  if (fs.existsSync(HOME_ARKTERM_ENV)) dotenv.config({ path: HOME_ARKTERM_ENV });
}
loadEnvFiles();

// ── Constants ───────────────────────────────────────────────────────────────
const ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/v3';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

// ── Model registry ─────────────────────────────────────────────────────────
const MODEL_REGISTRY = {
  doubao: {
    display: 'Doubao',
    apiKeyAttr: 'ARK_API_KEY',
    modelAttr: 'DOUBAO_ENDPOINT_ID',
    baseUrl: ARK_BASE_URL,
  },
  deepseek: {
    display: 'DeepSeek',
    apiKeyAttr: 'DEEPSEEK_API_KEY',
    modelAttr: 'DEEPSEEK_MODEL',
    baseUrl: DEEPSEEK_BASE_URL,
  },
  claude: {
    display: 'Claude',
    apiKeyAttr: 'CLAUDE_API_KEY',
    modelAttr: 'CLAUDE_MODEL',
    baseUrl: 'https://api.anthropic.com/v1',
  },
};

const ALIASES = {
  db: 'doubao',
  doubao: 'doubao',
  ds: 'deepseek',
  deepseek: 'deepseek',
  cl: 'claude',
  claude: 'claude',
};

// ── Mutable runtime state ──────────────────────────────────────────────────
const state = {
  currentModelKey: 'doubao',
  apiKey: '',
  baseUrl: ARK_BASE_URL,
  modelId: '',
};

function initFromEnv() {
  state.apiKey = process.env.ARK_API_KEY || process.env.VOLC_API_KEY || '';
  state.baseUrl = ARK_BASE_URL;
  state.modelId = process.env.DOUBAO_ENDPOINT_ID || '';
  state.currentModelKey = 'doubao';
}

/**
 * Return the config object consumable by `new OpenAI({...})`.
 */
function getClientConfig() {
  return {
    apiKey: state.apiKey,
    baseURL: state.baseUrl,
  };
}

/**
 * Interactive on-boarding wizard (inquirer).
 * Returns a Promise that resolves when config is saved.
 */
async function validate() {
  const arkKey = process.env.ARK_API_KEY || process.env.VOLC_API_KEY || '';
  const endpoint = process.env.DOUBAO_ENDPOINT_ID || '';

  if (arkKey.trim() && endpoint.trim()) {
    // Already configured — just hydrate state
    initFromEnv();
    return;
  }

  // ── Welcome wizard ──────────────────────────────────────────────────────
  console.log();
  console.log(
    boxen(
      chalk.cyan.bold('欢迎使用 ArkTerm（方舟终端）！\n\n') +
        '检测到是首次使用，让我们花 10 秒钟\n' +
        '完成核心大模型凭证的配置 …',
      {
        title: chalk.yellow.bold('🚀 首次配置向导'),
        borderStyle: 'round',
        borderColor: 'yellow',
        padding: 1,
        margin: 0,
      }
    )
  );
  console.log();

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'arkKey',
      message:
        '❶ 请输入您的火山引擎方舟 API Key (ARK_API_KEY):',
      validate: (v) => (v.trim() ? true : 'ARK_API_KEY 不能为空'),
    },
    {
      type: 'input',
      name: 'endpoint',
      message:
        '❷ 请输入您的方舟推理接入点 ID (DOUBAO_ENDPOINT_ID):',
      validate: (v) => (v.trim() ? true : 'DOUBAO_ENDPOINT_ID 不能为空'),
    },
    {
      type: 'input',
      name: 'dsKey',
      message:
        '❸ (可选) 请输入 DeepSeek API Key（留空跳过）:',
    },
    {
      type: 'input',
      name: 'dsModel',
      message:
        '❹ (可选) DeepSeek 模型名（默认 deepseek-chat，留空跳过）:',
      default: 'deepseek-chat',
    },
  ]);

  // ── Persist to ~/.arkterm.env ──────────────────────────────────────────
  const lines = [
    `ARK_API_KEY=${answers.arkKey.trim()}`,
    'ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3',
    `DOUBAO_ENDPOINT_ID=${answers.endpoint.trim()}`,
  ];
  if (answers.dsKey.trim()) {
    lines.push(`DEEPSEEK_API_KEY=${answers.dsKey.trim()}`);
    if (answers.dsModel.trim())
      lines.push(`DEEPSEEK_MODEL=${answers.dsModel.trim()}`);
    lines.push('DEEPSEEK_BASE_URL=https://api.deepseek.com');
  }
  lines.push(''); // trailing newline
  fs.writeFileSync(HOME_ARKTERM_ENV, lines.join('\n'), 'utf-8');

  console.log(
    chalk.green('✔ 配置已保存至 ~/.arkterm.env！正在启动 …')
  );

  // Reload env
  dotenv.config({ path: HOME_ARKTERM_ENV, override: true });
  initFromEnv();
}

// ── Model switching ────────────────────────────────────────────────────────

/**
 * Switch to a different model by alias.
 * Returns the display name on success, null on failure.
 */
function switchModel(raw) {
  const key = ALIASES[raw.toLowerCase().trim()];
  if (!key) {
    console.log(chalk.yellow(`未知模型别名 '${raw}'。可用: db / ds / cl`));
    return null;
  }

  const entry = MODEL_REGISTRY[key];
  const apiKey = process.env[entry.apiKeyAttr] || '';
  if (!apiKey.trim()) {
    console.log(
      chalk.yellow(
        `未配置 ${entry.display} 的 API Key。请在 .env 中设置 ${entry.apiKeyAttr}`
      )
    );
    return null;
  }

  const modelId = process.env[entry.modelAttr] || '';
  if (!modelId.trim()) {
    console.log(
      chalk.yellow(
        `未配置 ${entry.display} 的模型 ID。请在 .env 中设置 ${entry.modelAttr}`
      )
    );
    return null;
  }

  state.currentModelKey = key;
  state.apiKey = apiKey;
  state.baseUrl = entry.baseUrl;
  state.modelId = modelId;
  return entry.display;
}

function getCurrentDisplayName() {
  const entry = MODEL_REGISTRY[state.currentModelKey];
  return entry ? entry.display : 'Doubao';
}

function listAvailableModels() {
  const lines = Object.entries(MODEL_REGISTRY).map(([key, entry]) => {
    const hasKey = !!(process.env[entry.apiKeyAttr] || '').trim();
    const status = hasKey ? chalk.green('✓') : chalk.dim('✗');
    const active = key === state.currentModelKey ? chalk.cyan.bold(' ← active') : '';
    const aliases = Object.entries(ALIASES)
      .filter(([a, k]) => k === key && a !== key)
      .map(([a]) => a);
    const aliasStr = aliases.length > 0 ? ` (${aliases.join(', ')})` : '';
    return `  ${status} ${entry.display}${aliasStr}${active}`;
  });
  return lines.join('\n');
}

module.exports = {
  state,
  MODEL_REGISTRY,
  ALIASES,
  ARK_BASE_URL,
  DEEPSEEK_BASE_URL,
  initFromEnv,
  getClientConfig,
  validate,
  switchModel,
  getCurrentDisplayName,
  listAvailableModels,
};
