// ---------------------------------------------------------------------------
// ArkTerm — Terminal AI Agent Main Loop
// ---------------------------------------------------------------------------
let exitConfirmCount = 0;
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const boxen = require('boxen');
const readline = require('readline');
const { OpenAI } = require('openai');
const { ChatSession } = require('./session');
const { TOOL_SCHEMAS, TOOL_DISPATCH } = require('./tools');
const config = require('./config');
const { renderMarkdown, renderDiff, createSpinner } = require('./ui');
const { MODEL_REGISTRY, state, ALIASES, switchModel, getCurrentDisplayName } = config;

// ── Constants ─────────────────────────────────────────────────────────────
const AGENT_MAX_TURNS = 10;
const SYSTEM_PROMPT = `You are ArkTerm, an autonomous terminal AI agent. **You are running on Windows.** Use \`dir\` for listing files and \`type\` for reading files. Do not ask the user for OS information.

You have access to 5 tools:

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
- For casual questions, just answer directly.
- Shell commands use Windows conventions (backslash paths, \`&&\` for chaining).`;

// ── OpenAI Client Factory (cached, reflects current config state) ─────────

let _cachedClient = null;
let _cachedConfigKey = '';

const { HttpsProxyAgent } = require('https-proxy-agent');

function createClient() {
  const { apiKey, baseURL } = config.getClientConfig();
  const configKey = `${apiKey}::${baseURL}`;

  // Return cached client if config hasn't changed
  if (_cachedClient && _cachedConfigKey === configKey) {
    return _cachedClient;
  }

  const proxy = process.env.HTTPS_PROXY || process.env.http_proxy;

  // Create proxy agent with keepalive enabled
  const agent = proxy
    ? new HttpsProxyAgent(proxy, { keepAlive: true })
    : undefined;

  _cachedClient = new OpenAI({
    apiKey,
    baseURL,
    timeout: 60_000,
    maxRetries: 2,
    httpAgent: agent,
    httpsAgent: agent,
  });
  _cachedConfigKey = configKey;
  return _cachedClient;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Calculate the terminal display width of a string.
 * CJK / fullwidth characters count as 2 columns; ASCII as 1.
 * ANSI escape sequences are stripped before measurement.
 */
function visualWidth(str) {
  // Strip ANSI / VT control sequences first
  const plain = stripVTControlCharacters(str);
  let w = 0;
  for (const ch of plain) {
    const cp = ch.codePointAt(0);
    // Fullwidth forms, CJK, and other wide characters
    if (
      (cp >= 0x1100 && cp <= 0x115F) ||   // Hangul Jamo
      (cp >= 0x2329 && cp <= 0x232A) ||   // Misc technical
      (cp >= 0x2E80 && cp <= 0xA4CF) ||   // CJK Radicals … Yi
      (cp >= 0xA960 && cp <= 0xA97C) ||   // Hangul Jamo Extended-A
      (cp >= 0xAC00 && cp <= 0xD7A3) ||   // Hangul Syllables
      (cp >= 0xF900 && cp <= 0xFAFF) ||   // CJK Compatibility Ideographs
      (cp >= 0xFE10 && cp <= 0xFE19) ||   // Vertical forms
      (cp >= 0xFE30 && cp <= 0xFE6F) ||   // CJK Compatibility Forms
      (cp >= 0xFF00 && cp <= 0xFF60) ||   // Fullwidth Forms
      (cp >= 0xFFE0 && cp <= 0xFFE6) ||   // Fullwidth Signs
      (cp >= 0x1F300 && cp <= 0x1F64F) || // Misc Symbols & Pictographs
      (cp >= 0x1F900 && cp <= 0x1F9FF) || // Supplemental Symbols
      (cp >= 0x20000 && cp <= 0x2FFFD) || // CJK Extension B+
      (cp >= 0x30000 && cp <= 0x3FFFD)    // CJK Extension G+
    ) {
      w += 2;
    } else {
      w += 1;
    }
  }
  return w;
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
    max_tokens: 8192,
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
    const lines = boxStr.split('\n');
    const lineCount = lines.length;
    if (lastBoxLineCount > 0) {
      process.stdout.write(`\x1b[${lastBoxLineCount - 1}A\x1b[J`);
      process.stdout.write(lines.slice(1).join('\n') + '\n');
    } else {
      process.stdout.write(boxStr + '\n');
    }
    lastBoxLineCount = lineCount;
  }

  // Seed placeholder
  renderBox('', 0, 0, 0, 0);
  let lastRender = 0;
  let lastContent = '';
  const RENDER_INTERVAL = 80; // ms between renders

  const updateFn = (now) => {
    const elapsed = (now - startTime) / 1000;
    const ttft = firstTokenTime ? (firstTokenTime - startTime) / 1000 : elapsed;
    const genE = firstTokenTime ? (now - firstTokenTime) / 1000 : 0.001;
    const genS = genE > 0 ? totalChars / genE : 0;
    const avgS = elapsed > 0 ? totalChars / elapsed : 0;
    const displayText = fullText
      ? (totalChars > 200 ? '…' + fullText.slice(-200) : fullText)
      : '';

    // Only render when content changes
    if (displayText === lastContent && lastBoxLineCount > 0) {
      return;
    }
    lastContent = displayText;
    renderBox(displayText, genS, ttft, avgS, totalChars);
  };
  let spinner = null;
  try {
    const stream = await client.chat.completions.create(body);
    // Show spinner only while waiting for first actual data chunk
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

      // Check for truncation
      const reason = chunk.choices?.[0]?.finish_reason;
      if (reason === 'length') {
        fullText += '\n\n[⚠ Response truncated — consider reducing context or increasing max_tokens]';
      }

      const now = Date.now();
      if (now - lastRender > RENDER_INTERVAL) {
        lastRender = now;
        updateFn(now);
      }
    }

    // Final render
    updateFn(Date.now());

    // Enforce final line-feed
    process.stdout.write('\n');

    // Build tool calls list (preserve insertion order from object)
    const toolCalls = Object.values(toolCallsAcc)
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

    require('readline').emitKeypressEvents(stdin);
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();

    let buf = '';
    let pos = 0;

    function display() {
      const left = promptStr + buf.slice(0, pos);
      const right = buf.slice(pos);
      const cursorChar = right.length > 0 ? right[0] : ' ';
      
      readline.cursorTo(stdout, 0);
      readline.clearLine(stdout, 0);
      stdout.write(left + chalk.inverse(cursorChar) + right.slice(1));
      
      // Use visual (column) width for cursor positioning — CJK chars are 2 cols
      const promptCols = visualWidth(promptStr);
      const leftCols = visualWidth(buf.slice(0, pos));
      readline.cursorTo(stdout, promptCols + leftCols);
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
            if (exitConfirmCount === 0) {
              exitConfirmCount = 1;
              stdout.write(chalk.yellow('\n ⚠ 再按一次 Ctrl+C 即可退出 ArkTerm.'));
              setTimeout(() => { exitConfirmCount = 0; }, 5000);
              return;
            } else {
              stdin.removeListener('keypress', onKeypress);
              cleanup();
              stdout.write('\n');
              resolve(null);
              process.exit(0);
            }
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

// ── Text‑based Tool Call Fallback ────────────────────────────────────────

/**
 * When a model doesn't support native OpenAI tool_calls, it may embed
 * JSON tool calls inside the text response. This parser extracts them.
 * Returns { cleanedText, toolCalls }.
 */
function extractTextToolCalls(text) {
  const TOOL_NAMES = ['execute_command', 'read_file', 'write_file', 'patch_file', 'view_structure'];
  const toolCalls = [];
  const toRemove = []; // [startIdx, endIdx] ranges to strip

  for (const toolName of TOOL_NAMES) {
    const namePattern = new RegExp(`"name"\\s*:\\s*"${toolName}"`, 'g');
    let match;
    while ((match = namePattern.exec(text)) !== null) {
      // Find the enclosing { … } by balancing braces
      const startIdx = text.lastIndexOf('{', match.index);
      if (startIdx === -1) continue;

      let depth = 0;
      let endIdx = -1;
      for (let i = startIdx; i < text.length; i++) {
        const ch = text[i];
        if (ch === '{') { depth++; }
        else if (ch === '}') {
          depth--;
          if (depth === 0) { endIdx = i; break; }
        } else if (ch === '"') {
          // Skip string contents
          for (i++; i < text.length && text[i] !== '"'; i++) {
            if (text[i] === '\\') i++; // skip escaped
          }
        }
      }
      if (endIdx === -1) continue;

      const jsonStr = text.slice(startIdx, endIdx + 1);
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.name && typeof parsed.parameters === 'object') {
          toolCalls.push({
            id: 'fallback_' + toolCalls.length,
            type: 'function',
            function: {
              name: parsed.name,
              arguments: JSON.stringify(parsed.parameters),
            },
          });
          toRemove.push([startIdx, endIdx + 1]);
        }
      } catch {
        // Malformed JSON — skip silently
      }
    }
  }

  // Strip extracted JSON blocks from the text (longest-first to avoid index shifts)
  toRemove.sort((a, b) => a[0] - b[0]);
  let cleaned = text;
  for (let i = toRemove.length - 1; i >= 0; i--) {
    const [s, e] = toRemove[i];
    cleaned = cleaned.slice(0, s) + cleaned.slice(e);
  }
  // Collapse whitespace left by removal
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return { cleanedText: cleaned, toolCalls };
}

