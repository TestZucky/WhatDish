# WhatDish backend — production image.
# Build:  docker build -t whatdish-api backend
# Run:    docker run -p 8000:8000 \
#           -e OPENAI_API_KEY=sk-... \
#           -e WHATDISH_CORS_ORIGINS=https://your-frontend.example.com \
#           whatdish-api
#
# Secrets and per-deploy config come from the runtime environment / secret
# manager — never baked into the image (see .dockerignore, which drops all .env*).
FROM python:3.14-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    APP_ENV=production

WORKDIR /app

# Install dependencies first so this layer is cached across code changes.
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Application code.
COPY app ./app

# Run as an unprivileged user.
RUN useradd --create-home --uid 1000 appuser
USER appuser

EXPOSE 8000

# Simple container healthcheck against the API's health endpoint.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
