#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..');

/**
 * 动态解析当前终端中「真正」的 Python 解释器路径。
 *
 * 优先级（从高到低）：
 *   1. CONDA_PREFIX\python.exe        —— Conda 激活环境下的解释器
 *   2. VIRTUAL_ENV\Scripts\python.exe  —— venv/virtualenv 激活环境
 *   3. CONDA_PYTHON_EXE                —— Conda 自身记录的原始 base python
 *   4. py -3p                          —— Windows Python Launcher（查询实际路径）
 *   5. python (PATH 兜底)              —— 系统默认
 *
 * 前 3 项直接通过环境变量定位绝对路径，彻底避免 PATH 歧义。
 */
function resolvePython() {
  // ── 1. Conda 激活环境 ──
  if (process.env.CONDA_PREFIX) {
    const candidate = path.join(process.env.CONDA_PREFIX, 'python.exe');
    if (fs.existsSync(candidate)) return candidate;
  }

  // ── 2. venv / virtualenv ──
  if (process.env.VIRTUAL_ENV) {
    const candidate = path.join(process.env.VIRTUAL_ENV, 'Scripts', 'python.exe');
    if (fs.existsSync(candidate)) return candidate;
  }

  // ── 3. Conda 记录的 base Python（未激活环境时的精确路径） ──
  if (process.env.CONDA_PYTHON_EXE) {
    const candidate = process.env.CONDA_PYTHON_EXE;
    if (fs.existsSync(candidate)) return candidate;
  }

  // ── 4. Windows Python Launcher 查询 ──
  if (process.platform === 'win32') {
    try {
      const { execSync } = require('child_process');
      const launcherPath = execSync('py -3p', { encoding: 'utf8', timeout: 3000 }).trim();
      if (launcherPath && fs.existsSync(launcherPath)) return launcherPath;
    } catch {
      // py 不可用或查询失败 → 静默降级
    }
  }

  // ── 5. PATH 兜底（原始行为） ──
  return 'python';
}

const pythonBin = resolvePython();

if (pythonBin !== 'python' && !fs.existsSync(pythonBin)) {
  console.error(`\n\u274c [ArkTerm Error] 解析到的 Python 路径不存在: ${pythonBin}`);
  console.error('    \u2192 将降级为 PATH 中的 "python"');
}

const pythonProcess = spawn(pythonBin, ['-m', 'src.main'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    PYTHONPATH: projectRoot,
  },
});

pythonProcess.on('error', (err) => {
  console.error(`\n\u274c [ArkTerm Error] 无法调起 Python 核心引擎: ${err.message}`);
  if (process.platform === 'win32') {
    console.error('    \u2192 请确认已安装 Python 3.10+ 并已激活目标 Conda/venv 环境。');
    console.error('    \u2192 或在当前终端中先执行: conda activate <环境名>');
  }
  process.exit(1);
});

pythonProcess.on('exit', (code) => {
  process.exit(code || 0);
});
