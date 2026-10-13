package main

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods (events, dialogs).
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ChooseFolder opens a native folder-picker dialog and returns the
// selected path (empty string if the user cancels).
func (a *App) ChooseFolder() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Choose download folder",
	})
}

// DownloadProgress is the payload we emit to the frontend as a download runs.
type DownloadProgress struct {
	ModID      string  `json:"modId"`
	Downloaded int64   `json:"downloaded"`
	Total      int64   `json:"total"`
	Percent    float64 `json:"percent"`
	SpeedBps   float64 `json:"speedBps"`
	EtaSeconds float64 `json:"etaSeconds"`
	Done       bool    `json:"done"`
}

// Download fetches the file at url into destFolder, emitting
// "download:progress" events keyed by modID as it goes.
func (a *App) Download(modID, url, destFolder string) error {
	if destFolder == "" {
		return fmt.Errorf("no destination folder set")
	}

	// Derive a filename from the URL.
	name := filepath.Base(url)
	if i := strings.IndexAny(name, "?#"); i >= 0 {
		name = name[:i]
	}
	if name == "" || name == "." || name == "/" {
		name = "download.bin"
	}
	destPath := filepath.Join(destFolder, name)

	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned %s", resp.Status)
	}

	out, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("cannot create file: %w", err)
	}
	defer out.Close()

	total := resp.ContentLength
	var downloaded int64
	buf := make([]byte, 32*1024)
	start := time.Now()
	lastEmit := time.Now()

	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, writeErr := out.Write(buf[:n]); writeErr != nil {
				return fmt.Errorf("write failed: %w", writeErr)
			}
			downloaded += int64(n)

			// Throttle events to ~every 100ms so we don't flood the frontend.
			if time.Since(lastEmit) > 100*time.Millisecond {
				a.emitProgress(modID, downloaded, total, start, false)
				lastEmit = time.Now()
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return fmt.Errorf("read failed: %w", readErr)
		}
	}

	// Final 100% event.
	a.emitProgress(modID, downloaded, total, start, true)
	return nil
}

func (a *App) emitProgress(modID string, downloaded, total int64, start time.Time, done bool) {
	elapsed := time.Since(start).Seconds()
	var speed, eta, percent float64
	if elapsed > 0 {
		speed = float64(downloaded) / elapsed
	}
	if total > 0 {
		percent = float64(downloaded) / float64(total) * 100
		if speed > 0 {
			eta = float64(total-downloaded) / speed
		}
	}
	runtime.EventsEmit(a.ctx, "download:progress", DownloadProgress{
		ModID:      modID,
		Downloaded: downloaded,
		Total:      total,
		Percent:    percent,
		SpeedBps:   speed,
		EtaSeconds: eta,
		Done:       done,
	})
}
