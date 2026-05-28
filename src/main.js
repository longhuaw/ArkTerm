// ---------------------------------------------------------------------------
// ArkTerm — Terminal AI Agent Main Loop
// ---------------------------------------------------------------------------
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const boxen = require('boxen');
const { OpenAI } = require('openai');
const { ChatSession } = require('./session');
const { TOOL_SCHEMAS, TOOL_DISPATCH } = require('./tools');
const config = require('./config');
const { MODEL_REGISTRY, state, switchModel, getCurrentDisplayName } = config;

// ── Constants ─────────────────────────────────────────────────────────────
const AGENT_MAX_TURNS = 10;
const SYSTEM_PROMPT = `You are ArkTerm, an autonomous terminal AI agent. You have access to 5 tools:

1. **view_structure** — view the project directory tree (depth ≤ 3)
2. **read_file** — read a file's content (UTF-8, auto-preview for large files)
3. **write_file** — create or overwrite a file
4. **patch_file** — search-and-replace edit on an existing file
5. **execute_command** — run a shell command (with security gate + user approval)

Your job is to help the user develop their project. When the user asks to read, write, or modify files, always use the appropriate tool instead of just describing what to do.

Rules:
- Always read a file before editing it.
- Use view_structure first when exploring an unfamiliar project.
- Each tool call is one unit of work; you have up to 10 turns per request.
- When the task is complete, explain what was done.
- For casual questions, just answer directly.`;

// ── OpenAI Client Factory (reflects current config state) ─────────────────

function createClient() {
  const { apiKey, baseURL } = config.getClientConfig();
  if (!apiKey || !baseURL) {
    console.error(chalk.red('Error: API key or base URL not configured.'));
    process.exit(1);
  }
  return new OpenAI({ apiKey, baseURL });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function detectIntent(text) {
  const writingHints = /(?:^|\s)(?:read|write|edit|patch|create|make|run|exec|ls|cd|cat|grep|find|install|build|test|deploy|view|show|list|change|update|delete|remove|add|fix|debug|refactor|rename|move|copy|search|replace|format|compile|start|stop|restart)(?:\s|$)/i;
  const toolWords = [
    'file', 'directory', 'folder', 'project', 'code', 'script', 'config',
    'module', 'package', 'function', 'class', 'import', 'require',
    'read', 'check', 'see what', 'show me', 'list',
  ];
  const hasWriteIntent = writingHints.test(text);
  const hasToolWords = toolWords.some((w) => text.toLowerCase().includes(w));
  return hasWriteIntent || hasToolWords;
}

// ── Stream & Live Display (boxen‑based real‑time panel) ───────────────────

async function streamWithPanel(client, messages, withTools) {
  const displayName = getCurrentDisplayName();
  const startTime = Date.now();
  let firstTokenTime = null;
  let totalChars = 0;
  let fullText = '';
  const toolCallsAcc = {};
  let lastBoxLineCount = 0;

  const body = {
    model: state.modelId,
    messages,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (withTools) body.tools = TOOL_SCHEMAS;
  if (body.tools && body.tools.length === 0) delete body.tools;

  function buildBox(text, genSpeed, ttft, avgSpeed, chars) {
    const displayText = text || chalk.dim('streaming…');
    const metrics =
      chalk.dim('TTFT ') + chalk.cyan(ttft.toFixed(2) + 's') + '  ' +
      chalk.dim('Gen ') + chalk.bold.cyan(Math.round(genSpeed) + ' ch/s') + '  ' +
      chalk.dim('Avg ') + chalk.cyan(Math.round(avgSpeed) + ' ch/s') + '  ' +
      chalk.dim('⎸ ' + chars + ' chars');

    return boxen(
      displayText + '\n\n' + chalk.gray('─── Speed ───') + '\n' + metrics,
      {
        title: chalk.bold.green(displayName),
        borderStyle: 'round',
        borderColor: 'green',
        padding: 1,
        margin: 0,
      }
    );
  }

  function renderBox(text, genSpeed, ttft, avgSpeed, chars) {
    const boxStr = buildBox(text, genSpeed, ttft, avgSpeed, chars);
    const lineCount = boxStr.split('\n').length;
    if (lastBoxLineCount > 0) {
      process.stdout.write(`\x1b[${lastBoxLineCount}A\x1b[J`);
    }
    process.stdout.write(boxStr + '\n');
    lastBoxLineCount = lineCount;
  }

  // Seed placeholder
  renderBox('', 0, 0, 0, 0);
  let lastRender = 0;

  const updateFn = (now) => {
    const elapsed = (now - startTime) / 1000;
    const ttft = firstTokenTime ? (firstTokenTime - startTime) / 1000 : elapsed;
    const genE = firstTokenTime ? (now - firstTokenTime) / 1000 : 0.001;
    const genS = genE > 0 ? totalChars / genE : 0;
    const avgS = elapsed > 0 ? totalChars / elapsed : 0;
    const displayText = fullText
      ? (totalChars > 200 ? '…' + fullText.slice(-200) : fullText)
      : '';
    renderBox(displayText, genS, ttft, avgS, totalChars);
  };
  try {
    const stream = await client.chat.completions.create(body);
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        if (!firstTokenTime) firstTokenTime = Date.now();
        fullText += delta.content;
        totalChars += delta.content.length;
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallsAcc[idx]) {
            toolCallsAcc[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
          }
          if (tc.id) toolCallsAcc[idx].id = tc.id;
          if (tc.type) toolCallsAcc[idx].type = tc.type;
          if (tc.function?.name) toolCallsAcc[idx].function.name += tc.function.name;
          if (tc.function?.arguments) toolCallsAcc[idx].function.arguments += tc.function.arguments;
        }
      }
      const now = Date.now();
      if (now - lastRender > 50) {
        lastRender = now;
        updateFn(now);
      }
    }

    // Final render
    const now = Date.now();
    updateFn(now);

    // Enforce final line-feed
    process.stdout.write('\n');

    // Build tool calls list
    const toolCalls = Object.values(toolCallsAcc)
      .sort((a, b) => {
        // index-based sort is inherent from Object.values insertion order
        return 0;
      })
      .map((tc) => ({
        id: tc.id,
        type: tc.type || 'function',
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));

    return { fullText, toolCalls };
  } catch (err) {
    if (lastBoxLineCount > 0) {
      process.stdout.write(`\x1b[${lastBoxLineCount}A\x1b[J`);
    }
    lastBoxLineCount = 0;
    const msg = err.message || String(err);
    console.error(chalk.red.bold('\n✗ API Error: ') + msg);
    return { fullText: '', toolCalls: [] };
  }
}

