#!/usr/bin/env node
const { spawn, execSync } = require('child_process');
const path = require('path');

const projectRoot = path.join(__dirname, '..');

let pythonBin = 'python';

//  Windows 终极杀手锏：利用 where python 暴力排除微软商店幽灵别名
if (process.platform === 'win32') {
    try {
        const paths = execSync('where python', { encoding: 'utf8' }).split('\n').map(p => p.trim()).filter(Boolean);
        // 找到第一个路径中不包含 WindowsApps 的真正 Python (比如 D:\\Anaconda3\\python.exe)
        const realPython = paths.find(p => !p.toLowerCase().includes('windowsapps'));
        if (realPython) {
            pythonBin = realPython;
        }
    } catch (e) {
        // 忽略错误，降级回默认
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
    console.error(`\n❌ [ArkTerm Error] 无法调起 Python 核心引擎 (${pythonBin}):`, err.message);
    process.exit(1);
});

pythonProcess.on('exit', (code) => {
    process.exit(code || 0);
});
