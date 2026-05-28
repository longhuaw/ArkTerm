# ArkTerm

**[English](README.md) | [中文](README.md)**

ArkTerm is a high-speed, lightweight, native Node.js AI terminal assistant. It supports Doubao (Volcengine), DeepSeek, and Claude models.
ArkTerm 是一个极速、轻量、纯原生的 Node.js 终端 AI 助手。它支持火山方舟 (Doubao)、DeepSeek 和 Claude 模型。

## Features / 核心特性

- **Native Node.js**: No Python environment required.
  **纯原生 Node.js**：不再依赖任何 Python 环境，npm 一键安装。
- **Cross-Platform**: Intelligent OS detection (Windows/macOS/Linux).
  **跨平台支持**：智能识别系统环境，完美适配 Windows (dir/type) 与 Unix (ls/cat)。
- **AI Agent Mode**: Automated command execution and file operations.
  **AI Agent 模式**：支持自动执行命令与读写文件，真正做到"代码即工具"。
- **Speed Tracker**: Real-time display of TTFT and generation speed.
  **速度监控**：专业级终端 UI，实时显示 TTFT 与生成速度。

## Installation / 安装指南

Ensure [Node.js (v18+)](https://nodejs.org/) is installed.
确保已安装 [Node.js (v18+)](https://nodejs.org/)。

```bash
# Global installation / 全局安装
npm install -g arkterm

# Start / 启动
arkterm
```

## Usage / 使用说明

- **Setup**: Automatic wizard for API Key configuration.
  **配置**：首次运行自动启动向导，配置 API Key。
- **Models**: Press Tab to switch models.
  **切换模型**：按 Tab 键循环切换模型。
- **Exit**: Press Ctrl+C twice to safely exit.
  **退出**：连续按两次 Ctrl+C 即可退出。

## Release History / 发版记录

- **v1.0.3**: Added double Ctrl+C exit protection and enhanced Windows path perception.
  **v1.0.3**: 引入防误触双击退出机制，优化 Windows 路径感知与渲染。
- **v1.0.2**: Full native Node.js refactor & CI/CD automation.
  **v1.0.2**: 全面重构为纯原生 Node.js 架构，支持全自动 CI/CD 发布。

## Contributing / 贡献

Welcome to submit Issues or Pull Requests.
欢迎提交 Issue 或 Pull Request。
