<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/ArkTerm-7B68EE?style=for-the-badge&logo=robotframework&logoColor=white">
    <img src="https://img.shields.io/badge/ArkTerm-7B68EE?style=for-the-badge&logo=robotframework&logoColor=white" alt="ArkTerm">
  </picture>
</p>

<h1 align="center">ArkTerm</h1>
<h3 align="center">🚀 &nbsp;Multi‑Model Terminal AI Agent</h3>
<p align="center">
  <strong>Doubao</strong> <em>(Volcengine Ark)</em> · <strong>DeepSeek</strong> · <strong>Claude</strong><br>
  <sub>700+ tok/s · Tab‑Cycle Live Switching · Intent‑Aware Routing · Dual‑Layer Security</sub>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/quick_start-🚀-brightgreen"></a>
  <a href="#-installation-matrix"><img src="https://img.shields.io/badge/install-npm%20%7C%20pipx%20%7C%20docker-blue"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green"></a>
  <a href="#"><img src="https://img.shields.io/badge/python-3.10%2B-blue?logo=python"></a>
  <a href="#"><img src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=nodedotjs"></a>
</p>

---

## 🌟 What is ArkTerm?

**ArkTerm** is a next-generation terminal AI agent built on **ByteDance Doubao** (Volcengine Ark platform) as its core neural engine — natively supporting **Function Calling**, **700+ tok/s** peak throughput, and seamless hot-switching between frontier models without leaving the prompt line.

Press `Tab` and your brain switches. No `Enter`. No lag. No context loss.

---

## 🔥 Highlights

| Feature | What it means for you |
|---|---|
| 🧠 **Tab‑Cycle (Brain Swap)** | Press `Tab` to toggle between `(Doubao)` ↔ `(DeepSeek)` — zero latency, no `Enter` required. The prompt colour updates *instantly* in real time. Blind‑switch at full speed. |
| ⚡ **Intent‑Aware Routing** | Casual chat sheds tool overhead — **TTFT < 0.5 s**. The moment you say `read`, `write`, `run`, `ls`, `cmd`, `patch`… the full Agent state machine engages automatically. |
| 🔧 **Autonomous Agent Loop** | `view_structure` → `read_file` → `write_file` / `patch_file` → `execute_command` — the AI plans, executes, and iterates up to 10 turns per request. |
| 📊 **Live Dashboard** | Real‑time `tok/s` + `TTFT` displayed inside a Rich **Live Panel** — flicker‑free, network‑handshake‑stripped, pure generation throughput. |
| 🛡️ **Dual‑Layer Security Sandbox** | **Layer 1**: hardened command blacklist (rm · dd · sudo · fork bomb …). **Layer 2**: yellow `⚠️ AI ACTION REQUIRED` authorisation panel — every critical action needs your `y/n`. |
| 🌐 **Multi‑Model Gateway** | Doubao (default), DeepSeek, Claude — switch with `/model ds`, `/model cl`, or just hammer `Tab`. |

---

## 🎬 Demo

```
╔═══════════════════════════════════════════╗
║                                           ║
║     █████╗ ██████╗ ██╗  ██╗████████╗     ║
║    ██╔══██╗██╔══██╗██║ ██╔╝╚══██╔══╝     ║
║    ███████║██████╔╝█████╔╝    ██║         ║
║    ██╔══██║██╔══██╗██╔═██╗    ██║         ║
║    ██║  ██║██║  ██║██║  ██╗   ██║         ║
║    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝         ║
║      ByteDance Doubao Ark · Terminal AI    ║
╚═══════════════════════════════════════════╝

(Doubao) You ❯ Read the project structure and summarise it
⚙️  → view_structure → found 34 files across 6 directories
📋 → README.md, src/main.py, src/config.py, src/tools.py …
```

<p align="center"><sub>One prompt. The agent reads, writes, edits, and executes — all inside your terminal.</sub></p>

---

## 📦 Installation Matrix

| Method | Command | Requirements |
|---|---|---|
| **npm** (global) | `npm install -g doubagent` | Node.js ≥ 18, Python 3.10+ |
| **pipx** (recommended) | `pipx run doubagent` | Python 3.10+, pipx |
| **pip** | `pip install doubagent` | Python 3.10+ |
| **Docker** | `docker run -it 汪龙华/ArkTerm` | Docker |
| **uv** | `uv tool install doubagent` | uv |

### Quick Start (npm)

```bash
npm install -g doubagent
# Configure your .env first, then:
doubagent
```

### Quick Start (pipx)

```bash
pipx run doubagent
```

### Docker

```bash
docker run -it --rm \
  -v "$PWD/.env:/.env" \
  汪龙华/ArkTerm
```

