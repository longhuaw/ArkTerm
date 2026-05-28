"""Doubao-TUI — A multi-model terminal AI Agent for ByteDance Doubao LLM.

Install
-------
    pip install .                # local install
    pipx install .               # isolated global install
    pipx run --spec . doubao-tui # one-shot run
"""

import re
from pathlib import Path
from setuptools import setup, find_packages

HERE = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Read long description from README.md (falls back to short docstring)
# ---------------------------------------------------------------------------
readme_path = HERE / "README.md"
long_description = (
    readme_path.read_text(encoding="utf-8")
    if readme_path.exists()
    else __doc__
)

# ---------------------------------------------------------------------------
# Parse requirements.txt
# ---------------------------------------------------------------------------
req_path = HERE / "requirements.txt"
requirements: list[str] = []
if req_path.exists():
    requirements = [
        line.strip()
        for line in req_path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]

# ---------------------------------------------------------------------------
# Single-source version from src/__init__.py
# ---------------------------------------------------------------------------
init = (HERE / "src" / "__init__.py").read_text(encoding="utf-8")
version_match = re.search(r"^__version__\s*=\s*['\"]([^'\"]+)['\"]", init, re.M)
version = version_match.group(1) if version_match else "0.0.0"

# ---------------------------------------------------------------------------
# Package definition
# ---------------------------------------------------------------------------
setup(
    name="doubao-tui",
    version=version,
    description="A multi-model terminal AI Agent powered by Doubao / DeepSeek / Claude",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="The Doubao-TUI Contributors",
    url="https://github.com/your-org/doubao-tui",
    license="MIT",
    packages=find_packages(include=["src", "src.*"]),
    python_requires=">=3.10",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "doubao-tui = src.main:main",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Environment :: Console",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Terminals",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
    keywords="doubao llm terminal tui agent ai deepseek claude openai volcengine",
    project_urls={
        "Source": "https://github.com/your-org/doubao-tui",
        "Issues": "https://github.com/your-org/doubao-tui/issues",
    },
)
