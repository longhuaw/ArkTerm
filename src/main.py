"""Main entry point for Doubao-TUI — Smart-routing AI Agent edition.

Features
--------
- **Tab-cycle model switching**: press ``Tab`` to toggle between Doubao ↔ DeepSeek
  instantly — no Enter needed.  The prompt updates live.
- **Intent-aware routing**: chat requests skip the tool layer for sub-0.5s TTFT;
  action keywords (read/write/run/cmd …) automatically engage the full Agent cycle.
- Live stream rendering, speed metrics, security gates, and polished dividers.
"""

from __future__ import annotations

import json
import os
import sys
import time
from typing import Any, Dict, List, NoReturn, Optional, Tuple

from openai import APIError
from prompt_toolkit import PromptSession
from prompt_toolkit.key_binding import KeyBindings
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.rule import Rule

from src.config import Config, get_openai_client
from src.security import is_safe_command, request_user_permission
from src.session import ChatSession
from src.tools import TOOL_DISPATCH, TOOL_SCHEMAS

# ---------------------------------------------------------------------------
# Console
# ---------------------------------------------------------------------------
console = Console()

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_MAX_AGENT_TURNS: int = 10

# ---------------------------------------------------------------------------
# Intent routing — keywords that trigger the tool-calling Agent cycle
# ---------------------------------------------------------------------------
_TOOL_TRIGGERS: frozenset[str] = frozenset({
    # Chinese
    "看", "读", "写", "改", "运行", "执行", "创建", "删除",
    "文件", "目录", "命令", "终端", "代码", "保存", "修改", "查看",
    # English
    "read", "write", "run", "cmd", "ls", "dir", "view", "edit",
    "open", "create", "delete", "mkdir", "file", "exec", "patch",
    "save", "cat", "grep", "find", "ps", "kill", "mv", "cp", "rm",
    "shell", "terminal", "code", "bash",
})


def _is_tool_request(text: str) -> bool:
    """Return ``True`` if *text* contains any tool-trigger keyword."""
    lower = text.lower()
    return any(kw in lower for kw in _TOOL_TRIGGERS)


# ---------------------------------------------------------------------------
# Welcome banner & hints
# ---------------------------------------------------------------------------
WELCOME = r"""
[bold cyan]
    ╔═══════════════════════════════════════════╗
    ║                                           ║
    ║   ██████╗  ██████╗ ██╗   ██╗██████╗  █████╗  ██████╗
    ║   ██╔══██╗██╔═══██╗██║   ██║██╔══██╗██╔══██╗██╔═══██╗
    ║   ██║  ██║██║   ██║██║   ██║██████╔╝███████║██║   ██║
    ║   ██║  ██║██║   ██║██║   ██║██╔══██╗██╔══██║██║   ██║
    ║   ██████╔╝╚██████╔╝╚██████╔╝██████╔╝██║  ██║╚██████╔╝
    ║   ╚═════╝  ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝
    ║                                           ║
    ║      ByteDance Doubao LLM · Terminal AI Agent
    ║                                           ║
    ╚═══════════════════════════════════════════╝
[/bold cyan]
"""

