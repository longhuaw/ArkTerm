#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

const pythonProcess = spawn('python', ['-m', 'src.main'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
        ...process.env,
        PYTHONPATH: projectRoot
    }
});

pythonProcess.on('error', (err) => {
    console.error(`\n\u274c [ArkTerm Error] 无法调起 Python 引擎:`, err.message);
    process.exit(1);
});

pythonProcess.on('exit', (code) => { process.exit(code || 0); });
