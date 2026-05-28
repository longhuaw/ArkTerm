# ArkTerm

**[English](README.md) | [中文](README.zh-CN.md)**

ArkTerm 是一个极速、轻量、纯原生的 Node.js 终端 AI 助手。支持豆包（火山引擎）、DeepSeek 和 Claude 模型。

## 核心特性

- **纯原生 Node.js**：不再依赖任何 Python 环境，npm 一键安装。
- **跨平台支持**：智能识别系统环境，完美适配 Windows（`dir`/`type`）与 Unix（`ls`/`cat`）。
- **AI Agent 模式**：支持自动执行命令与读写文件，真正做到"代码即工具"。
- **速度监控**：专业级终端 UI，实时显示 TTFT 与生成速度。

## 安装指南

确保已安装 [Node.js (v18+)](https://nodejs.org/)。

```bash
# 全局安装
npm install -g arkterm

# 启动
arkterm
```

## 使用说明

- **配置**：首次运行自动启动向导，配置 API Key。
- **切换模型**：按 Tab 键循环切换模型。
- **退出**：连续按两次 Ctrl+C 即可安全退出。

## 发版记录

- **v1.0.3**：引入防误触双击退出机制，优化 Windows 路径感知与渲染。
- **v1.0.2**：全面重构为纯原生 Node.js 架构，支持全自动 CI/CD 发布。

## 贡献

欢迎提交 Issue 或 Pull Request。
