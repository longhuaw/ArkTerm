#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

const pythonProcess = spawn('python', ['-m', 'src.main'], {
    cwd: projectRoot, // 强行将 Python 的工作目录锁死在安装包根目录下
    stdio: 'inherit',
    env: {
        ...process.env,
        PYTHONPATH: projectRoot
    }
});

pythonProcess.on('error', (err) => {
    console.error(`\n[ArkTerm Error] Failed to start Python process:`, err.message);
    process.exit(1);
});

pythonProcess.on('exit', (code) => {
    process.exit(code || 0);
});
