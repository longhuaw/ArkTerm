#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..');

//  终极雷达：优先抓取真正的 Conda Python，防死 Windows 商店空壳
let pythonBin = 'python';
if (process.env.CONDA_PREFIX) {
    const condaPython = path.join(process.env.CONDA_PREFIX, 'python.exe');
    if (fs.existsSync(condaPython)) {
        pythonBin = condaPython;
    }
}

const pythonProcess = spawn(pythonBin, ['-m', 'src.main'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
        ...process.env,
        PYTHONPATH: projectRoot
    }
});

pythonProcess.on('error', (err) => {
    console.error(`\n❌ [ArkTerm Error] 无法调起 Python (${pythonBin}):`, err.message);
    process.exit(1);
});

pythonProcess.on('exit', (code) => {
    process.exit(code || 0);
});