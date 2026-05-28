<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/ArkTerm-7B68EE?style=for-the-badge&logo=robotframework&logoColor=white">
    <img src="https://img.shields.io/badge/ArkTerm-7B68EE?style=for-the-badge&logo=robotframework&logoColor=white" alt="ArkTerm">
  </picture>
</p>

<h1 align="center">ArkTerm</h1>
<h3 align="center">🚀 &nbsp;多模型终端 AI 智能体</h3>
<p align="center">
  <strong>豆包大模型</strong> <em>（火山引擎方舟平台）</em> · <strong>DeepSeek</strong> · <strong>Claude</strong><br>
  <sub>700+ tok/s · 一键切换 · 智能意图分流 · 双层安全防线</sub>
</p>

<p align="center">
  <a href="#-快速开始"><img src="https://img.shields.io/badge/快速开始-🚀-brightgreen"></a>
  <a href="#-安装方式"><img src="https://img.shields.io/badge/安装-npm%20%7C%20pipx%20%7C%20docker-blue"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green"></a>
  <a href="#"><img src="https://img.shields.io/badge/python-3.10%2B-blue?logo=python"></a>
  <a href="#"><img src="https://img.shields.io/badge/node-%3E%3D18-339933?logo=nodedotjs"></a>
</p>

---

## 🌟 什么是 ArkTerm？

**ArkTerm** 是新一代终端 AI 智能体。它以 **字节跳动豆包大模型**（火山引擎方舟平台）为核心引擎，原生支持 **Function Calling**，峰值吞吐 **700+ tok/s**，并支持在主流模型之间零延迟热切换——无需离开输入行。

按一下 `Tab`，大脑在线切换。无需回车、无需等待、上下文不丢失。

---

## 🔥 核心亮点

| 特性 | 你的体验 |
|---|---|
| 🧠 **Tab-Cycle（一键切脑）** | 按下 `Tab` 在 `(Doubao)` ↔ `(DeepSeek)` 之间秒切——零延迟、免回车。提示符颜色实时无闪烁刷新，盲操无压力。 |
| ⚡ **Intent-Aware Routing（智能分流）** | 日常闲聊自动剥离工具载荷，**TTFT < 0.5 s**；一旦检测到动手意图（读/写/改/运行/ls/patch等），全功能 Agent 状态机自动激活。 |
| 🔧 **自主 Agent 循环** | `view_structure` → `read_file` → `write_file` / `patch_file` → `execute_command` —— AI 自主规划、执行、迭代，每次请求最多 10 轮。 |
| 📊 **实时速度仪表盘** | 剔除网络握手排队（TTFT）时间，在 Rich **Live Panel** 中精准实时显示瞬时打字速率与 Token 吞吐。 |
| 🛡️ **双层安全沙箱** | **第一层**：高危命令黑名单硬核拦截（rm · dd · sudo · fork 炸弹…）。**第二层**：黄色 `⚠️ AI ACTION REQUIRED` 授权面板——每个危险操作都需要你确认 `y/n`。 |
| 🌐 **多模型网关** | 默认豆包，随时切换到 DeepSeek、Claude——输入 `/model ds`、`/model cl`，或者直接按 `Tab`。 |

---

## 🎬 快速预览

```
╔═══════════════════════════════════════════╗
║                                           ║
║     █████╗ ██████╗ ██╗  ██╗████████╗     ║
║    ██╔══██╗██╔══██╗██║ ██╔╝╚══██╔══╝     ║
║    ███████║██████╔╝█████╔╝    ██║         ║
║    ██╔══██║██╔══██╗██╔═██╗    ██║         ║
║    ██║  ██║██║  ██║██║  ██╗   ██║         ║
║    ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝         ║
║      字节跳动豆包 · 方舟平台 · 终端 AI    ║
╚═══════════════════════════════════════════╝

(Doubao) You ❯ 看下项目结构，总结一下
⚙️  → view_structure → 发现 6 个目录、34 个文件
📋 → README.md, src/main.py, src/config.py, src/tools.py …
```

<p align="center"><sub>一条提示。Agent 自动读取、分析、总结——全在终端内完成。</sub></p>

---

## 📦 安装方式

| 方式 | 命令 | 依赖 |
|---|---|---|
| **npm**（全局安装） | `npm install -g doubagent` | Node.js ≥ 18，Python 3.10+ |
| **pipx**（推荐） | `pipx run doubagent` | Python 3.10+，pipx |
| **pip** | `pip install doubagent` | Python 3.10+ |
| **Docker** | `docker run -it 汪龙华/ArkTerm` | Docker |
| **uv** | `uv tool install doubagent` | uv |

### npm 快速开始

```bash
npm install -g doubagent
# 先配置 .env，然后：
doubagent
```

### pipx 快速开始

```bash
pipx run doubagent
```

### Docker

```bash
docker run -it --rm \
  -v "$PWD/.env:/.env" \
  汪龙华/ArkTerm
```

