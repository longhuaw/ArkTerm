<p align="right"><a href="README.md"><img src="https://img.shields.io/badge/Documentation-English-blue?style=flat-square"></a></p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/ArkTerm-7B68EE?style=for-the-badge&logo=robotframework&logoColor=white">
    <img src="https://img.shields.io/badge/ArkTerm-7B68EE?style=for-the-badge&logo=robotframework&logoColor=white" alt="ArkTerm">
  </picture>
</p>

<h1 align="center">ArkTerm · 方舟终端</h1>
<h3 align="center">🚀 &nbsp;下一代多模型终端 AI Agent</h3>
<p align="center">
  <strong>豆包</strong>（火山引擎方舟）. <strong>DeepSeek</strong>. <strong>Claude</strong><br>
  <sub>700+ ch/s 峰值吞吐 · Tab 一键切换 · 意图分流 · 双层安全沙箱</sub>
</p>

<p align="center">
  <a href="#-快速起步"><img src="https://img.shields.io/badge/快速起步-🚀-brightgreen"></a>
  <a href="#-安装矩阵"><img src="https://img.shields.io/badge/安装-npm%20%7C%20pipx%20%7C%20docker-blue"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/许可证-MIT-green"></a>
  <a href="#"><img src="https://img.shields.io/badge/python-3.10%2B-blue?logo=python"></a>
  <a href="README.md"><img src="https://img.shields.io/badge/English-📖-blue"></a>
</p>

---

**ArkTerm（方舟终端）** 是一款基于 **字节跳动豆包大模型**（火山引擎方舟平台）
构建的下一代终端 AI 智能体。原生支持 **函数调用（Function Calling）**、
**700+ ch/s 峰值吞吐**，以及无需退出终端的多模型热切换。

按下 `Tab`，大脑切换。无需回车、无需等待、上下文不丢失。

---

## 🔥 核心亮点

| 特性 | 为你带来的价值 |
|---|---|
| 🧠 **Tab 一键切脑** | 按 `Tab` 键即可在 `(Doubao)` ↔ `(DeepSeek)` 之间瞬时切换，无需敲回车。提示符颜色实时刷新，盲操作无延迟。 |
| ⚡ **意图智能分流** | 日常闲聊自动剥离工具调用——**首字延迟 < 0.5 s**。一旦你说出 "看目录"、"读文件"、"运行命令"，Agent 全状态机自动激活。 |
| 🔧 **自主 Agent 循环** | `view_structure` → `read_file` → `write_file` / `patch_file` → `execute_command`——AI 自主规划、执行、迭代，单次请求最多 10 轮。 |
| 📊 **实时速度仪表盘** | 基于 Rich Live Panel 的实时 `ch/s` + `TTFT` 显示。已剔除网络握手排队时间，精准反映纯生成吞吐。 |
| 🛡️ **双层安全沙箱** | **第一层**：硬核黑名单（`rm` · `dd` · `sudo` · fork 炸弹 …）。**第二层**：黄色 `⚠️ AI ACTION REQUIRED` 授权面板——每个危险操作都需要你 `y/n` 确认。 |
| 🌐 **多模型网关** | 豆包（默认）、DeepSeek、Claude——`/model ds`、`/model cl`，或者直接敲 `Tab` 循环切换。 |

---

## 🎬 实机演示

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

(Doubao) You ❯ 读一下项目结构，总结一下
⚙️  → view_structure → 找到 34 个文件，分布在 6 个目录
📋 → README.md, src/main.py, src/config.py, src/tools.py …

  TTFT 0.42s  Gen 1423 ch/s  Avg 987 ch/s  ⎸ 2841 chars
```

<p align="center"><sub>一句话。Agent 自动读文件、写文件、执行命令——全在终端里。</sub></p>

---

## 📦 安装矩阵

| 方式 | 命令 | 前置要求 |
|---|---|---|
| **npm**（全局） | `npm install -g arkterm` | Node.js ≥ 18, Python 3.10+ |
| **pipx**（推荐） | `pipx install arkterm` | Python 3.10+, pipx |
| **pip** | `pip install arkterm` | Python 3.10+ |
| **Docker** | `docker run -it ghcr.io/longhuawang/arkterm` | Docker |
| **uv** | `uv tool install arkterm` | uv |
| **源码** | `git clone https://github.com/longhuawang/arkterm && cd arkterm && pip install -e .` | Python 3.10+ |

