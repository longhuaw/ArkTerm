"""Multi-turn conversation context management for Doubao-TUI.

Wraps the OpenAI-compatible message list in a lightweight :class:`ChatSession`
that supports history mutation, targeted message retrieval, and tool-call
message structures (``tool_calls`` / ``tool`` roles).
"""

from typing import Any, Dict, List

from src.config import Config


class ChatSession:
    """Manages the conversation message history for a single chat session.

    The session always starts with a system message (from
    :attr:`Config.SYSTEM_PROMPT`) and allows appending user / assistant /
    tool-call messages, clearing non-system history, and extracting the latest
    textual assistant reply.

    Attributes:
        _messages: The internal message list in OpenAI chat format.
    """

    def __init__(self) -> None:
        """Initialise a new session with the default system prompt."""
        self._messages: List[Dict[str, Any]] = [
            {"role": "system", "content": Config.SYSTEM_PROMPT}
        ]

    # ---- Public API -----------------------------------------------------------

    def append_message(self, msg: Dict[str, Any]) -> None:
        """Append an arbitrary message dict to the conversation history.

        Use this for ``tool`` results, or assistant messages that contain
        ``tool_calls`` in addition to (or instead of) ``content``.

        Args:
            msg: A message dict following the OpenAI chat format, e.g.
                ``{"role": "tool", "tool_call_id": "...", "content": "..."}``.
        """
        self._messages.append(msg)

    def add_user_message(self, content: str) -> None:
        """Append a user message to the conversation history.

        Args:
            content: The raw text input from the user.
        """
        self._messages.append({"role": "user", "content": content})

    def add_assistant_message(self, content: str) -> None:
        """Append a plain assistant (model) text response.

        Args:
            content: The full response text returned by the model.
        """
        self._messages.append({"role": "assistant", "content": content})

    def get_messages(self) -> List[Dict[str, Any]]:
        """Return the complete message list, including the system prompt.

        Returns:
            A list of message dicts suitable for the OpenAI chat API.
        """
        return list(self._messages)

    def clear_history(self) -> None:
        """Reset the conversation, keeping only the system prompt."""
        self._messages = [
            msg for msg in self._messages if msg.get("role") == "system"
        ]
        # Safety net: re-inject system prompt if it was somehow removed.
        if not self._messages:
            self._messages = [
                {"role": "system", "content": Config.SYSTEM_PROMPT}
            ]

    def get_last_assistant_message(self) -> str:
        """Return the text content of the most recent *textual* assistant reply.

        Assistant messages that only contain ``tool_calls`` (no ``content``)
        are skipped.

        Returns:
            The latest AI text response, or an empty string if no textual
            assistant message exists in the history.
        """
        for msg in reversed(self._messages):
            if msg.get("role") == "assistant" and msg.get("content"):
                return str(msg["content"])
        return ""