> **第一次使用？** 复制 `.env.example` 为 `.env`，填入你的 **豆包** 凭证（从[火山引擎方舟控制台](https://console.volcengine.com/ark)获取），然后就可以开始了。

---

## ⌨️ 快捷键与命令

| 输入 | 操作 |
|---|---|
| `Tab` | **一键切换 Doubao ↔ DeepSeek**——无需回车，提示符实时更新 |
| `/model db` | 切换到 **豆包**（火山引擎方舟） |
| `/model ds` | 切换到 **DeepSeek** |
| `/model cl` | 切换到 **Claude** |
| `/model list` | 查看所有已配置模型及其状态 |
| `/clear` | 清空对话历史（保留系统提示词） |
| `/save <文件路径>` | 将上一条 AI 回复保存到文件 |
| `exit` / `quit` | 退出 |
| `Ctrl+C` | 中断流式输出 / 退出 |

---

## 🔐 环境变量配置（`.env`）

```ini
# ── Doubao / 豆包（火山引擎方舟）— 必需，默认后端 ──────────────
VOLC_API_KEY=ark-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DOUBAO_ENDPOINT_ID=ep-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# ── DeepSeek — 可选，Tab 切换目标 ──────────────────────────────
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_MODEL=deepseek-chat

# ── Claude — 可选，通过兼容 OpenAI 的代理接入 ───────────────────
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLAUDE_MODEL=claude-sonnet-4-20250514
```

> ⚠️ **绝对不要提交 `.env` 文件**——它已在 `.gitignore` 中排除。请使用 `.env.example` 作为模板。

### 获取凭证

| 服务 | 控制台 | 是否必需 |
|---|---|---|
| 豆包（方舟平台） | [console.volcengine.com/ark](https://console.volcengine.com/ark) | ✅ 是 |
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com) | 可选 |
| Claude | [console.anthropic.com](https://console.anthropic.com) | 可选 |

---

## 🧰 内置工具

Agent 通过 **豆包原生 Function Calling** 驱动以下五个工具：

| 工具 | 风险等级 | 说明 |
|---|---|---|
| `view_structure` | 🟢 低 | 递归目录树（自动排除 `.git`、`node_modules`、`__pycache__` 等） |
| `read_file` | 🟢 低 | 读取任意 UTF‑8 文本文件，容错解码 |
| `write_file` | 🟡 **高** | 创建 / 覆写文件——自动创建父目录；**需用户授权** |
| `patch_file` | 🟡 **高** | 精确字符串替换（首次匹配）；**需用户授权** |
| `execute_command` | 🔴 **危险** | 执行 Shell 命令（30 秒超时）；**黑名单 + 用户授权** |

所有高风险工具在执行前都会经过 **双层安全沙箱** 的严格审查。

---

## 🏗️ 架构设计

### 请求流程

```
用户输入 ──→ 意图路由器 ──┬─ 纯聊天（无工具关键词）
                           │     ↓
                           │  流式响应（TTFT < 0.5 s）
                           │     ↓
                           │  实时仪表盘（tok/s · TTFT）
                           │
                           └─ 动手操作（检测到工具关键词）
                                 ↓
                          Agent 循环（最多 10 轮）
                                 ↓
                          ┌─ view_structure ─┐
                          │   read_file      │
                          │   write_file*    │ ← 双层安全防线
                          │   patch_file*    │ ←  ① 黑名单拦截
                          │   execute_cmd**  │ ←  ② y/n 授权面板
                          └──────────────────┘
                                 ↓
                          结果 → 会话历史 → 下一轮迭代
```

### 源码结构

```
ArkTerm/
├── bin/
│   └── index.js          # Node.js 桥接（用于 npm 全局安装）
├── src/
│   ├── __init__.py       # 包初始化 & 版本号 (0.4.0)
│   ├── config.py         # 多模型网关 · 263 行
│   ├── main.py           # 终端 UI · 一键切换 · 实时渲染 · 551 行
│   ├── tools.py          # 工具实现 + JSON Schema · 313 行
│   ├── session.py        # 对话上下文管理器
│   └── security.py       # 黑名单 + 用户授权面板
├── requirements.txt      # openai · rich · python-dotenv · prompt_toolkit
├── setup.py              # Python 包定义
├── package.json          # npm 包定义
├── Dockerfile            # 轻量 Docker 镜像（python:3.10-slim）
└── README.md             # 英文说明文档
```

---

## 🧪 环境要求

- **Python** ≥ 3.10
- **Node.js** ≥ 18（仅在使用 npm 安装时需要）
- **操作系统**：macOS · Linux · Windows —— 全平台支持

---

## 🤝 参与贡献

欢迎提交 Pull Request。重大改动请先提 Issue 讨论。

- Fork 本仓库
- 创建功能分支（`git checkout -b feat/amazing`）
- 提交改动（`git commit -m 'feat: 添加新功能'`）
- 推送（`git push origin feat/amazing`）
- 发起 Pull Request

---

## 🧠 设计理念

1. **豆包优先** —— 字节跳动豆包（火山引擎方舟）是默认引擎也是经过最充分测试的路径。DeepSeek 和 Claude 通过 Tab 键成为一等公民。
2. **零摩擦切换** —— 模型切换应该比眨眼还快。`Tab` 是刻在肌肉记忆里的通用快捷键。
3. **智能开销** —— 纯聊天时不加载工具载荷，检测到动手意图时全量启动。不浪费算力，不浪费你的时间。
4. **安全即默认** —— 每条命令在证明清白之前都有罪。黑名单 + 人工确认 = 高枕无忧。
5. **性能可见** —— 速度指标不是调试工具，而是 UI 的一部分。你应该能 *感受到* 模型有多快。

---

## 📄 开源协议

MIT © 2026 **汪龙华 (Longhua Wang)**

---

<p align="center">
  <sub>为终端纯粹主义者精工打造。<br>
  豆包 · DeepSeek · Claude —— 一个 <code>Tab</code> 全搞定。</sub>
</p>
