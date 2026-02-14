FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY transcription_agent.py .

CMD ["python", "transcription_agent.py", "start"]
