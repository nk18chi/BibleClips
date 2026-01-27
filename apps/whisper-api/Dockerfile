# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server .

# Runtime stage
FROM alpine:3.19

# Install yt-dlp, ffmpeg, and deno (for YouTube JS extraction)
RUN apk add --no-cache ffmpeg python3 py3-pip curl unzip && \
    pip3 install --break-system-packages yt-dlp && \
    curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh

# Ensure deno is in PATH for yt-dlp
ENV PATH="/usr/local/bin:${PATH}"

WORKDIR /app
COPY --from=builder /app/server .

# Copy cookies file if exists
COPY cookies.txt* ./

EXPOSE 8080
CMD ["./server"]
