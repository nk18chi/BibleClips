package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	openai "github.com/sashabaranov/go-openai"
)

type TranscribeRequest struct {
	VideoID string  `json:"video_id"`
	Start   float64 `json:"start"`
	End     float64 `json:"end"`
}

type WordTiming struct {
	Word  string  `json:"word"`
	Start float64 `json:"start"`
	End   float64 `json:"end"`
}

type TranscribeResponse struct {
	Words []WordTiming `json:"words"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	http.HandleFunc("/transcribe", handleTranscribe)
	http.HandleFunc("/health", handleHealth)

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("ok"))
}

func handleTranscribe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req TranscribeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.VideoID == "" || req.End <= req.Start {
		sendError(w, "Missing or invalid video_id, start, or end", http.StatusBadRequest)
		return
	}

	words, err := transcribe(req.VideoID, req.Start, req.End)
	if err != nil {
		log.Printf("Transcription error: %v", err)
		sendError(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(TranscribeResponse{Words: words})
}

func transcribe(videoID string, start, end float64) ([]WordTiming, error) {
	// Create temp file for audio
	tmpDir := os.TempDir()
	audioPath := filepath.Join(tmpDir, fmt.Sprintf("%s_%d.mp3", videoID, time.Now().UnixNano()))
	defer os.Remove(audioPath)

	// Download audio with yt-dlp
	duration := end - start
	ytdlpArgs := []string{
		"-x",
		"--audio-format", "mp3",
		"--postprocessor-args", fmt.Sprintf("ffmpeg:-ss %.2f -t %.2f", start, duration),
		"-o", audioPath,
		fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID),
	}

	log.Printf("Downloading audio for %s (%.2f - %.2f)...", videoID, start, end)
	ctx, cancel := context.WithTimeout(context.Background(), 120*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, "yt-dlp", ytdlpArgs...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("yt-dlp failed: %w", err)
	}

	// Check if file exists
	if _, err := os.Stat(audioPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("audio file not created")
	}

	// Transcribe with OpenAI Whisper
	log.Println("Transcribing with Whisper...")
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("OPENAI_API_KEY not set")
	}

	client := openai.NewClient(apiKey)

	resp, err := client.CreateTranscription(
		context.Background(),
		openai.AudioRequest{
			Model:                  openai.Whisper1,
			FilePath:              audioPath,
			Format:                openai.AudioResponseFormatVerboseJSON,
			TimestampGranularities: []openai.TranscriptionTimestampGranularity{openai.TranscriptionTimestampGranularityWord},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("whisper API failed: %w", err)
	}

	// Convert to WordTiming with adjusted timestamps
	words := make([]WordTiming, len(resp.Words))
	for i, w := range resp.Words {
		words[i] = WordTiming{
			Word:  w.Word,
			Start: start + float64(w.Start),
			End:   start + float64(w.End),
		}
	}

	log.Printf("Transcribed %d words", len(words))
	return words, nil
}

func sendError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}
