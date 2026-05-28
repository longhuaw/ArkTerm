<p align="center">
  <img src="https://img.shields.io/badge/Doubao-TUI-blue?style=for-the-badge&logo=robotframework&logoColor=white" alt="Doubao-TUI">
</p>

<h1 align="center">Doubao-TUI</h1>
<h3 align="center">🖥️ &nbsp;Multi‑Model Terminal AI Agent</h3>
<p align="center">
  <strong>Doubao</strong> · <strong>DeepSeek</strong> · <strong>Claude</strong><br>
  <sub>Stream · Read · Write · Patch · Execute — all from your terminal</sub>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/quick_start-🚀-brightgreen"></a>
  <a href="#-installation-matrix"><img src="https://img.shields.io/badge/install-pipx%20%7C%20npm%20%7C%20docker-blue"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green"></a>
  <a href="#"><img src="https://img.shields.io/badge/python-3.10%2B-blue?logo=python"></a>
</p>

---

## ✨ Why Doubao-TUI?

| Feature | What it means for you |
|---|---|
| 🧠 **Tab-cycle model switch** | Press `Tab` to toggle between Doubao ↔ DeepSeek — no `Enter` needed. The prompt updates *instantly*. |
| ⚡ **Intent-aware routing** | Casual chat? TTFT < 0.5 s (no tool overhead). Action keywords (`read`, `write`, `run`, `cmd` …) auto-engage the full Agent cycle. |
| 🔧 **Autonomous Agent** | The AI can `view_structure`, `read_file`, `write_file`, `patch_file`, and `execute_command` with dual-layer security. |
| 📊 **Live speed metrics** | Real‑time `tok/s` + `TTFT` displayed inside a Rich Live Panel — flicker‑free. |
| 🛡️ **Dual-layer security** | Blacklist screening + yellow `⚠️ AI ACTION REQUIRED` authorisation prompt. |
| 🌐 **Multi-model gateway** | Doubao, DeepSeek, Claude — switch with `/model ds` or just `Tab`. |

---

## 🎬 Demo

```
╔═══════════════════════════════════════════╗
║   ██████╗  ██████╗ ██╗   ██╗██████╗  █████╗  ██████╗
║   ██╔══██╗██╔═══██╗██║   ██║██╔══██╗██╔══██╗██╔═══██╗
║   ██║  ██║██║   ██║██║   ██║██████╔╝███████║██║   ██║
║   ██║  ██║██║   ██║██║   ██║██╔══██╗██╔══██║██║   ██║
║   ██████╔╝╚██████╔╝╚██████╔╝██████╔╝██║  ██║╚██████╔╝
║   ╚═════╝  ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝
║      ByteDance Doubao LLM · Terminal AI Agent
╚═══════════════════════════════════════════╝

(Doubao) You ❯ Write a Python script to list all files > 1 MB
```

<p align="center"><sub>The AI reads your project, writes the script, and runs it — all in one turn.</sub></p>

---

## 📦 Installation Matrix

Choose your favourite package manager:

| Method | Command | Requirements |
|---|---|---|
| **pipx** (recommended) | `pipx install .` | Python 3.10+, pipx |
| **pip** | `pip install .` | Python 3.10+ |
| **npm** | `npm install -g .` | Node.js ≥ 18, Python 3.10+ |
| **Docker** | `docker build -t doubao-tui .` | Docker |
| **uv** | `uv tool install .` | uv |

### One‑liner (pipx)

```bash
git clone https://github.com/your-org/doubao-tui.git
cd doubao-tui
cp .env .env.example          # then edit .env with your API keys
pipx install .
doubao-tui
```

### Docker

```bash
docker build -t doubao-tui .
docker run -it --rm -v "$PWD/.env:/app/.env" doubao-tui
```

---

## ⌨️ Keybindings & Commands

| Input | Action |
|---|---|
| `Tab` | **Cycle between Doubao ↔ DeepSeek** (no `Enter` required) |
| `/model db` / `/model ds` | Explicitly switch model |
| `/model list` | Show all configured models & status |
| `/clear` | Clear conversation history |
| `/save <file>` | Save last AI text response to a file |
| `exit` / `quit` | Quit |
| `Ctrl+C` | Interrupt streaming / quit |

---

## 🔐 Environment (.env)

```ini
# Doubao (required — default backend)
VOLC_API_KEY=ark-xxxxxxxxxx
DOUBAO_ENDPOINT_ID=ep-xxxxxxxxxx

# DeepSeek (optional)
DEEPSEEK_API_KEY=sk-xxxxxxxxxx
DEEPSEEK_MODEL=deepseek-chat

# Claude via OpenAI-compatible proxy (optional)
CLAUDE_API_KEY=sk-ant-xxxxxxxxxx
CLAUDE_MODEL=claude-sonnet-4-20250514
```

> ⚠️ **Never commit `.env`** — it's already in `.gitignore`.

---

## 🧰 Built-in Tools

The AI Agent has access to six local tools:

| Tool | Risk | Description |
|---|---|---|
| `view_structure` | Low | Show the project directory tree |
| `read_file` | Low | Read a file's contents |
| `write_file` | **High** | Create / overwrite a file (needs approval) |
| `patch_file` | **High** | Surgical string replacement (needs approval) |
| `execute_command` | **Critical** | Run a shell command (blacklist + approval) |

---

## 🏗️ Architecture

```
User Input ─→ Intent Router ──┬─ Chat (no tools) → Stream → Render → Done
                               │
                               └─ Action (tools on) → Agentic Loop ──┐
                                     ↑                                │
                                     └── tool results feed back ──────┘
```

```
src/
├── config.py      Multi-model gateway (263 LOC)
├── session.py     Conversation context manager
├── tools.py       Tool implementations + JSON Schema
├── security.py    Blacklist + user-authorisation panel
└── main.py        Terminal UI, Tab‑cycle, Live rendering (495 LOC)
```

---

## 📄 License

MIT © 2025 **longhuaw**

---

<p align="center">
  <sub>Built with ❤️ for terminal enthusiasts.  Star the repo if you find it useful!</sub>
</p>