## 🔧 本地开发与测试

在推送至生产环境前，如果你想在本地测试全局命令，请运行：

```bash
npm install -g .
# 或
npm link
```

之后就可以在任何位置使用以下命令启动 Agent：

```bash
arkterm
```

### 快速起步（pipx）

```bash
# 1. 安装
pipx install arkterm

# 2. 配置 API 密钥
cat > ~/.arkterm.env << EOF
ARK_API_KEY=你的火山引擎方舟密钥
DEEPSEEK_API_KEY=你的 DeepSeek 密钥
EOF

# 3. 启动
arkterm
```

> **Windows 用户注意**：`prompt_toolkit` 负责终端 I/O 处理。推荐使用
> Windows Terminal 或任何现代终端模拟器以获得最佳体验。

---

## ⚙️ 配置说明

ArkTerm 从当前工作目录的 `.env` 文件中读取凭证，也可以通过 `ARKTERM_ENV`
环境变量指定自定义路径。

### 最小化 `.env`

```ini
# ── 豆包（火山引擎方舟）──────────────────────────────────────────
ARK_API_KEY=你的_ark_api_key
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3

# ── DeepSeek ─────────────────────────────────────────────────────────
DEEPSEEK_API_KEY=你的_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# ── Claude（可选）────────────────────────────────────────────────
ANTHROPIC_API_KEY=你的_anthropic_api_key
```

### 模型别名

| 别名 | 模型 | 适用场景 |
|---|---|---|
| `db`（默认） | **豆包（方舟）** | 工具调用最强、中文理解最优 |
| `ds` | **DeepSeek** | 强推理、代码生成 |
| `cl` | **Claude** | 长上下文分析、安全审查 |

运行时切换：`/model ds`、`/model cl`，或直接按 `Tab` 循环。

---

## 🧠 内置工具参考

ArkTerm 为 LLM 配备五个核心工具，AI 可自主调用：

| 工具 | 功能描述 | 安全闸门 |
|---|---|---|
| `view_structure` | 递归列出目录树 | ❌ 无 |
| `read_file` | 读取文件（UTF-8，图片自动 OCR） | ❌ 无 |
| `write_file` | 写入或覆盖文件 | ✅ 第二层（y/n） |
| `patch_file` | 应用 unified-diff 补丁 | ✅ 第二层（y/n） |
| `execute_command` | 执行 shell 命令 | ✅ 第一层 + 第二层 |

当模型调用工具时，你会看到：
```
⚙️  → view_structure → 找到 34 个文件，分布在 6 个目录
⚙️  → read_file → 从 src/main.py 读取了 120 行

⚠️ AI ACTION REQUIRED
  Tool: execute_command
  Details: Run: grep -rn "def " src/
  Proceed? (y/n):
```

---

## 🛡️ 安全架构设计

```
                    ┌────────────────────────────┐
                    │   用户输入（stdin）          │
                    └────────┬───────────────────┘
                             │
                    ┌────────▼───────────────────┐
                    │   意图分流路由器             │
                    │   ┌─ 闲聊？→ 无工具          │
                    │   └─ 操作？→ Agent 循环      │
                    └────────┬───────────────────┘
                             │
                    ┌────────▼───────────────────┐
                    │   AI 模型（豆包/DS/Cl）      │
                    └────────┬───────────────────┘
                             │
                    ┌────────▼───────────────────┐
                    │   工具调度器                 │
                    └────────┬───────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │ view_structure│ │ write_file   │ │exec_command  │
     │ （无闸门）    │ │ （第二层）   │ │第一层+第二层  │
     └──────────────┘ └──────────────┘ └──────────────┘
                                          │
                                   ┌──────▼──────┐
                                   │  第一层      │
                                   │  黑名单      │
                                   │ rm · dd ·   │
                                   │ sudo · fork │
                                   └──────┬──────┘
                                          │ 通过
                                   ┌──────▼──────┐
                                   │  第二层      │
                                   │  用户授权    │
                                   │  (y/n)      │
                                   └─────────────┘
```

