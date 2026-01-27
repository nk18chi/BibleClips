# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ffmpeg python3 py3-pip && \
    pip3 install --break-system-packages yt-dlp

WORKDIR /app
COPY --from=builder /app/server .

EXPOSE 8080
CMD ["./server"]
