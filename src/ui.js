// ---------------------------------------------------------------------------
// ArkTerm — UI: markdown rendering, diff display, spinner
// ---------------------------------------------------------------------------
const { marked } = require('marked');
const hljs = require('highlight.js');
const { diffLines } = require('diff');
const chalk = require('chalk');
const ora = require('ora');

// ── Configure marked with syntax highlighting ──────────────────────────────

marked.setOptions({
  gfm: true,
  breaks: false,
  headerIds: false,
  mangle: false,
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch { /* fall through */ }
    }
    // Auto-detect
    try {
      return hljs.highlightAuto(code).value;
    } catch {
      return code;
    }
  },
});

// Map hljs token types → chalk colors (works in basic terminals)
const HL_COLORS = {
  keyword: chalk.magenta,
  string: chalk.green,
  number: chalk.yellow,
  comment: chalk.dim.gray,
  'attr-name': chalk.cyan,
  'class-name': chalk.yellow.bold,
  'meta-keyword': chalk.magenta,
  built_in: chalk.cyan,
  function: chalk.blue,
  title: chalk.blue.bold,
  params: chalk.dim,
};

function paintToken(token) {
  if (!token) return '';
  if (typeof token === 'string') return token;
  const color = HL_COLORS[token.type] || ((s) => s);
  if (token.children && token.children.length > 0) {
    return color(token.children.map(paintToken).join(''));
  }
  return color(token.value || '');
}

/**
 * Render a highlight.js HTML result into terminal-colored text.
 * Parses the HTML spans and applies chalk colors by class name.
 */
function renderHighlightedHtml(html) {
  // Fast path: no spans
  if (!html.includes('<span')) return html.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  return html
    .replace(/<span class="hljs-([^"]*)">([^<]*)<\/span>/g, (_, cls, text) => {
      const colorFn = HL_COLORS[cls];
      const decoded = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      return colorFn ? colorFn(decoded) : decoded;
    })
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/**
 * Convert a Markdown string to terminal-formatted text.
 */
function renderMarkdown(md) {
  if (!md || typeof md !== 'string') return '';

  const html = marked.parse(md);
  // Strip block-level tags and convert inline code/strong/em
  let out = html
    // Code blocks — add indentation and border
    .replace(/<pre><code(?: class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g, (_, lang, code) => {
      const langLabel = lang ? chalk.dim(` ${lang} `) : chalk.dim(' code ');
      const decoded = code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      const highlighted = renderHighlightedHtml(
        marked.parse('```' + (lang || '') + '\n' + decoded + '\n```')
      );
      // Extract just the <code> part
      const codeMatch = highlighted.match(/<code[^>]*>([\s\S]*?)<\/code>/);
      const coloredCode = codeMatch ? codeMatch[1] : decoded;
      const lines = coloredCode.split('\n');
      const numbered = lines.map((l, i) => chalk.dim(String(i + 1).padStart(3)) + ' │ ' + l).join('\n');
      return '\n' + chalk.dim('┌' + '─'.repeat(60)) + langLabel + '\n' + numbered + '\n' + chalk.dim('└' + '─'.repeat(60));
    })
    // Inline code
    .replace(/<code>([^<]*)<\/code>/g, (_, c) => chalk.cyan(c.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')))
    // Bold
    .replace(/<strong>([^<]*)<\/strong>/g, (_, t) => chalk.bold(t))
    // Italic
    .replace(/<em>([^<]*)<\/em>/g, (_, t) => chalk.italic(t))
    // Headings
    .replace(/<h([1-6])>([^<]*)<\/h[1-6]>/g, (_, level, t) => {
      const prefix = '#'.repeat(Number(level));
      return '\n' + chalk.bold(prefix + ' ' + t);
    })
    // Lists
    .replace(/<li>([\s\S]*?)<\/li>/g, (_, t) => '  ' + chalk.cyan('•') + ' ' + t.replace(/<[^>]+>/g, ''))
    .replace(/<\/?[uo]l>/g, '')
    // Paragraphs
    .replace(/<p>/g, '').replace(/<\/p>/g, '\n')
    // Horizontal rules
    .replace(/<hr\s*\/?>/g, chalk.dim('─'.repeat(60)))
    // Blockquotes
    .replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, (_, t) => chalk.dim('│ ') + t.replace(/\n/g, '\n' + chalk.dim('│ ')))
    // Links
    .replace(/<a href="([^"]+)">([^<]*)<\/a>/g, (_, url, text) => text + chalk.dim(' (' + url + ')'))
    // Strip remaining html tags
    .replace(/<[^>]+>/g, '')
    // Decode entities
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    // Collapse multiple blank lines
    .replace(/\n{3,}/g, '\n\n');

  return out.trim();
}

/**
 * Generate a unified diff string with terminal coloring.
 */
function renderDiff(filePath, oldContent, newContent) {
  const changes = diffLines(oldContent, newContent);
  if (changes.length === 1 && !changes[0].added && !changes[0].removed) {
    return chalk.dim('  (no changes)');
  }

  const lines = [chalk.bold(`\n  📄 ${filePath}`), ''];
  let added = 0;
  let removed = 0;

  for (const part of changes) {
    const prefix = part.added ? '+' : part.removed ? '-' : ' ';
    const color = part.added ? chalk.green : part.removed ? chalk.red : chalk.dim;

    if (part.added) added += part.count || part.value.split('\n').filter(Boolean).length;
    if (part.removed) removed += part.count || part.value.split('\n').filter(Boolean).length;

    const partLines = part.value.replace(/\n$/, '').split('\n');
    for (const l of partLines) {
      if (l.length > 120) {
        lines.push(color(prefix + l.slice(0, 120) + '…'));
      } else {
        lines.push(color(prefix + l));
      }
    }
  }

  lines.push('');
  lines.push(chalk.dim(`  ${chalk.green('+' + added)} ${chalk.red('-' + removed)}  `));
  return lines.join('\n');
}

/**
 * Create a spinner instance.
 */
function createSpinner(text) {
  return ora({ text, color: 'cyan', spinner: 'dots' });
}

module.exports = {
  renderMarkdown,
  renderDiff,
  createSpinner,
};
