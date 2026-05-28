"""ArkTerm — Multi-Model Terminal AI Agent.

Core architecture:
- **Tab‑Cycle Brain Swap**:  press ``Tab`` to toggle between Doubao ↔ DeepSeek
  instantly — no ``Enter`` needed, prompt colour updates live.
- **Intent‑Aware Routing**:  pure chat skips the tool load (TTFT < 0.5 s);
  action keywords (read/write/run/…) activate the full Agent state machine.
- **Precision Speed Meter**:  network‑handshake time stripped from generation
  throughput, giving you true tok/s.
"""

from __future__ import annotations

import os
import sys

# ── Dynamic path injection:  ensure the project root is on sys.path ─────────
# This block must execute before *any* `from src.xxx` import so the module
# loader can find ``src`` when ``main.py`` is launched from an arbitrary CWD
# (e.g. via npm global symlink, absolute path, or a non-project directory).
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _project_root not in sys.path:
    sys.path.insert(0, _project_root)

# Lock the process CWD to the project root so relative file reads work.
os.chdir(_project_root)
# ─────────────────────────────────────────────────────────────────────────────

import json
import time
from typing import Any, Dict, List, Optional, Tuple

from openai import APIError
from prompt_toolkit import PromptSession
from prompt_toolkit.formatted_text import FormattedText
from prompt_toolkit.key_binding import KeyBindings
from rich.console import Console
from rich.live import Live
from rich.panel import Panel
from rich.rule import Rule
from rich.table import Table

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
    "搜索", "查找", "打开", "移动", "复制", "编译", "安装",
    # English
    "read", "write", "run", "cmd", "ls", "dir", "view", "edit",
    "open", "create", "delete", "mkdir", "file", "exec", "patch",
    "save", "cat", "grep", "find", "ps", "kill", "mv", "cp", "rm",
    "shell", "terminal", "code", "bash", "chmod", "chown",
    "build", "compile", "install", "search", "grep",
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
    ║   █████╗ ██████╗ ██╗  ██╗████████╗       ║
    ║  ██╔══██╗██╔══██╗██║ ██╔╝╚══██╔══╝       ║
    ║  ███████║██████╔╝█████╔╝    ██║           ║
    ║  ██╔══██║██╔══██╗██╔═██╗    ██║           ║
    ║  ██║  ██║██║  ██║██║  ██╗   ██║           ║
    ║  ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝           ║
    ║      Doubao · DeepSeek · Claude            ║
    ║           Terminal AI Agent                 ║
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
# prompt_toolkit bindings — Tab‑cycle model switch
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


def _build_prompt() -> FormattedText:
    """Build a `FormattedText` prompt with the current model's colour.

    Returns a ``FormattedText`` instance that prompt_toolkit renders natively,
    avoiding any ANSI/HTML rendering issues on Windows terminals.
    """
    display = Config.get_current_model_display_name()
    return FormattedText([
        ("#00d4ff bold", f"({display}) You ❯ "),
    ])


# ---------------------------------------------------------------------------
# Speed metrics
# ---------------------------------------------------------------------------

