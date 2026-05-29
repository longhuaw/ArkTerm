// ---------------------------------------------------------------------------
// ArkTerm — ChatSession: message history management with sliding window
// ---------------------------------------------------------------------------

class ChatSession {
  /** @param {number} [maxMessages=15] — threshold before compaction triggers */
  constructor(maxMessages = 15) {
    /** @type {Array<{role:string, content:string|null, tool_calls?:Array, tool_call_id?:string}>} */
    this._messages = [];
    this._maxMessages = maxMessages;
    /** Accumulated context summary string (set after first compaction). */
    this._contextSummary = '';
  }

  /** Append a raw message object. */
  appendMessage(msg) {
    this._messages.push(msg);
  }

  /** Add a user message. */
  addUserMessage(text) {
    this._messages.push({ role: 'user', content: text });
  }

  /** Add an assistant text message. */
  addAssistantMessage(text) {
    this._messages.push({ role: 'assistant', content: text });
  }

  /** Return the FULL message list (shallow copy). */
  getMessages() {
    return [...this._messages];
  }

  /**
   * Return a compacted message list suitable for sending to the API.
   *
   * When total messages ≤ _maxMessages, returns all messages unchanged.
   * Otherwise: system prompt + context summary + last N messages.
   *
   * Keeps the most recent REASONING_WINDOW messages (default 6) intact so
   * the model has full context for the immediate conversation thread.
   */
  getCompactMessages(reasoningWindow = 6) {
    const total = this._messages.length;
    if (total <= this._maxMessages) return [...this._messages];

    // ── Identify system message ──────────────────────────────────────────
    const systemIdx = this._messages.findIndex((m) => m.role === 'system');
    const systemMsg = systemIdx >= 0 ? [this._messages[systemIdx]] : [];

    // ── Extract last N messages (the reasoning window) ───────────────────
    const tailStart = Math.max(systemIdx + 1, total - reasoningWindow);
    const tail = this._messages.slice(tailStart);

    // ── Build context summary from truncated middle ──────────────────────
    const middle = this._messages.slice(systemIdx + 1, tailStart);
    const summary = this._buildSummary(middle);

    // If we already have accumulated summary, prepend it
    const combinedSummary = this._contextSummary
      ? this._contextSummary + '\n' + summary
      : summary;
    this._contextSummary = combinedSummary;

    const summaryMsg = {
      role: 'system',
      content: `[Context Summary: Earlier conversation — ${combinedSummary}]`,
    };

    return [...systemMsg, summaryMsg, ...tail];
  }

  /**
   * Build a compact summary from a slice of messages.
   * Extracts file operations, command executions, and key outcomes.
   */
  _buildSummary(messages) {
    const operations = [];
    const filesSeen = new Set();
    const commandsRun = [];

    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          const name = tc.function.name;
          let args = {};
          try { args = JSON.parse(tc.function.arguments || '{}'); } catch { /* */ }

          switch (name) {
            case 'read_file':
              if (args.path && !filesSeen.has('read:' + args.path)) {
                filesSeen.add('read:' + args.path);
              }
              break;
            case 'write_file':
              if (args.path) {
                filesSeen.add('wrote:' + args.path);
                operations.push(`wrote ${args.path}`);
              }
              break;
            case 'patch_file':
              if (args.path) {
                filesSeen.add('patched:' + args.path);
                operations.push(`patched ${args.path}`);
              }
              break;
            case 'execute_command':
              if (args.command) {
                commandsRun.push(args.command.slice(0, 80));
              }
              break;
            case 'view_structure':
              operations.push('listed directory');
              break;
            case 'git_assistant':
              if (args.action === 'commit_all') {
                operations.push('git commit');
              }
              break;
          }
        }
      }
      // Capture tool results for outcomes
      if (msg.role === 'tool' && msg.content) {
        const content = msg.content;
        if (content.startsWith('✅') || content.includes('written') || content.includes('patched') || content.includes('Committed')) {
          // Success — already captured by the assistant message above
        }
        if (content.startsWith('[Error]') || content.startsWith('[Blocked]')) {
          const brief = content.replace(/\n/g, ' ').slice(0, 60);
          operations.push(`ERROR: ${brief}`);
        }
      }
    }

    const parts = [];
    // Unique operations
    const uniqueOps = [...new Set(operations)].slice(0, 8);
    if (uniqueOps.length > 0) {
      parts.push(`Operations: ${uniqueOps.join('; ')}`);
    }
    // Files accessed
    const wroteFiles = [...filesSeen].filter((f) => f.startsWith('wrote:') || f.startsWith('patched:'));
    if (wroteFiles.length > 0) {
      parts.push(`Files modified: ${wroteFiles.map((f) => f.split(':')[1]).join(', ')}`);
    }
    // Commands executed
    const uniqueCmds = [...new Set(commandsRun)].slice(0, 5);
    if (uniqueCmds.length > 0) {
      parts.push(`Commands: ${uniqueCmds.join(' | ')}`);
    }

    return parts.length > 0 ? parts.join('. ') : `${messages.length} messages of conversation`;
  }

  /** Clear all history and reset summary. */
  clearHistory() {
    this._messages = [];
    this._contextSummary = '';
  }

  /** Return the last assistant message content string, or null. */
  getLastAssistantMessage() {
    for (let i = this._messages.length - 1; i >= 0; i--) {
      const m = this._messages[i];
      if (m.role === 'assistant' && typeof m.content === 'string') {
        return m.content;
      }
    }
    return null;
  }
}

module.exports = { ChatSession };
