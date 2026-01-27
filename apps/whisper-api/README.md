# Whisper API

A Cloud Run service that transcribes YouTube video audio using OpenAI Whisper.

## Features

- Downloads audio from YouTube videos for specified time range (yt-dlp)
- Transcribes with OpenAI Whisper API
- Returns word-level timestamps

## API

### POST /transcribe

**Request:**
```json
{
  "video_id": "d5xyYI9tNV8",
  "start": 0,
  "end": 30
}
```

**Response:**
```json
{
  "words": [
    { "word": "Hello", "start": 0.0, "end": 0.5 },
    { "word": "world", "start": 0.5, "end": 1.0 }
  ]
}
```

### GET /health

Health check endpoint.

## Local Development

```bash
# Install dependencies
go mod tidy

# Run
OPENAI_API_KEY=sk-xxx go run .
```

## Deploy to Cloud Run

```bash
cd apps/whisper-api

gcloud run deploy whisper-api \
  --source . \
  --region asia-northeast1 \
  --set-env-vars OPENAI_API_KEY=sk-xxx \
  --allow-unauthenticated \
  --memory 1Gi \
  --timeout 300
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `PORT` | Server port (default: 8080) |
