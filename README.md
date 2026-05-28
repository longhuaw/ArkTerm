<p align="right"><a href="README.zh-CN.md"><img src="https://img.shields.io/badge/文档-简体中文-orange?style=flat-square"></a></p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/ArkTerm-7B68EE?style=for-the-badge&logo=robotframework&logoColor=white">
    <img src="https://img.shields.io/badge/ArkTerm-7B68EE?style=for-the-badge&logo=robotframework&logoColor=white" alt="ArkTerm">
  </picture>
</p>

<h1 align="center">ArkTerm</h1>
<h3 align="center">🚀 &nbsp;Multi‑Model Terminal AI Agent</h3>
<p align="center">
  <strong>Doubao</strong> <em>(Volcengine Ark)</em> · <strong>DeepSeek</strong> · <strong>Claude</strong><br>
  <sub>700+ ch/s · Tab‑Cycle Live Switching · Intent‑Aware Routing · Dual‑Layer Security</sub>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/quick_start-🚀-brightgreen"></a>
  <a href="#-installation-matrix"><img src="https://img.shields.io/badge/install-npm%20%7C%20pipx%20%7C%20docker-blue"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green"></a>
  <a href="#"><img src="https://img.shields.io/badge/python-3.10%2B-blue?logo=python"></a>
  <a href="#"><img src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=nodedotjs"></a>
  <a href="README.zh-CN.md"><img src="https://img.shields.io/badge/中文文档-📖-red"></a>
</p>

---

**ArkTerm** is a next-generation terminal AI agent built on **ByteDance Doubao**
(Volcengine Ark platform) as its core neural engine — natively supporting
**Function Calling**, **700+ ch/s** peak throughput, and seamless hot-switching
between frontier models without leaving the prompt line.

Press `Tab` and your brain switches. No `Enter`. No lag. No context loss.

---

## 🔥 Highlights

| Feature | What it means for you |
|---|---|
| 🧠 **Tab‑Cycle (Brain Swap)** | Press `Tab` to toggle between `(Doubao)` ↔ `(DeepSeek)` — zero latency, no `Enter` required. The prompt colour updates instantly in real time. Blind‑switch at full speed. |
| ⚡ **Intent‑Aware Routing** | Casual chat sheds tool overhead — **TTFT < 0.5 s**. The moment you say `read`, `write`, `run`, `ls`, `cmd`, `patch` … the full Agent state machine engages automatically. |
| 🔧 **Autonomous Agent Loop** | `view_structure` → `read_file` → `write_file` / `patch_file` → `execute_command` — the AI plans, executes, and iterates up to 10 turns per request. |
| 📊 **Live Dashboard** | Real-time `ch/s` + `TTFT` displayed inside a Rich **Live Panel** — flicker-free, network‑handshake‑stripped, pure generation throughput. |
| 🛡️ **Dual‑Layer Security Sandbox** | **Layer 1**: hardened command blacklist (`rm` · `dd` · `sudo` · fork bomb …). **Layer 2**: yellow `⚠️ AI ACTION REQUIRED` authorisation panel — every critical action needs your `y/n`. |
| 🌐 **Multi‑Model Gateway** | Doubao (default), DeepSeek, Claude — switch with `/model ds`, `/model cl`, or just hammer `Tab`. |

---

## 🎬 Live Demo

```
╔═══════════════════════════════════════════╗
║                                           ║
║     █████╗ ██████╗ ██╗  ██╗████████╗     ║
║    ██╔══██╗██╔══██╗██║ ██╔╝╚══██╔══╝     ║
║    ███████║██████╔╝█████╔╝    ██║         ║
║    ██╔══██║██╔══██╗██╔═██╗    ██║         ║
║    ██║  ██║██║  ██║██║  ██╗   ██║         ║
║    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝         ║
║      Doubao · DeepSeek · Claude            ║
║           Terminal AI Agent                 ║
╚═══════════════════════════════════════════╝

(Doubao) You ❯ Read the project structure and summarise it
⚙️  → view_structure → found 34 files across 6 directories
📋 → README.md, src/main.py, src/config.py, src/tools.py …

  TTFT 0.42s  Gen 1423 ch/s  Avg 987 ch/s  ⎸ 2841 chars
```