USAGE_HINT = (
    "[dim]Type your request — the agent auto-detects tool needs.\n"
    "  [cyan]Tab[/cyan]             Cycle between Doubao ↔ DeepSeek\n"
    "  [cyan]/clear[/cyan]          Clear conversation history\n"
    "  [cyan]/model <name>[/cyan]   Switch AI backend ([cyan]db[/cyan] / [cyan]ds[/cyan] / [cyan]cl[/cyan])\n"
    "  [cyan]/save <file>[/cyan]    Save last AI text response to a file\n"
    "  [cyan]exit[/cyan] / [cyan]quit[/cyan]     Quit the application[/dim]"
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _save_to_file(content: str, filename: str) -> None:
    """Write *content* to *filename*, creating parent directories as needed."""
    try:
        dirname = os.path.dirname(filename)
        if dirname:
            os.makedirs(dirname, exist_ok=True)
        with open(filename, "w", encoding="utf-8") as fh:
            fh.write(content)
        console.print(f"[green]✓ Successfully saved to {filename}[/green]")
    except OSError as exc:
        console.print(f"[bold red]Failed to save:[/bold red] {exc}")


# ---------------------------------------------------------------------------
# prompt_toolkit bindings — Tab-cycle model switch
# ---------------------------------------------------------------------------

# Mutable container so the key-binding callback can signal the main loop.
_switch_request: List[Optional[str]] = [None]

_bindings = KeyBindings()


@_bindings.add("tab", eager=True)
def _tab_cycle_model(event: object) -> None:
    """Tab → cycle between Doubao and DeepSeek, exit prompt immediately."""
    current = Config._CURRENT_MODEL_KEY  # noqa: SLF001
    if current == "doubao":
        _switch_request[0] = "deepseek"
    else:
        _switch_request[0] = "doubao"
    event.app.exit(result="")


def _pt_prompt_text() -> List[Tuple[str, str]]:
    """返回原生支持 prompt_toolkit 的强类型样式提示符，彻底解决 Windows 乱麻."""
    display = Config.get_current_model_display_name()
    return [
        ("class:cyan bold", f"({display}) You ❯ "),
    ]


def _do_switch_model(target: str) -> str | None:
    """Switch model, rebuild client, clear history, and print a status line.

    Returns the display name on success, or ``None`` on failure.
    """
    display = Config.switch_model(target)
    if display is None:
        return None
    console.print(
        f"[bold]🔄 Switched to [bold magenta]{display}[/bold magenta][/bold]"
    )
    return display


# ===================================================================
# Streaming + tool-call parser
# ===================================================================

def _stream_and_parse(
    client: "OpenAI", session: ChatSession, *, with_tools: bool = True
) -> Tuple[str, List[Dict[str, str]]]:
    """Stream a chat-completion request; return text + parsed tool calls.

    Args:
        client: An initialised :class:`openai.OpenAI` client.
        session: The current :class:`ChatSession`.
        with_tools: If ``False``, the ``tools`` parameter is omitted from the
            API call, reducing overhead for pure-chat turns.

    Returns:
        ``(full_text, tool_calls)`` tuple.
    """
    messages = session.get_messages()
    display = Config.get_current_model_display_name()
    title = f"[bold green]{display}[/bold green]"

    start_time: float = time.time()
    first_token_time: Optional[float] = None
    last_usage: Optional[object] = None

    # ---- Build request kwargs ------------------------------------------------
    kwargs: Dict[str, Any] = {
        "model": Config.CURRENT_MODEL.strip(),
        "messages": messages,
        "stream": True,
    }
    if with_tools:
        kwargs["tools"] = TOOL_SCHEMAS

    # ---- Initiate streaming API call -----------------------------------------
    try:
        stream = client.chat.completions.create(**kwargs)
    except APIError as exc:
        console.print(f"\n[bold red]API error:[/bold red] {exc}")
        return "", []
    except Exception as exc:
        console.print(f"\n[bold red]Unexpected error:[/bold red] {exc}")
        return "", []

    full_text: str = ""
    tool_calls_acc: Dict[int, Dict[str, str]] = {}

    # ── Live rendering block ─────────────────────────────────────────────────
    with Live(
        Panel("", title=title, border_style="green",
              subtitle="[dim]Waiting for response…[/dim]"),
        console=console,
        refresh_per_second=8,
        transient=False,
    ) as live:

        try:
            for chunk in stream:
                if not chunk.choices or len(chunk.choices) == 0:
                    continue
                delta = chunk.choices[0].delta

                # ---- text content --------------------------------------------
                if delta and delta.content:
                    if first_token_time is None:
                        first_token_time = time.time()
                    full_text += delta.content

                    now = time.time()
                    ttft = first_token_time - start_time
                    elapsed = max(now - first_token_time, 0.001)
                    est_tokens = max(len(full_text) / 4.0, 0.25)
                    speed = est_tokens / elapsed
                    
                    subtitle = (
                        f"[dim]Speed: {speed:.1f} tok/s  |  "
                        f"TTFT: {ttft:.2f}s[/dim]"
                    )
                    live.update(
                        Panel(full_text, title=title,
                              border_style="green", subtitle=subtitle)
                    )

                # ---- tool-call deltas ----------------------------------------
                if delta and delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx: int = tc.index
                        if idx not in tool_calls_acc:
                            tool_calls_acc[idx] = {
                                "id": "", "name": "", "arguments": "",
                            }
                        if tc.id:
                            tool_calls_acc[idx]["id"] = tc.id
                        if tc.function:
                            if tc.function.name:
                                tool_calls_acc[idx]["name"] += tc.function.name
                            if tc.function.arguments:
                                tool_calls_acc[idx]["arguments"] += tc.function.arguments

                    names = [
                        v["name"]
                        for v in tool_calls_acc.values()
                        if v["name"]
                    ]
                    if names and not full_text:
                        live.update(
                            Panel("[dim]🔧 Preparing tool call…[/dim]",
                                  title=title, border_style="green",
                                  subtitle=f"[dim]Tools: {', '.join(names)}[/dim]")
                        )

                # ---- usage ---------------------------------------------------
                if chunk.usage:
                    last_usage = chunk.usage

        except KeyboardInterrupt:
            live.update(
                Panel(full_text + "\n\n[dim italic](Interrupted)[/dim italic]",
                      title=title, border_style="green")
            )
            console.print()
            return full_text, []
        except APIError as exc:
            live.update(
                Panel(full_text + f"\n\n[bold red](Stream error: {exc})[/bold red]",
                      title=title, border_style="red")
            )
            console.print()
            return full_text, []

    # ---- Post-stream summary ------------------------------------------------
    total_time = time.time() - start_time
    if first_token_time is not None and full_text:
        ttft = first_token_time - start_time
        pure_generation_time = max(time.time() - first_token_time, 0.001)
        if last_usage and getattr(last_usage, "completion_tokens", 0) > 0:
            comp = last_usage.completion_tokens
            avg_speed = comp / pure_generation_time
            console.print(
                f"[dim]── Speed: {avg_speed:.1f} tok/s  |  "
                f"TTFT: {ttft:.2f}s  |  "
                f"{comp} tokens  |  "
                f"{total_time:.1f}s total[/dim]"
            )
        else:
            comp_est = len(full_text) / 4.0
            avg_speed = comp_est / pure_generation_time
            console.print(
                f"[dim]── Speed: {avg_speed:.1f} tok/s  |  "
                f"TTFT: {ttft:.2f}s  |  "
                f"{len(full_text)} chars  |  "
                f"{total_time:.1f}s elapsed[/dim]"
            )

    # ---- Assemble final tool-call list ---------------------------------------
    parsed: List[Dict[str, str]] = []
    for idx in sorted(tool_calls_acc.keys()):
        tc = tool_calls_acc[idx]
        if tc["id"] and tc["name"]:
            parsed.append(
                {"id": tc["id"], "name": tc["name"], "arguments": tc["arguments"]}
            )

    return full_text, parsed


# ===================================================================
# Single tool execution (with security gates)
# ===================================================================

def _execute_agent_tool(name: str, raw_args: str) -> str:
    """Execute one tool call and return the result string.

    Applies dual-layer security: blacklist + user permission for commands,
    user permission for file writes.
    """
    try:
        args: Dict[str, Any] = json.loads(raw_args) if raw_args else {}
    except json.JSONDecodeError:
        return f"Error: invalid JSON arguments — {raw_args!r}"

    func = TOOL_DISPATCH.get(name)
    if func is None:
        return f"Error: unknown tool '{name}'"

    if name == "execute_command":
        cmd: str = args.get("command", "")
        if not is_safe_command(cmd):
            return "❌ Command blocked by security blacklist."
        if not request_user_permission(name, f"Execute: [cyan]{cmd}[/cyan]"):
            return "⛔ User denied this action."

    elif name in ("write_file", "patch_file"):
        detail = f"{name}: [cyan]{args.get('path', '?')}[/cyan]"
        if not request_user_permission(name, detail):
            return "⛔ User denied this action."

    try:
        if args:
            return func(**args)
        return func()
    except TypeError as exc:
        return f"Error: bad arguments for '{name}' — {exc}"
    except Exception as exc:
        return f"Error executing '{name}': {exc}"


# ===================================================================
# Agentic loop
# ===================================================================

def agentic_loop(
    client: "OpenAI",
    session: ChatSession,
    user_input: str,
) -> None:
    """Run the autonomous agent cycle for a single user request."""
    session.add_user_message(user_input)

    for _turn in range(_MAX_AGENT_TURNS):
        full_text, tool_calls = _stream_and_parse(client, session)

        if not tool_calls:
            if full_text:
                session.add_assistant_message(full_text)
            return

        assistant_msg: Dict[str, Any] = {
            "role": "assistant",
            "content": full_text or None,
            "tool_calls": [
                {
                    "id": tc["id"],
                    "type": "function",
                    "function": {
                        "name": tc["name"],
                        "arguments": tc["arguments"],
                    },
                }
                for tc in tool_calls
            ],
        }
        session.append_message(assistant_msg)

        names = [tc["name"] for tc in tool_calls]
        console.print(
            f"[bold yellow]⚙️  Agent 正在本地运行: {', '.join(names)}...[/bold yellow]"
        )

        for tc in tool_calls:
            result = _execute_agent_tool(tc["name"], tc["arguments"])
            session.append_message(
                {"role": "tool", "tool_call_id": tc["id"], "content": result}
            )

    console.print(
        "[yellow]⚠️  Agent turn limit reached. "
        "The model may be stuck in a tool-call loop.[/yellow]"
    )


# ===================================================================
# Main interactive loop
# ===================================================================

def main() -> NoReturn:
    """Run the Doubao-TUI smart-routing AI Agent."""
    Config.validate()

    try:
        client = get_openai_client()
    except SystemExit:
        raise
    except Exception as exc:
        console.print(
            f"[bold red]Failed to initialise OpenAI client:[/bold red] {exc}"
        )
        sys.exit(1)

    session = ChatSession()
    pt_session = PromptSession(key_bindings=_bindings)

    # ---- Welcome -------------------------------------------------------------
    console.print(WELCOME)
    console.print(USAGE_HINT)
    console.print()

    # ---- Interactive loop ----------------------------------------------------
    while True:
        # --- prompt_toolkit input ---------------------------------------------
        try:
            user_input: str = pt_session.prompt(
                _pt_prompt_text, mouse_support=False
            ).strip()
        except KeyboardInterrupt:
            console.print("\n[dim]Goodbye![/dim]")
            sys.exit(0)
        except EOFError:
            console.print("\n[dim]Goodbye![/dim]")
            sys.exit(0)

        # --- Handle Tab-cycled model switch -----------------------------------
        if _switch_request[0] is not None:
            target = _switch_request[0]
            _switch_request[0] = None
            display = _do_switch_model(target)
            if display is not None:
                client = get_openai_client()
                session.clear_history()
                console.print(
                    "[dim]Conversation history cleared (model changed).[/dim]"
                )
            console.print()
            continue

        if not user_input:
            continue

        lower = user_input.lower()

        # ---- exit / quit -----------------------------------------------------
        if lower in ("exit", "quit"):
            console.print("[dim]Goodbye![/dim]")
            sys.exit(0)

        # ---- /clear ----------------------------------------------------------
        if lower == "/clear":
            session.clear_history()
            console.print("[dim]Conversation history cleared.[/dim]\n")
            continue

        # ---- /model <name> ---------------------------------------------------
        if lower.startswith("/model"):
            parts = user_input.split(maxsplit=1)
            if len(parts) < 2 or not parts[1].strip():
                console.print(
                    "[yellow]Usage: /model <name>  (db / ds / cl)[/yellow]"
                )
                console.print(Config.list_available_models())
                console.print()
                continue
            alias = parts[1].strip()
            if alias.lower() == "list":
                console.print(Config.list_available_models())
                console.print()
                continue
            display = _do_switch_model(alias)
            if display is not None:
                client = get_openai_client()
                session.clear_history()
                console.print(
                    "[dim]Conversation history cleared (model changed).[/dim]"
                )
            console.print()
            continue

        # ---- /save <filename> ------------------------------------------------
        if lower.startswith("/save"):
            parts = user_input.split(maxsplit=1)
            if len(parts) < 2 or not parts[1].strip():
                console.print(
                    "[yellow]Usage: /save <filename>[/yellow]\n"
                    "  Example: [cyan]/save output.py[/cyan]"
                )
                continue
            filename = parts[1].strip()
            last_reply = session.get_last_assistant_message()
            if not last_reply:
                console.print(
                    "[yellow]No AI text response to save yet. "
                    "Send a message first.[/yellow]"
                )
                continue
            _save_to_file(last_reply, filename)
            console.print()
            continue

        # ---- Normal turn — smart routing -------------------------------------
        if _is_tool_request(user_input):
            agentic_loop(client, session, user_input)
        else:
            session.add_user_message(user_input)
            full_text, _ = _stream_and_parse(
                client, session, with_tools=False
            )
            if full_text:
                session.add_assistant_message(full_text)

        console.print(Rule(style="dim"))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    main()