// ── Raw‑Mode Input Reader (handles Tab for model switching) ───────────────

async function readLine(promptStr) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();

    let buf = '';
    let pos = 0;

    function display() {
      const left = promptStr + buf.slice(0, pos);
      const right = buf.slice(pos);
      const cursorChar = right.length > 0 ? right[0] : ' ';
      stdout.write('\r' + left + chalk.inverse(cursorChar) + right.slice(1) + '\x1b[K');
      stdout.write(`\r\x1b[${promptStr.length + pos}C`);
    }

    display();

    function cleanup() {
      if (stdin.isTTY && wasRaw === false) stdin.setRawMode(false);
    }

    function onKeypress(ch, key) {
      if (!key) return;

      switch (key.name) {
        case 'return':
        case 'enter':
          stdin.removeListener('keypress', onKeypress);
          cleanup();
          stdout.write('\n');
          resolve(buf);
          return;

        case 'tab':
          stdin.removeListener('keypress', onKeypress);
          cleanup();
          stdout.write('\n');
          resolve('__TAB__');
          return;

        case 'backspace':
          if (pos > 0) {
            buf = buf.slice(0, pos - 1) + buf.slice(pos);
            pos--;
            display();
          }
          return;

        case 'delete':
          if (pos < buf.length) {
            buf = buf.slice(0, pos) + buf.slice(pos + 1);
            display();
          }
          return;

        case 'left':
          if (pos > 0) { pos--; display(); }
          return;

        case 'right':
          if (pos < buf.length) { pos++; display(); }
          return;

        case 'home':
          pos = 0;
          display();
          return;

        case 'end':
          pos = buf.length;
          display();
          return;

        case 'u':
          if (key.ctrl) {
            buf = '';
            pos = 0;
            display();
            return;
          }
          break;

        case 'c':
          if (key.ctrl) {
            stdin.removeListener('keypress', onKeypress);
            cleanup();
            stdout.write('\n');
            resolve(null);
            return;
          }
          break;

        case 'd':
          if (key.ctrl) {
            stdin.removeListener('keypress', onKeypress);
            cleanup();
            stdout.write('\n');
            resolve('');
            return;
          }
          break;
      }

      if (ch && ch.length === 1 && ch.charCodeAt(0) >= 32) {
        buf = buf.slice(0, pos) + ch + buf.slice(pos);
        pos++;
        display();
      }
    }

    stdin.on('keypress', onKeypress);
  });
}