<p align="center"><sub>One prompt. The agent reads, writes, edits, and executes — all inside your terminal.</sub></p>

---

## 📦 Installation Matrix

| Method | Command | Requirements |
|---|---|---|
| **npm** (global) | `npm install -g arkterm` | Node.js ≥ 18, Python 3.10+ |
| **pipx** (recommended) | `pipx install arkterm` | Python 3.10+, pipx |
| **pip** | `pip install arkterm` | Python 3.10+ |
| **Docker** | `docker run -it ghcr.io/longhuawang/arkterm` | Docker |
| **uv** | `uv tool install arkterm` | uv |
| **Source** | `git clone https://github.com/longhuawang/arkterm && cd arkterm && pip install -e .` | Python 3.10+ |

## 🔧 Local Development & Testing

If you want to test the global command locally before pushing to production, run:

```bash
npm install -g .
# or
npm link
```

Then you can invoke the agent from anywhere using:

```bash
arkterm
```

### Quick Start (pipx)

```bash
# 1. Install
pipx install arkterm

# 2. Configure your API keys
cat > ~/.arkterm.env << EOF
ARK_API_KEY=your_volcengine_ark_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here
EOF

# 3. Launch
arkterm
```

> **Note for Windows users**: `prompt_toolkit` handles the terminal I/O.
> Use Windows Terminal or any modern terminal emulator for best results.

---

## ⚙️ Configuration

ArkTerm reads credentials from a `.env` file in the current working directory
(or the `ARKTERM_ENV` environment variable pointing to a custom path).

### Minimal `.env`

```ini
# ── Doubao (Volcengine Ark) ──────────────────────────────────────────
ARK_API_KEY=your_ark_api_key
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3

# ── DeepSeek ─────────────────────────────────────────────────────────
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# ── Claude (optional) ────────────────────────────────────────────────
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Model Aliases

| Alias | Model | When to use |
|---|---|---|
| `db` (default) | **Doubao** (Ark) | Best tool-calling & Chinese comprehension |
| `ds` | **DeepSeek** | Strong reasoning & code generation |
| `cl` | **Claude** | Long-context analysis & safety |

Switch at runtime: `/model ds`, `/model cl`, or just press `Tab` to cycle.

---

## 🧠 Agent Tool Reference

ArkTerm equips the LLM with five core tools it can call autonomously:

| Tool | Description | Security Gate |
|---|---|---|
| `view_structure` | Recursively list directory tree | ❌ None |
| `read_file` | Read a file (UTF-8, auto-OCR for images) | ❌ None |
| `write_file` | Write or overwrite a file | ✅ Layer 2 (y/n) |
| `patch_file` | Apply a unified-diff patch | ✅ Layer 2 (y/n) |
| `execute_command` | Run a shell command | ✅ Layer 1 + Layer 2 |

When the model invokes a tool, you see:
```
⚙️  → view_structure → found 34 files across 6 directories
⚙️  → read_file → 120 lines from src/main.py

⚠️ AI ACTION REQUIRED
  Tool: execute_command
  Details: Run: grep -rn "def " src/
  Proceed? (y/n):
