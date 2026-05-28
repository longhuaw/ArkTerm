// ---------------------------------------------------------------------------
// ArkTerm — ChatSession: message history management
// ---------------------------------------------------------------------------

class ChatSession {
  constructor() {
    /** @type {Array<{role:string, content:string|null, tool_calls?:Array, tool_call_id?:string}>} */
    this._messages = [];
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

  /** Return the full message list (shallow copy). */
  getMessages() {
    return [...this._messages];
  }

  /** Clear all history. */
  clearHistory() {
    this._messages = [];
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