def _compute_speed_metrics(
    start_time: float,
    first_token_time: float,
    total_chars: int,
) -> Tuple[float, float, float]:
    """Return ``(ttft, gen_speed, avg_speed)``.

    - ``ttft``: time to first token (seconds)
    - ``gen_speed``: chars per second *after* TTFT (pure generation speed)
    - ``avg_speed``: total chars / total time (including TTFT)
    """
    now = time.time()
    total_elapsed = now - start_time
    ttft = first_token_time - start_time
    gen_elapsed = now - first_token_time

    gen_speed = (total_chars / gen_elapsed) if gen_elapsed > 0 else 0.0
    avg_speed = (total_chars / total_elapsed) if total_elapsed > 0 else 0.0

    return ttft, gen_speed, avg_speed


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
    total_chars: int = 0
    last_usage: Optional[object] = None

    # ---- Build request kwargs ------------------------------------------------
    kwargs: Dict[str, Any] = {
        "model": Config.CURRENT_MODEL.strip(),
        "messages": messages,
        "stream": True,
        "stream_options": {"include_usage": True},
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

    # ---- Live rendering block ------------------------------------------------
    with Live(
        Panel("", title=title, border_style="green",
              subtitle="[dim]Waiting for response…[/dim]"),
        console=console,
        refresh_per_second=8,
        transient=False,
    ) as live:

        try:
            for chunk in stream:
                delta = chunk.choices[0].delta if chunk.choices else None

                # ── Text content ───────────────────────────────────────────────
                if delta and delta.content:
                    if first_token_time is None:
                        first_token_time = time.time()
                    full_text += delta.content
                    total_chars += len(delta.content)

                # ── Tool calls ──────────────────────────────────────────────────
                if delta and delta.tool_calls:
                    for tc in delta.tool_calls:
                        idx = tc.index
                        if idx not in tool_calls_acc:
                            tool_calls_acc[idx] = {
                                "id": tc.id or "",
                                "type": tc.type or "function",
                                "function_name": "",
                                "arguments": "",
                            }
                        if tc.function:
                            if tc.function.name:
                                tool_calls_acc[idx]["function_name"] += tc.function.name
                            if tc.function.arguments:
                                tool_calls_acc[idx]["arguments"] += tc.function.arguments

                # ── Usage metadata (last chunk with usage info) ────────────────
                if chunk.usage:
                    last_usage = chunk.usage

                # ── Update live panel ──────────────────────────────────────────
                ttft_s, gen_speed, avg_speed = _compute_speed_metrics(
                    start_time,
                    first_token_time or time.time(),
                    total_chars,
                )

                metrics_table = Table.grid(padding=(0, 1))
                metrics_table.add_column(style="dim", justify="right")
                metrics_table.add_column(style="bold")
                metrics_table.add_row("TTFT", f"{ttft_s:.2f}s")
                metrics_table.add_row("Gen", f"{gen_speed:.0f} ch/s")
                metrics_table.add_row("Avg", f"{avg_speed:.0f} ch/s")
                metrics_table.add_row("Chars", str(total_chars))

                display_text = full_text if full_text else "[dim]streaming…[/dim]"
                if total_chars > 200:
                    display_text = full_text[-200:]

                panel_content = f"{display_text}\n\n[bright_black]─── Speed ───[/bright_black]\n"
                live.update(
                    Panel(
                        panel_content,
                        title=title,
                        border_style="green",
                        subtitle=f"[bold cyan]{gen_speed:.0f} ch/s[/bold cyan]"
                                 f"  [dim]| TTFT {ttft_s:.2f}s[/dim]",
                    )
                )

        except Exception as exc:
            console.print(f"\n[bold red]Stream error:[/bold red] {exc}")

    # ---- Build final tool-call list -------------------------------------------
    tool_calls: List[Dict[str, str]] = []
    for idx in sorted(tool_calls_acc.keys()):
        tc = tool_calls_acc[idx]
        if tc["function_name"]:
            tool_calls.append({
                "id": tc["id"],
                "type": tc["type"],
                "function": {
                    "name": tc["function_name"],
                    "arguments": tc["arguments"],
                },
            })

    # ---- Speed summary after streaming ends ----------------------------------
    ttft_s, gen_speed, avg_speed = _compute_speed_metrics(
        start_time,
        first_token_time or start_time,
        total_chars,
    )
    console.print(
        f"  [dim]TTFT[/dim] [cyan]{ttft_s:.2f}s[/cyan]  "
        f"[dim]Gen[/dim] [bold cyan]{gen_speed:.0f} ch/s[/bold cyan]  "
        f"[dim]Avg[/dim] [cyan]{avg_speed:.0f} ch/s[/cyan]  "
        f"[dim]⎸ {total_chars} chars[/dim]"
    )

    return full_text, tool_calls


# ===================================================================
# Tool execution with security gates
# ===================================================================

def _execute_tool_call(tc: Dict[str, str]) -> str:
    """Execute a single tool call, applying security checks where needed.

    Args:
        tc: A dict with ``name``, ``arguments`` (JSON string).

    Returns:
        The tool's result string.
    """
    name = tc.get("function", {}).get("name", "")
    raw_args = tc.get("function", {}).get("arguments", "{}")

    try:
        args = json.loads(raw_args) if raw_args.strip() else {}
    except json.JSONDecodeError:
        return f"Error: invalid JSON arguments — {raw_args!r}"

    # ── High-risk tools: security sandbox ─────────────────────────────────────
    if name == "execute_command":
        cmd = args.get("command", "")
        if not is_safe_command(cmd):
            return (
                f"❌ Blocked by Layer‑1 Blacklist: {cmd!r}\n"
                f"This command matches a dangerous pattern and was rejected."
            )
        if not request_user_permission("execute_command", f"Run: {cmd}"):
            return f"❌ Cancelled by user (Layer‑2 Authorisation)."

    elif name in ("write_file", "patch_file"):
        path = args.get("path", "(unknown)")
        desc = f"Tool: {name} → {path}"
        if not request_user_permission(name, desc):
            return f"❌ Cancelled by user."

    # ── Dispatch ──────────────────────────────────────────────────────────────
    handler = TOOL_DISPATCH.get(name)
    if handler is None:
        return f"Error: unknown tool — {name}"

    try:
        return str(handler(**args))
    except TypeError as exc:
        return f"Error: invalid arguments for {name}: {exc}"
    except Exception as exc:
        return f"Error executing {name}: {exc}"


def _run_agent_cycle(
    client: "OpenAI", session: ChatSession, user_text: str
) -> None:
    """Full Agent loop: stream → tool calls → stream → … up to ``_MAX_AGENT_TURNS``.

    Args:
        client: The active OpenAI client.
        session: The current chat session.
        user_text: The raw user input.
    """
    session.add_user_message(user_text)

    for turn in range(_MAX_AGENT_TURNS):
        console.print(f"\n[dim]── Agent turn {turn + 1} ──[/dim]")

        # ── Determine intent on first turn ────────────────────────────────────
        with_tools = True  # always in agent mode after first turn

        text, tool_calls = _stream_and_parse(
            client, session, with_tools=with_tools
        )

        # ── No tool calls → end loop ─────────────────────────────────────────
        if not tool_calls:
            if text:
                session.add_assistant_message(text)
            return

        # ── Execute tool calls ────────────────────────────────────────────────
        for tc in tool_calls:
            name = tc.get("function", {}).get("name", "")
            console.print(f"  [yellow]⚙️  → {name}[/yellow]")
            result = _execute_tool_call(tc)
            console.print(f"  [dim]{result[:200]}[/dim]")

            # Feed tool result back to the model
            session.append_message({
                "role": "assistant",
                "content": None,
                "tool_calls": [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": {
                            "name": tc["function"]["name"],
                            "arguments": tc["function"]["arguments"],
                        },
                    }
                ],
            } | ({} if "id" not in tc else {}))
            session.append_message({
                "role": "tool",
                "tool_call_id": tc.get("id", ""),
                "content": result,
            })

    console.print(
        f"[yellow]⚠ Reached max turns ({_MAX_AGENT_TURNS}). "
        f"Response may be incomplete.[/yellow]"
    )