**第一层 — 黑名单**：匹配危险模式的命令（`rm -rf /`、`dd if=`、`:(){:\|:&};:`、
`sudo`、`su -`、`chmod 777 /*` 等）在到达操作系统之前被拒绝。列表来源于 OWASP
命令注入备忘录、常见 fork 炸弹向量和文件系统破坏性操作。

**第二层 — 授权面板**：每次写文件、打补丁或执行 shell 命令，都会渲染一个显眼的
Rich `Panel`，包含工具名称和详细信息。Agent 会阻塞，直到你输入 `y` + `Enter`
确认，或 `n` + `Enter` 取消。

---

## ⌨️ 内置命令

| 命令 | 功能 |
|---|---|
| `Tab` | 循环切换 AI 后端：豆包 ↔ DeepSeek |
| `/clear` | 清空对话历史 |
| `/model ds` | 切换到 DeepSeek（别名：`ds`、`deepseek`） |
| `/model cl` | 切换到 Claude（别名：`cl`、`claude`） |
| `/model list` | 列出所有已配置的模型 |
| `/save <file>` | 将最后一次 AI 回复保存到 `<file>` |
| `exit` / `quit` | 退出 ArkTerm |

---

## 🏗 项目结构

```
arkterm/
├── .env.example           # 凭证模板
├── requirements.txt       # Python 依赖
├── setup.py               # pip/pipx 入口（console_scripts → arkterm）
├── package.json           # npm 入口（bin → arkterm）
├── Dockerfile             # Docker OCI 镜像
├── README.md              # 英文文档
├── README.zh-CN.md        # 本文档
├── bin/
│   └── index.js           # Node.js 桥接脚本（启动 Python）
└── src/
    ├── __init__.py        # 包初始化（v0.4.0）
    ├── main.py            # 主循环：Tab 切脑、流式输出、意图路由
    ├── config.py          # 多模型网关：豆包 / DeepSeek / Claude
    ├── session.py         # 对话历史管理器
    ├── tools.py           # 五大核心工具 + Schema + 调度
    └── security.py        # 双层安全沙箱（黑名单 + 授权面板）
```

---

## 💡 设计理念

ArkTerm 的设计围绕三个核心哲学：

1. **速度是体验的基石** —— 意图分流让闲聊零开销，Agent 模式只在需要时激活。速度仪表盘剔除网络排队，只显示真实生成吞吐。

2. **Tab 是最高效的 UI** —— 多模型切换不需要设置菜单、不需要鼠标、不需要敲 `/model` 命令，一个 `Tab` 键就够了。

3. **安全不能成为阻碍** —— 双层沙箱在关键路径上设卡但不挡路。日常使用零干扰，涉及危险操作时清晰告知。

---

## 📈 性能参考

| 指标 | 豆包 | DeepSeek | Claude |
|---|---|---|---|
| **峰值吞吐** | 700+ ch/s | 600+ ch/s | 400+ ch/s |
| **TTFT（纯聊天）** | < 0.5 s | < 0.6 s | < 1.0 s |
| **TTFT（带工具）** | < 1.2 s | < 1.5 s | < 2.0 s |
| **流式输出** | ✅ 原生 SSE | ✅ 原生 SSE | ✅ 原生 SSE |
| **函数调用** | ✅ 原生 | ✅（公测） | ✅ 原生 |

*测试条件：家用光纤 200 Mbps，RTT ~30 ms 至国内节点。*

---

## 🤝 参与贡献

欢迎贡献代码。请先提交 Issue 讨论你要做的改动，然后提交 Pull Request。

- **代码风格**：Black + isort（行宽 88）。
- **类型注解**：全部使用 Python 3.10+ 语法。
- **测试**：`pytest` 下 `tests/` 目录。
- **提交信息**：Conventional Commits 规范。

---

## 📄 许可证

MIT © 2026 [汪龙华](https://github.com/longhuawang)

---

<p align="center">
  <sub>基于豆包 · DeepSeek · prompt_toolkit · Rich · OpenAI SDK 构建</sub><br>
  <sub>ArkTerm（方舟终端）—— 你的终端，从此智能。</sub>
</p>
