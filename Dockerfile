FROM nvidia/cuda:12.1.1-runtime-ubuntu22.04 AS backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 python3-pip python3.11-venv \
    libgl1 libglib2.0-0 ffmpeg git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN python3.11 -m pip install --upgrade pip && \
    python3.11 -m pip install -r requirements.txt

COPY backend/ ./backend/
COPY config.yaml .
COPY scripts/ ./scripts/

EXPOSE 8000
CMD ["python3.11", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
