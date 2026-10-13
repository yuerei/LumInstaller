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

// prismDir returns the PrismLauncher data directory inside %APPDATA%.
func prismDir() (string, error) {
	appData := os.Getenv("APPDATA")
	if appData == "" {
		return "", fmt.Errorf("APPDATA environment variable not set")
	}
	return filepath.Join(appData, "PrismLauncher"), nil
}

// IsPrismLauncherInstalled reports whether PrismLauncher's data folder exists
// under %APPDATA%\PrismLauncher.
func (a *App) IsPrismLauncherInstalled() bool {
	dir, err := prismDir()
	if err != nil {
		return false
	}
	info, err := os.Stat(dir)
	return err == nil && info.IsDir()
}

// prismAccountsTemplate is the accounts.json content written by PatchPrismAccount.
// The %s placeholder is replaced with the chosen username (used in two places).
const prismAccountsTemplate = `{
    "accounts": [
        {
            "entitlement": {
                "canPlayMinecraft": true,
                "ownsMinecraft": true
            },
            "msa-client-id": "",
            "type": "MSA"
        },
        {
            "active": true,
            "profile": {
                "capes": [],
                "id": "0c79d88a112537a0a302f01afa6bc94a",
                "name": "%[1]s",
                "skin": {
                    "id": "",
                    "url": "",
                    "variant": ""
                }
            },
            "type": "Offline",
            "ygg": {
                "extra": {
                    "clientToken": "8be89b1112474b5fb8f061699ff41bda",
                    "userName": "%[1]s"
                },
                "iat": 1738858981,
                "token": "0"
            }
        }
    ],
    "formatVersion": 3
}
`

// PatchPrismAccount writes an offline account entry with the given username
// into %APPDATA%\PrismLauncher\accounts.json.
func (a *App) PatchPrismAccount(username string) error {
	username = strings.TrimSpace(username)
	if username == "" {
		return fmt.Errorf("username is required")
	}

	dir, err := prismDir()
	if err != nil {
		return err
	}
	if info, statErr := os.Stat(dir); statErr != nil || !info.IsDir() {
		return fmt.Errorf("PrismLauncher is not installed")
	}

	// Escape the username so it is valid inside a JSON string.
	safe := strings.NewReplacer(`\`, `\\`, `"`, `\"`).Replace(username)
	content := fmt.Sprintf(prismAccountsTemplate, safe)

	destPath := filepath.Join(dir, "accounts.json")
	if err := os.WriteFile(destPath, []byte(content), 0o644); err != nil {
		return fmt.Errorf("cannot write accounts.json: %w", err)
	}
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
