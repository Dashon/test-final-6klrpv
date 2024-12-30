# Build stage
FROM python:3.9-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DEBIAN_FRONTEND=noninteractive \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libgomp1 \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1000 ml-service && \
    useradd -u 1000 -g ml-service -s /bin/false ml-service

COPY requirements.txt setup.py ./
COPY src ./src

RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir .

# Final stage
FROM python:3.9-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TZ=UTC \
    ML_SERVICE_PORT=8000 \
    ML_SERVICE_HOST=0.0.0.0 \
    MODEL_PATH=/app/models \
    PROMETHEUS_MULTIPROC_DIR=/tmp

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgomp1 \
    libjemalloc2 \
    procps \
    && rm -rf /var/lib/apt/lists/* && \
    groupadd -g 1000 ml-service && \
    useradd -u 1000 -g ml-service -s /bin/false ml-service && \
    mkdir -p /app/models /tmp && \
    chown -R ml-service:ml-service /app /tmp

COPY --from=builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --chown=ml-service:ml-service src ./src

USER ml-service:ml-service

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENV LD_PRELOAD=/usr/lib/x86_64-linux-gnu/libjemalloc.so.2

ENTRYPOINT ["python", "-m", "uvicorn", "ml_service.main:app", \
    "--host", "0.0.0.0", \
    "--port", "8000", \
    "--workers", "2", \
    "--limit-concurrency", "1000", \
    "--backlog", "2048"]