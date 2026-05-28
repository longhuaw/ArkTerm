#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const projectRoot = path.join(__dirname, '..');

// 1. 自动化双轨制 .env 兼容：如果全局安装包里没 .env，尝试从用户敲命令的当前目录或家目录寻找
const currentCwd = process.cwd();
const homeEnvPath = path.join(os.homedir(), '.arkterm.env');
const localEnvPath = path.join(currentCwd, '.env');

// 如果当前目录有 .env，我们就用当前目录作为工作目录，方便 Python 读取它
let finalCwd = projectRoot;
if (fs.existsSync(localEnvPath)) {
    finalCwd = currentCwd;
}

// 2. 调起后台 Python 进程，暂时移除 inherit 模式，改用 pipe 来强制捕捉早期闪退
const pythonProcess = spawn('python', ['-m', 'src.main'], {
    cwd: finalCwd,
    stdio: ['inherit', 'pipe', 'pipe'], // 捕获 stdout 和 stderr
    env: {
        ...process.env,
        PYTHONPATH: projectRoot
    }
});

let stderrOutput = '';
let stdoutOutput = '';

pythonProcess.stdout.on('data', (data) => {
    stdoutOutput += data.toString();
    process.stdout.write(data); // 实时吐给用户
});

pythonProcess.stderr.on('data', (data) => {
    stderrOutput += data.toString();
    process.stderr.write(data); // 实时吐给用户
});

pythonProcess.on('error', (err) => {
    console.error(`\n❌ [ArkTerm Error] 无法调起 Python 引擎:`, err.message);
    process.exit(1);
});

pythonProcess.on('exit', (code) => {
    //  如果 Python 进程什么都没打印就悄悄闪退了（Exit Code != 0），由 Node.js 强行接管输出并给出保底引导
    if (code !== 0 && !stdoutOutput && !stderrOutput) {
        console.log('\n======================================================');
        console.log('⚠️  [ArkTerm 异常提示] Python 核心引擎在初始化时静默退出了。');
        console.log(` [可能原因]：当前目录下找不到有效的配置凭证。`);
        console.log(`️  [解决办法]：`);
        console.log(`   请在当前目录下创建 [.env] 文件，或者在你的用户主目录下`);
        console.log(`   创建 [~/.arkterm.env] 并配置你的 ARK_API_KEY。`);
        console.log('======================================================\n');
    }
    process.exit(code || 0);
});
