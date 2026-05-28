# ============================================================================
# Doubao-TUI — lightweight Docker image
#
# Build:
#   docker build -t doubao-tui .
#
# Run (bind-mount your .env from the host):
#   docker run -it --rm -v "$PWD/.env:/app/.env" doubao-tui
# ============================================================================

FROM python:3.10-slim

LABEL org.opencontainers.image.title="doubao-tui"
LABEL org.opencontainers.image.description="Multi-model terminal AI Agent (Doubao / DeepSeek / Claude)"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/your-org/doubao-tui"

# ---------------------------------------------------------------------------
# System dependencies (none needed beyond the slim image base)
# ---------------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

# .env is expected to be mounted at runtime, not baked into the image
COPY .env ./.env.example 2>/dev/null || true

ENTRYPOINT ["python", "-m", "src.main"]