// ── Process Response (Agent Loop) ─────────────────────────────────────────

async function processAssistantResponse(client, session) {
  for (let turn = 0; turn < AGENT_MAX_TURNS; turn++) {
    const messages = session.getMessages();
    const { fullText, toolCalls } = await streamWithPanel(client, messages, true);

    // ── Fallback: parse text-embedded JSON tool calls ────────────────────
    let effectiveToolCalls = toolCalls;
    let displayText = fullText;
    if (toolCalls.length === 0 && fullText) {
      const fallback = extractTextToolCalls(fullText);
      if (fallback.toolCalls.length > 0) {
        effectiveToolCalls = fallback.toolCalls;
        displayText = fallback.cleanedText || fullText;
        console.log(chalk.yellow(`  ⚡ Fallback parser extracted ${effectiveToolCalls.length} tool call(s) from text.`));
      }
    }

    // Save assistant message (cleaned text when fallback was applied)
    const assistantMsg = { role: 'assistant', content: displayText || null };
    if (effectiveToolCalls.length > 0) {
      assistantMsg.tool_calls = effectiveToolCalls;
    }
    session.appendMessage(assistantMsg);

    if (effectiveToolCalls.length === 0) {
      // Pure text response — render markdown and finish
      if (displayText) {
        console.log(renderMarkdown(displayText));
      }
      return;
    }

    // Execute each tool call
    for (const tc of effectiveToolCalls) {
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
      const maxResultLen = 8000;
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
      // Cycle to next available model
      const keys = Object.keys(MODEL_REGISTRY);
      const curIdx = keys.indexOf(currentModelKey);
      let switched = false;
      for (let i = 1; i <= keys.length; i++) {
        const nextKey = keys[(curIdx + i) % keys.length];
        const display = switchModel(nextKey);
        if (display) {
          console.log(chalk.green(`  Switched to ${display}`));
          switched = true;
          break;
        }
      }
      if (!switched) {
        console.log(chalk.yellow('  No other model configured.'));
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
        const modelList = config.listAvailableModels();
        console.log(`
${chalk.bold('Commands')}
  ${chalk.cyan('/model [name]')}   Switch model (doubao/db, deepseek/ds, claude/cl)
  ${chalk.cyan('/clear')}    Clear conversation history
  ${chalk.cyan('/save')}     Save conversation to ~/.arkterm_history.json
  ${chalk.cyan('/help')}     Show this help
  ${chalk.cyan('/exit')}     Exit ArkTerm
  ${chalk.cyan('Tab')}       Cycle through available models

${chalk.bold('Models')}
${modelList}
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

    // Agent mode: always include tools, let the model decide
    await processAssistantResponse(createClient(), session);
  }

  // Restore stdin
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
}

// ── Entry ─────────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error(chalk.red.bold('\n✗ Fatal Error:'), err);
  process.exitCode = 1;
});