> **First time?** Copy `.env.example` to `.env`, fill in your **Doubao** credentials from [Volcengine Ark Console](https://console.volcengine.com/ark), and you're ready.

---

## ⌨️ Keybindings & Commands

| Input | Action |
|---|---|
| `Tab` | **Cycle Doubao ↔ DeepSeek** — no `Enter`, instant prompt update |
| `/model db` | Switch to **Doubao** (Volcengine Ark) |
| `/model ds` | Switch to **DeepSeek** |
| `/model cl` | Switch to **Claude** |
| `/model list` | Show all configured models & their status |
| `/clear` | Clear conversation history (preserves system prompt) |
| `/save <file>` | Save last AI text response to a file |
| `exit` / `quit` | Quit |
| `Ctrl+C` | Interrupt streaming / exit |

---

## 🔐 Environment (`.env`)

```ini
# ── Doubao (Volcengine Ark) — REQUIRED, default backend ─────────────────
VOLC_API_KEY=ark-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DOUBAO_ENDPOINT_ID=ep-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── DeepSeek — OPTIONAL, Tab‑switch target ───────────────────────────────
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_MODEL=deepseek-chat

# ── Claude — OPTIONAL, via OpenAI‑compatible proxy ──────────────────────
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLAUDE_MODEL=claude-sonnet-4-20250514
```

> ⚠️ **Never commit `.env`** — it's already in `.gitignore`. Use `.env.example` as a template.

### Where to get credentials

| Service | Console | Required |
|---|---|---|
| Doubao (Ark) | [console.volcengine.com/ark](https://console.volcengine.com/ark) | ✅ Yes |
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com) | Optional |
| Claude | [console.anthropic.com](https://console.anthropic.com) | Optional |

---

## 🧰 Built‑in Tools

The agent wields five native tools via **Doubao's native Function Calling**:

| Tool | Risk | Description |
|---|---|---|
| `view_structure` | 🟢 Low | Recursive directory tree (excludes `.git`, `node_modules`, `__pycache__` …) |
| `read_file` | 🟢 Low | Read any UTF‑8 text file with error‑tolerant decoding |
| `write_file` | 🟡 **High** | Create / overwrite files — auto‑creates parent dirs; **needs approval** |
| `patch_file` | 🟡 **High** | Surgical in‑place string replacement (first match); **needs approval** |
| `execute_command` | 🔴 **Critical** | Shell command execution (30 s timeout); **blacklist + approval** |

All high‑risk tools pass through the **Dual‑Layer Security Sandbox** before touching your system.

---

## 🏗️ Architecture

### Request Flow

```
User Input ──→ Intent Router ──┬─ Chat (no tool keywords)
                                │     ↓
                                │  Stream response (TTFT < 0.5 s)
                                │     ↓
                                │  Live Dashboard (tok/s · TTFT)
                                │
                                └─ Action (tool keywords detected)
                                      ↓
                              Agentic Loop (max 10 turns)
                                      ↓
                              ┌─ view_structure ─┐
                              │   read_file      │
                              │   write_file*    │ ← Dual‑Layer Security
                              │   patch_file*    │ ←  ① Blacklist
                              │   execute_cmd**  │ ←  ② y/n Authorisation
                              └──────────────────┘
                                      ↓
                              Result → session history → next iteration
```

### Source Layout

```
ArkTerm/
├── bin/
│   └── index.js          # Node.js bridge for npm global install
├── src/
│   ├── __init__.py       # Package init & version (0.4.0)
│   ├── config.py         # Multi‑model gateway · 263 LOC
│   ├── main.py           # Terminal UI · Tab‑cycle · Live rendering · 551 LOC
│   ├── tools.py          # Tool implementations + JSON Schema · 313 LOC
│   ├── session.py        # Conversation context manager
│   └── security.py       # Blacklist + user authorisation panel
├── requirements.txt      # openai · rich · python-dotenv · prompt_toolkit
├── setup.py              # Python package definition
├── package.json           # npm package definition
├── Dockerfile            # Lightweight Docker image (python:3.10-slim)
└── README.md             # You are here
```

---

## 🧪 Requirements

- **Python** ≥ 3.10
- **Node.js** ≥ 18 (only for npm installation path)
- **OS**: macOS · Linux · Windows — fully cross-platform

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you'd like to change.

- Fork the repo
- Create a feature branch (`git checkout -b feat/amazing`)
- Commit your changes (`git commit -m 'feat: add amazing feature'`)
- Push (`git push origin feat/amazing`)
- Open a Pull Request

---

## 🧠 Design Philosophy

1. **Doubao First** — ByteDance Doubao (Volcengine Ark) is the default, the best‑tested, and the fastest path. DeepSeek and Claude are first‑class citizens on the Tab‑cycle.
2. **Zero‑Friction Switching** — Model switching should be as fast as blinking. `Tab` is the universal muscle memory shortcut.
3. **Smart Overhead** — Don't pay for agent tooling when you're just chatting. Detect intent; route accordingly.
4. **Security by Default** — Every command is guilty until proven innocent. Blacklist + human approval = peace of mind.
5. **Visible Performance** — Speed metrics aren't debug tools; they're part of the UI. You should *feel* how fast the model responds.

---

## 📄 License

MIT © 2026 **汪龙华 (Longhua Wang)**

---

<p align="center">
  <sub>Built with precision for terminal purists.<br>
  ByteDance Doubao · DeepSeek · Claude — all under one <code>Tab</code>.</sub>
</p>
