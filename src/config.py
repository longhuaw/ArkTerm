"""Configuration center for ArkTerm — multi-model gateway with interactive onboarding.

Uses the standard ``openai`` client and supports dynamic model switching
between Doubao, DeepSeek, and Claude (via OpenAI-compatible proxies).

On first launch without configuration, runs an interactive wizard that
guides the user through setting up credentials and persists them to
``~/.arkterm.env`` — no restart required.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

# ---------------------------------------------------------------------------
# Console (stderr so as not to interfere with TUI rendering on stdout)
# ---------------------------------------------------------------------------
console = Console(stderr=True)

# ---------------------------------------------------------------------------
# Official base URLs
# ---------------------------------------------------------------------------
ARK_BASE_URL: str = "https://ark.cn-beijing.volces.com/api/v3"
DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"

# ---------------------------------------------------------------------------
# Env file paths — dual-track detection
# Priority:  CWD/.env  >  ~/.arkterm.env
# ---------------------------------------------------------------------------
_CWD_ENV: str = os.path.join(os.getcwd(), ".env")
_HOME_ARKTERM_ENV: str = os.path.join(str(Path.home()), ".arkterm.env")


def _load_env_files(*, override: bool = False) -> None:
    """Load ``.env`` files in priority order.

    Priority:
        1. ``CWD/.env`` — project-specific override
        2. ``~/.arkterm.env`` — user-global default

    Later files do **not** override already-set environment variables
    unless *override* is ``True``.
    """
    load_dotenv(dotenv_path=_CWD_ENV, override=override)
    load_dotenv(dotenv_path=_HOME_ARKTERM_ENV, override=override)


# Load env files at import time — before class variable initialisation
_load_env_files()


class Config:
    """Centralized, multi-model configuration for ArkTerm.

    Holds credentials for all supported backends and exposes dynamic
    ``CURRENT_*`` properties that change when :meth:`switch_model` is called.

    Supported aliases for :meth:`switch_model`:

    - ``db`` / ``doubao``   → Doubao (Volcengine Ark)
    - ``ds`` / ``deepseek`` → DeepSeek (official API)
    - ``cl`` / ``claude``   → Claude (OpenAI-compatible proxy)
    """

    # ------------------------------------------------------------------
    # Environment-based credentials
    # ------------------------------------------------------------------

    # Doubao — primary model (via Volcengine Ark)
    # ``ARK_API_KEY`` is canonical; ``VOLC_API_KEY`` kept for backward compat
    ARK_API_KEY: str = os.getenv("ARK_API_KEY", "") or os.getenv("VOLC_API_KEY", "")
    DOUBAO_ENDPOINT_ID: str = os.getenv("DOUBAO_ENDPOINT_ID", "")

    # DeepSeek — secondary model
    DEEPSEEK_API_KEY: str = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_MODEL: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # Claude — via OpenAI-compatible proxy
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
            "api_key_attr": "ARK_API_KEY",
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
    # Validation & interactive onboarding wizard
    # ------------------------------------------------------------------
    @classmethod
    def validate(cls) -> None:
        """Validate configuration; run interactive onboarding if missing.

        Detection order (dual-track):
            1. ``CWD/.env`` — project-specific override
            2. ``~/.arkterm.env`` — user-global default

        If neither file provides ``ARK_API_KEY`` and ``DOUBAO_ENDPOINT_ID``,
        this method launches an interactive wizard that:
        - Prompts the user for credentials (3 steps)
        - Writes ``~/.arkterm.env`` in standard ENV format
        - Loads the new variables into the running process
        - Returns seamlessly — **no restart needed**.
        """
        # Fast-path: already configured (also catches VOLC_API_KEY fallback)
        if cls.ARK_API_KEY.strip() and cls.DOUBAO_ENDPOINT_ID.strip():
            return

        # ── Interactive onboarding wizard ──────────────────────────────
        console.print()

        welcome_panel = Panel(
            Text.from_markup(
                "欢迎使用 [bold cyan]ArkTerm (方舟终端)[/bold cyan]！\n\n"
                "检测到您是第一次使用，让我们花 10 秒钟\n"
                "完成核心大模型凭证的配置 ...",
                justify="center",
            ),
            title="[bold yellow]🚀 首次配置向导[/bold yellow]",
            border_style="yellow",
            padding=(1, 2),
        )
        console.print(welcome_panel)
        console.print()

        # ── Step 1: ARK_API_KEY ────────────────────────────────────────
        def _input_with_cancel(prompt_text: str) -> str:
            """Wrap ``input()`` to handle Ctrl+C gracefully."""
            try:
                return input(prompt_text).strip()
            except (KeyboardInterrupt, EOFError):
                console.print("\n[yellow]配置已取消。[/yellow]")
                sys.exit(0)

        ark_key = _input_with_cancel(
            " ❶ 请输入您的火山引擎方舟 API Key (ARK_API_KEY): "
        )
        while not ark_key:
            console.print("  [yellow]ARK_API_KEY 不能为空，请重新输入[/yellow]")
            ark_key = _input_with_cancel(
                " ❶ 请输入您的火山引擎方舟 API Key (ARK_API_KEY): "
            )

        # ── Step 2: DOUBAO_ENDPOINT_ID ────────────────────────────────
        endpoint = _input_with_cancel(
            " ❷ 请输入您的方舟推理接入点 ID (DOUBAO_ENDPOINT_ID): "
        )
        while not endpoint:
            console.print("  [yellow]DOUBAO_ENDPOINT_ID 不能为空，请重新输入[/yellow]")
            endpoint = _input_with_cancel(
                " ❷ 请输入您的方舟推理接入点 ID (DOUBAO_ENDPOINT_ID): "
            )

        # ── Step 3: DEEPSEEK_API_KEY (optional) ───────────────────────
        ds_key = _input_with_cancel(
            " ❸ (可选) 请输入您的 DeepSeek API Key (直接回车跳过): "
        )

        # ── Write ~/.arkterm.env ──────────────────────────────────────
        env_path = Path.home() / ".arkterm.env"
        lines: list[str] = [
            f"ARK_API_KEY={ark_key}",
            "ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3",
            f"DOUBAO_ENDPOINT_ID={endpoint}",
        ]
        if ds_key:
            lines.append(f"DEEPSEEK_API_KEY={ds_key}")
            lines.append("DEEPSEEK_BASE_URL=https://api.deepseek.com")

        env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

        # ── Success message ────────────────────────────────────────────
        console.print()
        console.print(
            "[green]✔ 配置已成功保存至 ~/.arkterm.env！正在为您启动方舟终端 ...[/green]"
        )
        console.print()

        # ── Load new env into process ──────────────────────────────────
        os.environ["ARK_API_KEY"] = ark_key
        os.environ["DOUBAO_ENDPOINT_ID"] = endpoint
        if ds_key:
            os.environ["DEEPSEEK_API_KEY"] = ds_key

        # Re-initialise class variables from the fresh input
        cls.ARK_API_KEY = ark_key
        cls.DOUBAO_ENDPOINT_ID = endpoint
        if ds_key:
            cls.DEEPSEEK_API_KEY = ds_key
        cls.CURRENT_MODEL = cls.DOUBAO_ENDPOINT_ID
        cls.CURRENT_BASE_URL = ARK_BASE_URL
        cls.CURRENT_API_KEY = cls.ARK_API_KEY

        # ── Final safety check ─────────────────────────────────────────
        if not cls.ARK_API_KEY.strip() or not cls.DOUBAO_ENDPOINT_ID.strip():
            console.print(
                "[bold red]配置似乎未正确保存，请检查 ~/.arkterm.env 后重试。[/bold red]"
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
Config.CURRENT_API_KEY = Config.ARK_API_KEY


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