// ── Process Response (Agent Loop) ─────────────────────────────────────────

async function processAssistantResponse(client, session) {
  for (let turn = 0; turn < AGENT_MAX_TURNS; turn++) {
    const messages = session.getMessages();
    const { fullText, toolCalls } = await streamWithPanel(client, messages, true);

    // Save assistant message
    const assistantMsg = { role: 'assistant', content: fullText || null };
    if (toolCalls.length > 0) {
      assistantMsg.tool_calls = toolCalls;
    }
    session.appendMessage(assistantMsg);

    if (toolCalls.length === 0) {
      // Pure text response — done
      return;
    }

    // Execute each tool call
    for (const tc of toolCalls) {
      const funcName = tc.function.name;
      let args = {};
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch {
        args = {};
      }

      console.log(chalk.cyan(`  ⚙️  → ${funcName} ${JSON.stringify(args).slice(0, 120)}`));

      const handler = TOOL_DISPATCH[funcName];
      let result;
      if (handler) {
        try {
          result = await handler(args);
        } catch (err) {
          result = `[Tool Error] ${err.message || err}`;
        }
      } else {
        result = `[Unknown tool] ${funcName}`;
      }

      // Clamp result length
      const maxResultLen = 2000;
      if (result.length > maxResultLen) {
        result = result.slice(0, maxResultLen) + `\n… (truncated, ${result.length} chars total)`;
      }

      session.appendMessage({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      });
    }

    if (turn === AGENT_MAX_TURNS - 1) {
      console.log(chalk.yellow(`\n  ⚠ Reached max agent turns (${AGENT_MAX_TURNS}). Ending loop.`));
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  // 1. Validate configuration (runs interactive wizard if needed)
  await config.validate();

  // 2. Init state from env
  config.initFromEnv();

  // 3. Welcome banner
  const header = [
    '',
    chalk.hex('#7B68EE').bold('   █████╗ ██████╗ ██╗  ██╗████████╗'),
    chalk.hex('#7B68EE').bold('  ██╔══██╗██╔══██╗██║ ██╔╝╚══██╔══╝'),
    chalk.hex('#7B68EE').bold('  ███████║██████╔╝█████╔╝    ██║   '),
    chalk.hex('#7B68EE').bold('  ██╔══██║██╔══██╗██╔═██╗    ██║   '),
    chalk.hex('#7B68EE').bold('  ██║  ██║██║  ██║██║  ██╗   ██║   '),
    chalk.hex('#7B68EE').bold('  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   '),
    '',
    chalk.dim('    Doubao · DeepSeek · Claude  —  Terminal AI Agent'),
    '',
  ].join('\n');

  console.log(boxen(header, {
    padding: 1,
    margin: 0,
    borderStyle: 'round',
    borderColor: '#7B68EE',
    align: 'center',
  }));
  console.log(chalk.gray('   Press ') + chalk.cyan.bold('Tab') + chalk.gray(' to switch models  ·  ') + chalk.cyan.bold('/help') + chalk.gray(' for commands'));
  console.log('');

  // 4. Launch REPL
  const session = new ChatSession();
  session.appendMessage({ role: 'system', content: SYSTEM_PROMPT });

  while (true) {
    const currentModelKey = state.currentModelKey;
    const modelDisplay = getCurrentDisplayName();
    const promptColors = {
      doubao: chalk.hex('#7B68EE'),
      deepseek: chalk.hex('#4FC3F7'),
      claude: chalk.hex('#FF9E80'),
    };
    const colorFn = promptColors[currentModelKey] || chalk.white;
    const promptStr = colorFn(`(${modelDisplay}) You ❯ `);

    let userInput = await readLine(promptStr);

    if (userInput === '__TAB__') {
      // Cycle to next model
      const keys = Object.keys(MODEL_REGISTRY);
      const curIdx = keys.indexOf(currentModelKey);
      const nextKey = keys[(curIdx + 1) % keys.length];
      const display = switchModel(nextKey);
      if (display) {
        console.log(chalk.green(`  Switched to ${display}`));
      } else {
        const fallbackKeys = Object.keys(ALIASES).filter(
          (k) => k !== currentModelKey && k !== 'doubao' && k !== 'deepseek' && k !== 'claude'
        );
        // Try next alias
        const altKey = keys[(curIdx + 1) % keys.length];
        const altDisplay = switchModel(altKey);
        if (altDisplay) {
          console.log(chalk.green(`  Switched to ${altDisplay}`));
        }
      }
      continue;
    }

    if (userInput === null) {
      // Ctrl+C
      console.log(chalk.dim('^C'));
      continue;
    }

    if (userInput === '') {
      // Empty line
      continue;
    }

    const trimmed = userInput.trim();

    // ── Built-in commands ──
    if (trimmed.startsWith('/')) {
      const parts = trimmed.slice(1).split(/\s+/);
      const cmd = parts[0].toLowerCase();

      if (cmd === 'exit' || cmd === 'quit' || cmd === 'q') {
        console.log(chalk.dim('\n  Bye.'));
        break;
      }

      if (cmd === 'help' || cmd === 'h') {
        console.log(`
${chalk.bold('Commands')}
  ${chalk.cyan('/model [name]')}   Switch model (doubao/db, deepseek/ds, claude/cl)
  ${chalk.cyan('/clear')}    Clear conversation history
  ${chalk.cyan('/save')}     Save conversation to ~/.arkterm_history.json
  ${chalk.cyan('/help')}     Show this help
  ${chalk.cyan('/exit')}     Exit ArkTerm
  ${chalk.cyan('Tab')}       Cycle through available models
`);
        continue;
      }

      if (cmd === 'model' || cmd === 'switch') {
        const target = parts[1];
        if (!target) {
          console.log(chalk.yellow('  Usage: /model <name>  (doubao/db, deepseek/ds, claude/cl)'));
          continue;
        }
        const display = switchModel(target);
        if (display) {
          console.log(chalk.green(`  Switched to ${display}`));
          console.log(chalk.dim(`  Endpoint: ${state.baseUrl}`));
        } else {
          console.log(chalk.yellow(`  Unknown model: ${target}. Try: doubao, deepseek, claude`));
        }
        continue;
      }

      if (cmd === 'clear') {
        session.clearHistory();
        session.appendMessage({ role: 'system', content: SYSTEM_PROMPT });
        console.log(chalk.green('  Conversation cleared.'));
        continue;
      }

      if (cmd === 'save') {
        const histPath = path.join(os.homedir(), '.arkterm_history.json');
        try {
          const hist = JSON.stringify(session.getMessages(), null, 2);
          fs.writeFileSync(histPath, hist, 'utf-8');
          console.log(chalk.green('  History saved to ~/.arkterm_history.json'));
        } catch (err) {
          console.log(chalk.red(`  Save failed: ${err.message}`));
        }
        continue;
      }

      console.log(chalk.yellow(`  Unknown command: ${cmd}. Type /help for available commands.`));
      continue;
    }

    // ── Process user message ──
    session.addUserMessage(trimmed);

    // Intent-aware routing
    const hasToolIntent = detectIntent(trimmed);

    if (hasToolIntent) {
      // Agent mode: use tools
      await processAssistantResponse(createClient(), session);
    } else {
      // Chat mode: direct streaming (no tools)
      const client = createClient();
      const messages = session.getMessages();
      const { fullText } = await streamWithPanel(client, messages, false);
      session.addAssistantMessage(fullText);
    }
  }

  // Restore stdin
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
}

// ── Entry ─────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error(chalk.red.bold('\n✗ Fatal Error:'), err);
  process.exitCode = 1;
});
