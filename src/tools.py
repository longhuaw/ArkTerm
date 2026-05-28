"""Local toolbox for the Doubao-TUI AI Agent.

Each public function is a callable tool that the LLM can invoke via OpenAI
function-calling.  Every tool returns a descriptive ``str`` (success or error)
so the model can understand the outcome and adjust.

The module also exports ``TOOL_SCHEMAS`` — the JSON Schema definitions required
by the OpenAI ``tools`` parameter.
"""

from __future__ import annotations

import os
import subprocess
from typing import Any, Dict, List

# ---------------------------------------------------------------------------
# Excluded directory names for view_structure
# ---------------------------------------------------------------------------
_EXCLUDE_DIRS: set[str] = {
    ".git",
    "__pycache__",
    ".venv",
    "venv",
    "node_modules",
    ".mypy_cache",
    ".pytest_cache",
    ".tox",
    ".eggs",
    "dist",
    "build",
    ".idea",
    ".vscode",
}


# ===================================================================
# Tool implementations
# ===================================================================

def view_structure() -> str:
    """Return a tree-like listing of the current working directory.

    Excludes common VCS / build / virtual-environment directories.

    Returns:
        An indented tree string showing the project layout.
    """
    cwd: str = os.getcwd()
    lines: List[str] = [f"{cwd}/"]
    try:
        for root, dirs, files in os.walk(cwd):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in _EXCLUDE_DIRS]

            level = root.replace(cwd, "").count(os.sep)
            indent = "    " * level
            basename = os.path.basename(root) or root
            if level > 0:
                lines.append(f"{indent}├── {basename}/")

            sub_indent = "    " * (level + 1)
            for fname in sorted(files):
                lines.append(f"{sub_indent}├── {fname}")
    except OSError as exc:
        return f"Error walking directory: {exc}"

    return "\n".join(lines)


def read_file(path: str) -> str:
    """Read and return the full contents of a file.

    Args:
        path: Relative or absolute path to the target file.

    Returns:
        The file contents as a string, or an error description.
    """
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            return fh.read()
    except FileNotFoundError:
        return f"Error: file not found — {path}"
    except PermissionError:
        return f"Error: permission denied — {path}"
    except IsADirectoryError:
        return f"Error: {path} is a directory, not a file"
    except OSError as exc:
        return f"Error reading file: {exc}"


def write_file(path: str, content: str) -> str:
    """Overwrite or create a file with the given content.

    Parent directories are created automatically when missing.

    Args:
        path: Relative or absolute path to the target file.
        content: The full text to write.

    Returns:
        A success message or error description.
    """
    try:
        dirname = os.path.dirname(path)
        if dirname:
            os.makedirs(dirname, exist_ok=True)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(content)
        return f"Successfully wrote {len(content)} bytes to {path}"
    except OSError as exc:
        return f"Error writing file: {exc}"


def patch_file(path: str, old_text: str, new_text: str) -> str:
    """Perform an exact string replacement inside a file (first occurrence only).

    Args:
        path: Path to the target file.
        old_text: The exact substring to replace.
        new_text: The replacement string.

    Returns:
        A success message or error description.
    """
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            original = fh.read()
    except FileNotFoundError:
        return f"Error: file not found — {path}"
    except OSError as exc:
        return f"Error reading file for patch: {exc}"

    if old_text not in original:
        return (
            f"Error: old_text not found in {path}. "
            f"Ensure the snippet matches exactly (whitespace, indentation)."
        )

    patched = original.replace(old_text, new_text, 1)
    try:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(patched)
        return f"Successfully patched {path} (replaced 1 occurrence)"
    except OSError as exc:
        return f"Error writing patched file: {exc}"


def execute_command(command: str) -> str:
    """Execute a shell command and return stdout + stderr.

    The command runs with a 30-second timeout.  This tool is **high-risk** and
    must pass the security blacklist check + user authorisation before execution.

    Args:
        command: The shell command to run.

    Returns:
        Combined stdout and stderr (truncated at 4 000 chars), or an error message.
    """
    try:
        proc = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
        )
    except subprocess.TimeoutExpired:
        return f"Error: command timed out after 30 s — {command!r}"
    except FileNotFoundError:
        return f"Error: command not found — {command!r}"
    except OSError as exc:
        return f"Error executing command: {exc}"

    output = proc.stdout.strip() or "(no stdout)"
    if proc.stderr.strip():
        output += "\n[stderr]\n" + proc.stderr.strip()

    max_chars = 4_000
    if len(output) > max_chars:
        output = output[:max_chars] + f"\n\n... (truncated, {len(output)} chars total)"

    return f"[exit code {proc.returncode}]\n{output}"


# ===================================================================
# OpenAI Tool JSON Schemas
# ===================================================================

TOOL_SCHEMAS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "view_structure",
            "description": (
                "Show the directory tree of the current project. "
                "Use this to understand the file layout before reading or editing."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": (
                "Read the entire contents of a specified file. "
                "Returns the text or an error message."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Relative or absolute path to the file to read.",
                    },
                },
                "required": ["path"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": (
                "Create a new file or overwrite an existing one with the given content. "
                "Parent directories are created automatically. "
                "**Requires user approval** before execution."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Relative or absolute path to the file.",
                    },
                    "content": {
                        "type": "string",
                        "description": "The full text content to write into the file.",
                    },
                },
                "required": ["path", "content"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "patch_file",
            "description": (
                "Replace an exact substring inside a file (first match only). "
                "Use this for surgical edits.  The old_text must match exactly "
                "(including whitespace and indentation).  **Requires user approval**."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Path to the file to patch.",
                    },
                    "old_text": {
                        "type": "string",
                        "description": "Exact substring to replace.",
                    },
                    "new_text": {
                        "type": "string",
                        "description": "Replacement string.",
                    },
                },
                "required": ["path", "old_text", "new_text"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "execute_command",
            "description": (
                "Run a shell command in the terminal and return its output. "
                "Commands are screened against a security blacklist. "
                "**Requires user approval** before execution.  "
                "Timeout: 30 seconds."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "The shell command to execute.",
                    },
                },
                "required": ["command"],
            },
        },
    },
]

# Mapping used by the agent for dispatch
TOOL_DISPATCH: Dict[str, Any] = {
    "view_structure": view_structure,
    "read_file": read_file,
    "write_file": write_file,
    "patch_file": patch_file,
    "execute_command": execute_command,
}
