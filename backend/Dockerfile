FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements-sqlite.txt .
RUN pip install --no-cache-dir -r requirements-sqlite.txt

# Copy application
COPY app/ ./app/

# Create data directory for SQLite
RUN mkdir -p /data

# Set environment
ENV DATABASE_URL=sqlite:////data/claw.db
ENV PORT=8000

EXPOSE 8000

CMD ["uvicorn", "app.main_production:app", "--host", "0.0.0.0", "--port", "8000"]
