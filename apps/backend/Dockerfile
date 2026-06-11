FROM python:3.13-slim

WORKDIR /app

RUN pip install uv

# Install dev extras (pytest, etc.) by default so tests run in-container.
# Set INSTALL_DEV=false for a lean production build.
ARG INSTALL_DEV=true

COPY pyproject.toml .
RUN if [ "$INSTALL_DEV" = "true" ]; then \
        uv pip install --system --no-cache-dir -e ".[dev]"; \
    else \
        uv pip install --system --no-cache-dir -e .; \
    fi

COPY . .

RUN chmod +x entrypoint.sh

EXPOSE 8000

CMD ["./entrypoint.sh"]
