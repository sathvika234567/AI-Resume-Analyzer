# Stage 1: Build Python packages
FROM python:3.10-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Production runtime environment
FROM python:3.10-slim AS runner

WORKDIR /app

# Install system dependencies for OCR and PDF rendering (Tesseract and Poppler)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    poppler-utils \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy python dependencies from builder stage
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

RUN python -m spacy download en_core_web_sm

# Copy application layers
COPY database /app/database
COPY ml /app/ml
COPY backend/app /app/app
COPY backend/alembic.ini /app/alembic.ini
COPY backend/alembic /app/alembic

# Prepare persistent folders
RUN mkdir -p /app/uploads /app/model_cache

ENV UPLOAD_DIR=/app/uploads
ENV MODEL_CACHE_DIR=/app/model_cache
ENV PYTHONPATH=/app

EXPOSE 8000

# Execute server using Gunicorn + Uvicorn worker threads
CMD ["gunicorn", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "app.main:app"]
