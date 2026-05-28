# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ArkTerm is a multi-model terminal AI agent (CLI) built in pure Node.js. It provides an interactive REPL that connects to Doubao (Volcengine Ark), DeepSeek, and Claude models via the OpenAI-compatible SDK. The agent has 5 local tools (view directory, read/write/patch files, execute shell commands) and uses OpenAI function calling for tool orchestration.

## Commands

```bash
# Start (development)
npm start

# Syntax check on all source files
npm test

# Install dependencies
npm install
```

## Architecture

```
bin/index.js          # CLI entry: require('../src/main.js')
src/
  main.js             # REPL loop, streaming display (boxen), agent loop, text fallback parser
  config.js           # Env loading, model registry, interactive setup wizard (inquirer), model switching
  session.js          # ChatSession — in-memory message history array
  security.js         # Command blacklist + user permission prompt (inquirer)
  tools.js            # 5 tool implementations + OpenAI function-calling schemas + dispatch table
  ui.js               # Markdown rendering (marked + highlight.js), diff display (diff), spinner (ora)
```

## Key Design Decisions

- **All models use the OpenAI SDK** (`openai` npm package). Claude is accessed via an OpenAI-compatible proxy, not the Anthropic SDK.
- **Agent mode is always on**: Tools are always included in API calls; the model decides whether to use them (no intent detection gating).
- **OpenAI client is cached**: The client is created once and reused until config changes (model switch). Proxy agents use `keepAlive: true` to avoid TCP+TLS reconnect per request.
- **Streaming display**: `streamWithPanel()` uses boxen for a real-time panel showing the last 200 chars of output + TTFT/Gen/Avg speed metrics. Renders only when content changes, throttled to ~80ms intervals.
- **Raw-mode input**: Custom `readLine()` using `readline.emitKeypressEvents` + raw mode for Tab/Ctrl+C handling and inline editing with CJK-aware cursor positioning (`visualWidth()`).
- **Model switching**: Tab cycles through available models (skips unconfigured ones). Each model entry in `MODEL_REGISTRY` maps to env vars (`*_API_KEY`, `*_MODEL`). Aliases: `db`→doubao, `ds`→deepseek, `cl`→claude.
- **Config persistence**: `~/.arkterm.env` (set by wizard), with `.env` in CWD as override. Both are loaded via dotenv.
- **Tool call fallback**: When a model doesn't support native function calling, `extractTextToolCalls()` parses JSON tool calls embedded in the text response via brace-balancing.
- **Markdown rendering**: Pure text responses are rendered through `marked` with `highlight.js` syntax highlighting for code blocks, converted to terminal-compatible chalk-colored output.
- **patch_file fuzzy matching**: Tolerates trailing whitespace differences by normalizing line endings before matching. Returns diff stats (lines added/removed).

## CI/CD

- `.github/workflows/publish.yml` — auto-publishes to npm on `v*` tag push. Requires `NPM_TOKEN` secret.
- `.env` — template file checked into repo; actual secrets go in `~/.arkterm.env` or a gitignored local `.env`.
