"""Configuration center for Doubao-TUI — multi-model gateway.

Uses the standard ``openai`` client and supports dynamic model switching
between Doubao, DeepSeek, and Claude (via OpenAI-compatible proxies).
"""

from __future__ import annotations

import os
import sys
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from rich.console import Console

# ---------------------------------------------------------------------------
# Load .env before anything else
# ---------------------------------------------------------------------------
load_dotenv(override=False)

console = Console(stderr=True)

# Official Volcengine Ark base URL (OpenAI-compatible)
ARK_BASE_URL: str = "https://ark.cn-beijing.volces.com/api/v3"


class Config:
    """Centralized, multi-model configuration for Doubao-TUI.

    Holds credentials for all supported backends and exposes dynamic
    ``CURRENT_*`` properties that change when :meth:`switch_model` is called.

    Supported aliases for :meth:`switch_model`:

    - ``db`` / ``doubao``  → Doubao (Volcengine Ark)
    - ``ds`` / ``deepseek`` → DeepSeek (official API)
    - ``cl`` / ``claude``  → Claude (OpenAI-compatible proxy)
    """

    # ------------------------------------------------------------------
    # Environment-based credentials
    # ------------------------------------------------------------------

    # Doubao (default)
    VOLC_API_KEY: str = os.getenv("VOLC_API_KEY", "")
    DOUBAO_ENDPOINT_ID: str = os.getenv("DOUBAO_ENDPOINT_ID", "")

    # DeepSeek
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # Claude (OpenAI-compatible proxy)
    CLAUDE_API_KEY: str = os.getenv("CLAUDE_API_KEY", "")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-20250514")

    # ------------------------------------------------------------------
    # System prompt
    # ------------------------------------------------------------------
    SYSTEM_PROMPT: str = os.getenv(
        "DOUBAO_SYSTEM_PROMPT",
        (
            "You are a capable AI assistant running in the terminal. "
            "Answer questions concisely and accurately. "
            "When providing code, use proper formatting and keep explanations brief. "
            "You have access to local tools — use them when helpful."
        ),
    )

    # ------------------------------------------------------------------
    # Model registry
    # ------------------------------------------------------------------
    MODEL_REGISTRY: Dict[str, Dict[str, str]] = {
        "doubao": {
            "display": "Doubao",
            "api_key_attr": "VOLC_API_KEY",
            "model_attr": "DOUBAO_ENDPOINT_ID",
            "base_url": ARK_BASE_URL,
        },
        "deepseek": {
            "display": "DeepSeek",
            "api_key_attr": "DEEPSEEK_API_KEY",
            "model_attr": "DEEPSEEK_MODEL",
            "base_url": "https://api.deepseek.com/v1",
        },
        "claude": {
            "display": "Claude",
            "api_key_attr": "CLAUDE_API_KEY",
            "model_attr": "CLAUDE_MODEL",
            "base_url": "https://api.anthropic.com/v1",
        },
    }

    ALIASES: Dict[str, str] = {
        "db": "doubao",
        "doubao": "doubao",
        "ds": "deepseek",
        "deepseek": "deepseek",
        "cl": "claude",
        "claude": "claude",
    }

    # ------------------------------------------------------------------
    # Dynamic current-model state
    # ------------------------------------------------------------------
    CURRENT_MODEL: str = ""
    CURRENT_BASE_URL: str = ""
    CURRENT_API_KEY: str = ""
    _CURRENT_MODEL_KEY: str = "doubao"

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------
    @classmethod
    def validate(cls) -> None:
        """Check that the *default* model (Doubao) credentials are present.

        Raises:
            SystemExit: when ``VOLC_API_KEY`` or ``DOUBAO_ENDPOINT_ID`` is
                missing or empty.
        """
        missing: list[str] = []
        if not cls.VOLC_API_KEY.strip():
            missing.append("VOLC_API_KEY")
        if not cls.DOUBAO_ENDPOINT_ID.strip():
            missing.append("DOUBAO_ENDPOINT_ID")

        if missing:
            console.print(
                "\n[bold red]╭──────────────────────────────────────────────╮[/bold red]"
            )
            console.print(
                "[bold red]│[/bold red]  [bold]Configuration Error[/bold]                           [bold red]│[/bold red]"
            )
            console.print(
                "[bold red]│[/bold red]                                              [bold red]│[/bold red]"
            )
            for var in missing:
                console.print(
                    f"[bold red]│[/bold red]  Missing: [yellow]{var}[/yellow]"
                    + " " * (38 - len(var))
                    + "[bold red]│[/bold red]"
                )
            console.print(
                "[bold red]│[/bold red]                                              [bold red]│[/bold red]"
            )
            console.print(
                "[bold red]│[/bold red]  [dim]→ Get your credentials at:[/dim]               [bold red]│[/bold red]"
            )
            console.print(
                "[bold red]│[/bold red]    [underline cyan]https://console.volcengine.com/ark[/underline cyan]    [bold red]│[/bold red]"
            )
            console.print(
                "[bold red]│[/bold red]  [dim]→ Edit the .env file in the project root[/dim]   [bold red]│[/bold red]"
            )
            console.print(
                "[bold red]╰──────────────────────────────────────────────╯[/bold red]\n"
            )
            sys.exit(1)

    # ------------------------------------------------------------------
    # Model switching
    # ------------------------------------------------------------------
    @classmethod
    def switch_model(cls, model_name: str) -> Optional[str]:
        """Switch the active model backend by alias name.

        Args:
            model_name: A model key or alias, e.g. ``"db"``, ``"doubao"``,
                ``"ds"``, ``"deepseek"``, ``"cl"``, ``"claude"``.

        Returns:
            The human-readable display name of the new model if the switch
            succeeded, or ``None`` if the alias is unknown or the required
            API key is not configured.
        """
        key = cls.ALIASES.get(model_name.lower().strip())
        if key is None:
            console.print(
                f"[yellow]Unknown model alias '{model_name}'. "
                f"Try: db / ds / cl[/yellow]"
            )
            return None

        entry = cls.MODEL_REGISTRY.get(key)
        if entry is None:
            return None

        api_key: str = getattr(cls, entry["api_key_attr"], "")
        if not api_key.strip():
            console.print(
                f"[yellow]No API key configured for {entry['display']}. "
                f"Set {entry['api_key_attr']} in .env[/yellow]"
            )
            return None

        cls.CURRENT_MODEL = getattr(cls, entry["model_attr"], "")
        cls.CURRENT_BASE_URL = entry["base_url"]
        cls.CURRENT_API_KEY = api_key
        cls._CURRENT_MODEL_KEY = key
        return entry["display"]

    @classmethod
    def get_current_model_display_name(cls) -> str:
        """Return the human-readable display name of the active model."""
        entry = cls.MODEL_REGISTRY.get(cls._CURRENT_MODEL_KEY, {})
        return entry.get("display", "Unknown")

    @classmethod
    def list_available_models(cls) -> str:
        """Return a formatted string summarising all configured models."""
        lines: list[str] = []
        for key, entry in cls.MODEL_REGISTRY.items():
            api_key = getattr(cls, entry["api_key_attr"], "")
            status = "[green]✓[/green]" if api_key.strip() else "[dim]✗[/dim]"
            active = (
                " [bold cyan]← active[/bold cyan]"
                if key == cls._CURRENT_MODEL_KEY
                else ""
            )
            aliases = [
                a for a, k in cls.ALIASES.items() if k == key and a != key
            ]
            alias_str = f" ({', '.join(aliases)})" if aliases else ""
            lines.append(
                f"  {status} {entry['display']}{alias_str}{active}"
            )
        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Initialise defaults (Doubao on startup)
# ---------------------------------------------------------------------------
Config.CURRENT_MODEL = Config.DOUBAO_ENDPOINT_ID
Config.CURRENT_BASE_URL = ARK_BASE_URL
Config.CURRENT_API_KEY = Config.VOLC_API_KEY


# ---------------------------------------------------------------------------
# Client factory
# ---------------------------------------------------------------------------

def get_openai_client() -> "OpenAI":
    """Create and return an OpenAI-compatible client for the *current* model.

    Returns:
        An initialised :class:`openai.OpenAI` client.

    Raises:
        SystemExit: if ``openai`` is not installed.
    """
    try:
        from openai import OpenAI
    except ImportError as exc:
        console.print(
            "[bold red]Error:[/bold red] openai SDK is not installed.\n"
            "Run: [cyan]pip install -r requirements.txt[/cyan]"
        )
        raise SystemExit(1) from exc

    return OpenAI(
        api_key=Config.CURRENT_API_KEY.strip(),
        base_url=Config.CURRENT_BASE_URL,
    )
