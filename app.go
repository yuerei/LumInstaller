package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
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

// DefaultGameFolder returns a sensible default install directory for a given
// game, creating it if necessary. Returns an empty string if there is no known
// default for the game (the caller should then prompt the user).
//
// For Minecraft it uses a launcher's "instances" folder under %APPDATA%,
// preferring one that already exists (Ely PrismLauncher, then PrismLauncher).
// If neither is installed yet, it falls back to PrismLauncher's path.
func (a *App) DefaultGameFolder(game string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(game)) {
	case "minecraft":
		base := os.Getenv("APPDATA")
		if base == "" {
			return "", fmt.Errorf("APPDATA environment variable not set")
		}

		// Candidate launcher instances folders, in order of preference.
		candidates := []string{
			filepath.Join(base, "ElyPrismLauncher", "instances"),
			filepath.Join(base, "PrismLauncher", "instances"),
		}

		// Prefer a folder that already exists.
		for _, c := range candidates {
			if info, err := os.Stat(c); err == nil && info.IsDir() {
				return c, nil
			}
		}

		// None exist yet: fall back to PrismLauncher and create it.
		fallback := candidates[len(candidates)-1]
		if err := os.MkdirAll(fallback, 0o755); err != nil {
			return "", fmt.Errorf("cannot create instances folder: %w", err)
		}
		return fallback, nil
	default:
		return "", nil
	}
}

// catalogURL is the remote source of truth for the mod catalog. Served over a
// CDN so we get caching and avoid GitHub raw rate limits.
const catalogURL = "https://cdn.jsdelivr.net/gh/yuerei/luminstaller-catalog@main/catalog.json"

// appDataDir returns (and creates) the app's data directory under %APPDATA%.
func appDataDir() (string, error) {
	base := os.Getenv("APPDATA")
	if base == "" {
		// Fall back to the OS user config dir on non-Windows / unusual setups.
		var err error
		base, err = os.UserConfigDir()
		if err != nil {
			return "", fmt.Errorf("cannot locate app data directory: %w", err)
		}
	}
	dir := filepath.Join(base, "LumInstaller")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("cannot create app data directory: %w", err)
	}
	return dir, nil
}

// catalogCachePath is where the last successfully-fetched catalog is stored so
// the app still works offline.
func catalogCachePath() (string, error) {
	dir, err := appDataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "catalog.json"), nil
}

// FetchCatalog downloads the catalog JSON from the remote CDN and returns it as
// a raw string for the frontend to parse. On any network failure it falls back
// to the last cached copy on disk. On success it refreshes that cache.
//
// Returning the raw JSON (rather than a typed struct) keeps the schema's single
// source of truth in the frontend's TypeScript types.
func (a *App) FetchCatalog() (string, error) {
	client := &http.Client{Timeout: 20 * time.Second}

	req, err := http.NewRequestWithContext(a.ctx, http.MethodGet, catalogURL, nil)
	if err != nil {
		return a.cachedCatalog(fmt.Errorf("invalid catalog request: %w", err))
	}

	resp, err := client.Do(req)
	if err != nil {
		return a.cachedCatalog(fmt.Errorf("catalog request failed: %w", err))
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return a.cachedCatalog(fmt.Errorf("catalog server returned %s", resp.Status))
	}

	// Cap the response to a sane size (8 MiB) to avoid a hostile/huge payload.
	body, err := io.ReadAll(io.LimitReader(resp.Body, 8<<20))
	if err != nil {
		return a.cachedCatalog(fmt.Errorf("reading catalog failed: %w", err))
	}

	// Validate it parses as JSON before trusting/caching it.
	if !json.Valid(body) {
		return a.cachedCatalog(fmt.Errorf("catalog is not valid JSON"))
	}

	// Refresh the on-disk cache (best effort — a cache write failure is not fatal).
	if path, cerr := catalogCachePath(); cerr == nil {
		_ = os.WriteFile(path, body, 0o644)
	}

	return string(body), nil
}

// cachedCatalog returns the on-disk cached catalog, wrapping fetchErr if the
// cache is also unavailable so the caller sees the original failure cause.
func (a *App) cachedCatalog(fetchErr error) (string, error) {
	path, err := catalogCachePath()
	if err != nil {
		return "", fetchErr
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("%w (no cached catalog available)", fetchErr)
	}
	return string(data), nil
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
// "download:progress" events keyed by modID as it goes. If filename is
// non-empty it is used (sanitized) as the output name; otherwise the name is
// derived from the URL. It returns the absolute path of the downloaded file.
func (a *App) Download(modID, rawURL, destFolder, filename string) (string, error) {
	if destFolder == "" {
		return "", fmt.Errorf("no destination folder set")
	}

	// Only allow HTTPS downloads from the catalog.
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", fmt.Errorf("invalid URL: %w", err)
	}
	if parsed.Scheme != "https" {
		return "", fmt.Errorf("refusing non-HTTPS URL (%s)", parsed.Scheme)
	}

	// Pick a filename: prefer the catalog-provided one, else derive from the URL.
	name := filename
	if name == "" {
		name = parsed.Path
	}
	// filepath.Base strips any directory components, defeating path traversal.
	name = filepath.Base(name)
	if i := strings.IndexAny(name, "?#"); i >= 0 {
		name = name[:i]
	}
	if name == "" || name == "." || name == string(filepath.Separator) {
		name = "download.bin"
	}
	destPath := filepath.Join(destFolder, name)

	client := &http.Client{
		// A generous overall timeout guards against a server that accepts the
		// connection then stalls indefinitely. Large files are still fine.
		Timeout: 30 * time.Minute,
	}

	req, err := http.NewRequestWithContext(a.ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return "", fmt.Errorf("invalid request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("server returned %s", resp.Status)
	}

	out, err := os.Create(destPath)
	if err != nil {
		return "", fmt.Errorf("cannot create file: %w", err)
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
				return "", fmt.Errorf("write failed: %w", writeErr)
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
			return "", fmt.Errorf("read failed: %w", readErr)
		}
	}

	// Final 100% event.
	a.emitProgress(modID, downloaded, total, start, true)
	return destPath, nil
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