```

---

## 🛡️ Security Architecture

```
                    ┌────────────────────────────┐
                    │   User Request (stdin)      │
                    └────────┬───────────────────┘
                             │
                    ┌────────▼───────────────────┐
                    │   Intent-Aware Router      │
                    │   ┌─ chat? → no tools      │
                    │   └─ action? → agent cycle │
                    └────────┬───────────────────┘
                             │
                    ┌────────▼───────────────────┐
                    │   AI Model (Doubao/DS/Cl)  │
                    └────────┬───────────────────┘
                             │
                    ┌────────▼───────────────────┐
                    │   Tool Dispatcher          │
                    └────────┬───────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │ view_structure│ │ write_file   │ │exec_command  │
     │ (no gate)    │ │ (Layer 2)    │ │Layer 1+2     │
     └──────────────┘ └──────────────┘ └──────────────┘
                                          │
                                   ┌──────▼──────┐
                                   │  Layer 1    │
                                   │  Blacklist  │
                                   │ rm · dd ·   │
                                   │ sudo · fork │
                                   └──────┬──────┘
                                          │ pass
                                   ┌──────▼──────┐
                                   │  Layer 2    │
                                   │  User Auth  │
                                   │  (y/n)      │
                                   └─────────────┘
```

**Layer 1 — Blacklist**: Commands matching dangerous patterns (`rm -rf /`,
`dd if=`, `:(){:|:&};:`, `sudo`, `su -`, `chmod 777 /*`, …) are rejected
before reaching the OS. The list is compiled from the OWASP command-injection
cheat sheet, common fork-bomb vectors, and filesystem-destructive operations.

**Layer 2 — Authorisation Panel**: Every write, patch, or shell execution
renders a prominent Rich `Panel` with tool name and details. The agent blocks
until you type `y` + `Enter` to confirm, or `n` + `Enter` to cancel.

---

## ⌨️ Built-in Commands

| Command | Description |
|---|---|
| `Tab` | Cycle current AI backend: Doubao ↔ DeepSeek |
| `/clear` | Clear conversation history |
| `/model ds` | Switch to DeepSeek (aliases: `ds`, `deepseek`) |
| `/model cl` | Switch to Claude (aliases: `cl`, `claude`) |
| `/model list` | List all configured models |
| `/save <file>` | Save last AI response text to `<file>` |
| `exit` / `quit` | Exit ArkTerm |

---

## 🏗 Project Structure

```
arkterm/
├── .env.example           # Credential template
├── requirements.txt       # Python dependencies
├── setup.py               # pip/pipx entry point (console_scripts → arkterm)
├── package.json           # npm entry point (bin → arkterm)
├── Dockerfile             # Docker OCI image
├── README.md              # This file
├── README.zh-CN.md        # Chinese documentation
├── bin/
│   └── index.js           # Node.js bridge (spawns Python)
└── src/
    ├── __init__.py        # Package init (v0.4.0)
    ├── main.py            # Main loop: Tab‑cycle, streaming, routing
    ├── config.py          # Multi‑model gateway: Doubao/DeepSeek/Claude
    ├── session.py         # Conversation history manager
    ├── tools.py           # Five core tools + schemas + dispatch
    └── security.py        # Dual‑layer sandbox (blacklist + auth panel)
```

---

## 📈 Performance

| Metric | Doubao | DeepSeek | Claude |
|---|---|---|---|
| **Peak throughput** | 700+ ch/s | 600+ ch/s | 400+ ch/s |
| **TTFT (chat, no tools)** | < 0.5 s | < 0.6 s | < 1.0 s |
| **TTFT (with tools)** | < 1.2 s | < 1.5 s | < 2.0 s |
| **Streaming** | ✅ Native SSE | ✅ Native SSE | ✅ Native SSE |
| **Function Calling** | ✅ Native | ✅ (beta) | ✅ Native |

*Measured on a residential fibre connection (200 Mbps, ~30 ms RTT to CN).*

---

## 🤝 Contributing

Contributions are welcome. Please open an issue first to discuss the change
you'd like to make, then submit a pull request.

- **Code style**: Black + isort (line length 88).
- **Type hints**: Python 3.10+ syntax everywhere.
- **Testing**: `pytest` under `tests/`.
- **Commit messages**: Conventional Commits.

---

## 📄 License

MIT © 2026 [Longhua Wang](https://github.com/longhuawang)

---

<p align="center">
  <sub>Built with Doubao · DeepSeek · prompt_toolkit · Rich · OpenAI SDK</sub><br>
  <sub>ArkTerm — Your terminal, augmented.</sub>
</p>
