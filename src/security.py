"""Dual-layer security module for the Doubao-TUI AI Agent.

- **Layer 1 — Blacklist**: ``is_safe_command()`` screens shell commands for
  dangerous patterns before they reach the OS.
- **Layer 2 — User authorisation**: ``request_user_permission()`` renders a
  prominent Rich panel and waits for an explicit ``y`` / ``n`` answer.
"""

from __future__ import annotations

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm

console = Console()

# ---------------------------------------------------------------------------
# Blacklist patterns — layer 1
# ---------------------------------------------------------------------------

_DANGEROUS_PATTERNS: list[str] = [
    # Destructive file operations
    "rm ",
    "rmdir ",
    "del ",
    "deltree",
    "format ",
    "mkfs",
    # Raw device writes
    "dd ",
    "> /dev/",
    # Privilege escalation
    "sudo ",
    "su ",
    "chmod 777",
    "chown ",
    # System control
    "shutdown",
    "reboot",
    "halt",
    "poweroff",
    "init 0",
    "init 6",
    # Remote execution pipelines
    "curl ",
    "wget ",
    "| sh",
    "| bash",
    # Fork bomb / resource exhaustion
    ":(){",
    "fork bomb",
    "while true; do",
    # Network dangerous
    "iptables",
    "ufw",
    "nc ",
    "ncat ",
    # Git force-push (dangerous for repos)
    "git push --force",
    "git push -f",
]

_CURL_WGET_SAFE_PREFIXES: tuple[str, ...] = (
    "curl -o ",
    "curl -O ",
    "curl --output",
    "wget -O ",
    "wget --output-document",
)


def is_safe_command(command: str) -> bool:
    """Check *command* against the security blacklist.

    Args:
        command: The raw shell command string to inspect.

    Returns:
        ``True`` if the command passes all safety checks, ``False`` if any
        dangerous pattern is detected.
    """
    lower = command.lower()

    for pattern in _DANGEROUS_PATTERNS:
        if pattern.startswith("curl ") or pattern.startswith("wget "):
            # Allow curl / wget only when an output file is explicitly specified
            if pattern in lower:
                if not lower.startswith(_CURL_WGET_SAFE_PREFIXES):
                    return False
        elif pattern in lower:
            return False

    return True


# ---------------------------------------------------------------------------
# User authorisation prompt — layer 2
# ---------------------------------------------------------------------------

def request_user_permission(tool_name: str, details: str) -> bool:
    """Display a prominent authorisation panel and ask the user to confirm a
    high-risk tool invocation.

    Args:
        tool_name: The name of the tool about to be invoked (e.g.
            ``"execute_command"``).
        details: Human-readable description of the operation (command string,
            file path, etc.).

    Returns:
        ``True`` if the user answered ``y``, ``False`` otherwise.
    """
    panel = Panel.fit(
        f"[bold white]{details}[/bold white]",
        title="[bold yellow]⚠️  AI ACTION REQUIRED[/bold yellow]",
        subtitle=f"[dim]Tool: {tool_name}[/dim]",
        border_style="yellow",
        padding=(1, 2),
    )
    console.print()
    console.print(panel)

    return Confirm.ask(
        "[bold yellow]Allow this action?[/bold yellow]",
        default=False,
        show_default=True,
    )
