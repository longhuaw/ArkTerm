// ---------------------------------------------------------------------------
// ArkTerm — Security: command blacklist + risk classification + user permission gate
// ---------------------------------------------------------------------------
const readline = require('readline');
const chalk = require('chalk');

// ── High‑risk patterns — IMMEDIATE refusal, no user prompt shown ──────────
const HIGH_RISK_PATTERNS = [
  // Destructive filesystem operations
  /(?:^|\s)rm\s+-rf\s+(?:\/|\/*$|\*)/i,
  /(?:^|\s)del\s+\/[sfq]\s/i,
  /(?:^|\s)deltree\b/i,
  /(?:^|\s)rd\s+\/[sq]\s/i,
  // Disk / format
  /(?:^|\s)format\s+/i,
  /(?:^|\s)mkfs\./i,
  /(?:^|\s)fdisk\s+/i,
  /(?:^|\s)diskpart\b/i,
  /(?:^|\s)dd\s+if=/i,
  /(?:^|\s)shred\s+/i,
  // Registry destruction
  /(?:^|\s)reg\s+delete\s/i,
  /(?:^|\s)reg\s+add\s/i,
  // Fork bomb / process DoS
  /:\(\)\s*\{.*:\|:&\s*\};\s*:/,
  /\|\|\s*:\s*\(\)/,
  /%0\|%0/,
  // System‑level privilege escalation
  /(?:^|\s)sudo\s+rm\b/i,
  /(?:^|\s)chmod\s+-?R?\s*0*777/i,
  /(?:^|\s)chown\s+-R\s/i,
  /(?:^|\s)cacls\s+/i,
  /(?:^|\s)icacls\s+\/grant/i,
  // Boot / system file tampering
  /(?:^|\s)bcdedit\s+\/delete/i,
  /(?:^|\s)bcdedit\s+\/set\s+.*\{/i,
  // Raw device access
  /(?:^|\s)>\s*\/dev\/(?:sda|sdb|sdc|nvme\d+|zero|random)/i,
  // Crypto / ransomware-like
  /cryptsetup\s+/i,
  /gpg\s+--decrypt/i,
  // Privilege escalation
  /(?:^|\s)runas\s+\/user:/i,
  /(?:^|\s)psexec\b/i,
];

// ── Moderate‑risk patterns — block but allow override (not used yet) ──────
const MODERATE_PATTERNS = [
  /(?:^|\s)rm\s+-[rf]/i,        // rm with flags (not recursive on root)
  /(?:^|\s)del\s+\/[fp]/i,      // del /f or /p
  /(?:^|\s)taskkill\s/i,
  /(?:^|\s)wmic\s+process\s+delete/i,
  /(?:^|\s)net\s+stop\s/i,
  /(?:^|\s)sc\s+stop\s/i,
  /(?:^|\s)shutdown\s/i,
  /(?:^|\s)pip\s+uninstall\s/i,
  /(?:^|\s)npm\s+uninstall\s+-g/i,
];

/**
 * Check if a command is high‑risk (immediate refusal, no prompt).
 */
function isHighRisk(command) {
  if (!command || typeof command !== 'string') return false;
  const trimmed = command.trim();
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

/**
 * Check whether a command string matches the dangerous blacklist.
 * Returns true if safe (no match), false if blocked.
 */
function isSafeCommand(command) {
  if (!command || typeof command !== 'string') return true;
  const trimmed = command.trim();

  // Check high‑risk first
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }

  // Then moderate patterns
  for (const pattern of MODERATE_PATTERNS) {
    if (pattern.test(trimmed)) return false;
  }

  return true;
}

/**
 * Fast single‑key confirmation (y = approve, any other key = deny).
 * Returns true if user pressed 'y', false otherwise.
 */
async function quickConfirm(command) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();

    stdout.write(chalk.yellow(`\n  ⚡ ${command} `) + chalk.dim('[y/N] '));

    function cleanup() {
      stdin.removeListener('data', onData);
      if (stdin.isTTY && wasRaw === false) stdin.setRawMode(false);
    }

    function onData(data) {
      const key = data.toString().toLowerCase();
      cleanup();
      if (key === 'y' || key === '\r' || key === '\n') {
        // \r/\n without explicit 'y' = deny (safer default)
        if (key === 'y') {
          stdout.write(chalk.green('✓\n'));
          resolve(true);
        } else {
          stdout.write(chalk.red('✗\n'));
          resolve(false);
        }
      } else {
        stdout.write(chalk.red('✗\n'));
        resolve(false);
      }
    }

    stdin.on('data', onData);
  });
}

/**
 * Display a yellow "⚠ AI ACTION REQUIRED" banner and prompt user for y/n.
 * Returns true if user approved, false otherwise.
 */
async function requestUserPermission(command) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const border = chalk.yellow('═'.repeat(60));
    const block = `
${border}
${chalk.yellow.bold('  ⚠  AI ACTION REQUIRED')}

  The agent wants to execute:
${chalk.bold('    $ ' + command)}

${chalk.dim('  Review the command above. Type')} ${chalk.green('y')} ${chalk.dim('to approve,')} ${chalk.red('n')} ${chalk.dim('to deny.')}
${border}
`;
    console.log(block);

    rl.question(chalk.yellow('  Approve? (y/n) '), (answer) => {
      rl.close();
      const ok = answer.trim().toLowerCase() === 'y';
      if (ok) {
        console.log(chalk.green('  ✓ Approved'));
      } else {
        console.log(chalk.red('  ✗ Denied'));
      }
      resolve(ok);
    });
  });
}

module.exports = { isSafeCommand, isHighRisk, quickConfirm, requestUserPermission };