# ===================================================================
# Main entry point
# ====================================================================

def main() -> None:
    """ArkTerm main loop.

    Initialises the configuration, displays the welcome banner, and enters
    the interactive read–stream loop with Tab‑cycle brain switching.
    """
    # ---- Validate configuration ----------------------------------------------
    Config.validate()

    # ---- Welcome -------------------------------------------------------------
    console.print(WELCOME)
    console.print(USAGE_HINT)
    console.print(Rule(style="dim"))

    # ---- State ---------------------------------------------------------------
    session = ChatSession()
    client = get_openai_client()
    pt_session: PromptSession = PromptSession(key_bindings=_bindings)

    # ---- Main loop -----------------------------------------------------------
    while True:
        try:
            # Build the styled prompt
            prompt = _build_prompt()

            raw = pt_session.prompt(prompt, key_bindings=_bindings)
        except KeyboardInterrupt:
            console.print("\n[yellow]Interrupted.[/yellow]")
            continue
        except EOFError:
            console.print("\n[yellow]Goodbye.[/yellow]")
            break

        # ── Handle Tab‑switch signal ─────────────────────────────────────────
        if _switch_request[0] is not None:
            target = _switch_request[0]
            _switch_request[0] = None
            display = Config.switch_model(target)
            if display:
                client = get_openai_client()
                # Clear history so context matches the new model
                session.clear_history()
                console.print(
                    f"[bold]🔄 Switched to [bold magenta]{display}[/bold magenta][/bold]"
                )
            continue

        text = raw.strip()
        if not text:
            continue

        # ── Built-in commands ─────────────────────────────────────────────────
        if text == "exit" or text == "quit":
            console.print("[yellow]Goodbye.[/yellow]")
            break

        if text == "/clear":
            session.clear_history()
            console.print("[green]✓ History cleared.[/green]")
            continue

        if text.startswith("/model "):
            parts = text.split(maxsplit=1)
            alias = parts[1] if len(parts) > 1 else ""
            display = Config.switch_model(alias)
            if display:
                client = get_openai_client()
                session.clear_history()
                console.print(
                    f"[bold]🔄 Switched to [bold magenta]{display}[/bold magenta][/bold]"
                )
            continue

        if text == "/model list":
            console.print(Config.list_available_models())
            continue

        if text.startswith("/save "):
            parts = text.split(maxsplit=1)
            if len(parts) < 2:
                console.print("[yellow]Usage: /save <filename>[/yellow]")
                continue
            content = session.get_last_assistant_message()
            if not content:
                console.print(
                    "[yellow]No assistant message to save.[/yellow]"
                )
                continue
            _save_to_file(content, parts[1])
            continue

        if text.startswith("/"):
            console.print(
                f"[yellow]Unknown command: {text}. "
                f"Try /model, /clear, /save, exit[/yellow]"
            )
            continue

        # ── Intent‑aware routing ─────────────────────────────────────────
        if _is_tool_request(text):
            console.print(
                f"  [bold cyan]⚡ Action mode activated[/bold cyan]"
            )
            _run_agent_cycle(client, session, text)
        else:
            # Pure chat — no tool overhead
            session.add_user_message(text)
            text_resp, _tool_calls = _stream_and_parse(
                client, session, with_tools=False
            )
            if text_resp:
                session.add_assistant_message(text_resp)

        console.print(Rule(style="dim"))


if __name__ == "__main__":
    main()
