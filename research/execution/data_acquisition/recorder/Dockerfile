FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/

RUN mkdir -p /data

ENV PORT=8080
ENV RAW_DIR=/data
ENV IQO_ASSET=XAU/XAG
ENV IQO_INTERVAL=60

EXPOSE 8080

CMD ["python", "cloud_entrypoint.py"]
