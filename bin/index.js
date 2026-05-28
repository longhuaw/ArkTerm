#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

// 绝对纯净的调用：没有 -3 参数，只有 `-m src.main`
const pythonProcess = spawn('python', ['-m', 'src.main'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
        ...process.env,
        PYTHONPATH: projectRoot
    }
});

pythonProcess.on('error', (err) => {
    console.error(`\n❌ [ArkTerm Error] 无法调起 Python 核心引擎:`, err.message);
    process.exit(1);
});

pythonProcess.on('exit', (code) => {
    process.exit(code || 0);
});
