// ---------------------------------------------------------------------------
// ArkTerm — Security: command blacklist + user permission gate
// ---------------------------------------------------------------------------
const readline = require('readline');
const chalk = require('chalk');

// ── Blacklist patterns (inherited from original Python) ───────────────────
const BLACKLIST_PATTERNS = [
  /^\s*rm\s+-rf\s+(?:\/\s*|\\?\*)/i,
  /^\s*dd\s+/i,
  /^\s*>\s*\/dev\/(?:sda|sdb|sdc|nvme\d+|zero|random)/i,
  /^\s*:\(\)\s*\{.*:\|:&\s*\};?\s*:/,
  /\|\|\s*:\s*\(\)/,
  /^\s*sudo\s+/i,
  /mkfs\./i,
  /fdisk\s+/i,
  /cryptsetup\s+/i,
  /shred\s+/i,
  /chmod\s+-?R?\s*0+77/i,
  /chown\s+-R/i,
];

/**
 * Check whether a command string matches the dangerous blacklist.
 * Returns the matched pattern string on hit, null otherwise.
 */
function isSafeCommand(command) {
  if (!command || typeof command !== 'string') return true;
  const trimmed = command.trim();
  for (const pattern of BLACKLIST_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  return true;
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

module.exports = { isSafeCommand, requestUserPermission };
