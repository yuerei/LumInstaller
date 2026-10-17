package main

import (
	"crypto/sha256"
	"encoding/hex"
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

// AppUpdateProgress is emitted on "appupdate:progress" during a self-update.
type AppUpdateProgress struct {
	Percent float64 `json:"percent"`
	Done    bool    `json:"done"`
	Message string  `json:"message"`
}

func (a *App) emitAppUpdate(percent float64, done bool, msg string) {
	if a.ctx == nil {
		return
	}
	runtime.EventsEmit(a.ctx, "appupdate:progress", AppUpdateProgress{
		Percent: percent,
		Done:    done,
		Message: msg,
	})
}

// ApplyAppUpdate downloads the new app exe from exeURL, verifies it against the
// SHA-256 published at sha256URL, then swaps it in for the running executable
// and relaunches. Because a running .exe can't overwrite itself on Windows, a
// small helper script performs the replace after this process exits.
//
// Both URLs must be HTTPS. On any verification failure the download is discarded
// and the running app is left untouched.
func (a *App) ApplyAppUpdate(exeURL, sha256URL string) error {
	if err := requireHTTPS(exeURL); err != nil {
		return err
	}
	if sha256URL != "" {
		if err := requireHTTPS(sha256URL); err != nil {
			return err
		}
	}

	self, err := os.Executable()
	if err != nil {
		return fmt.Errorf("cannot locate current executable: %w", err)
	}
	self, _ = filepath.EvalSymlinks(self)

	// Download the new exe to a temp file next to nothing sensitive.
	a.emitAppUpdate(0, false, "Downloading update…")
	newExe := filepath.Join(os.TempDir(), "LumInstaller-update.exe")
	if err := a.downloadWithProgress(exeURL, newExe); err != nil {
		return fmt.Errorf("downloading update: %w", err)
	}

	// Verify integrity before we ever execute the downloaded file.
	if sha256URL != "" {
		a.emitAppUpdate(100, false, "Verifying…")
		want, err := fetchExpectedSha(sha256URL)
		if err != nil {
			_ = os.Remove(newExe)
			return fmt.Errorf("fetching checksum: %w", err)
		}
		got, err := fileSha256(newExe)
		if err != nil {
			_ = os.Remove(newExe)
			return fmt.Errorf("hashing update: %w", err)
		}
		if !strings.EqualFold(got, want) {
			_ = os.Remove(newExe)
			return fmt.Errorf("checksum mismatch — update rejected")
		}
	}

	// Hand off to the platform-specific swap+relaunch helper, then quit so the
	// helper can replace the (now-unused) executable.
	a.emitAppUpdate(100, true, "Restarting…")
	if err := swapAndRelaunch(self, newExe); err != nil {
		return fmt.Errorf("applying update: %w", err)
	}
	runtime.Quit(a.ctx)
	return nil
}

func requireHTTPS(raw string) error {
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}
	if u.Scheme != "https" {
		return fmt.Errorf("refusing non-HTTPS URL (%s)", u.Scheme)
	}
	return nil
}

// downloadWithProgress fetches url to destPath, emitting appupdate:progress.
func (a *App) downloadWithProgress(rawURL, destPath string) error {
	client := &http.Client{Timeout: 15 * time.Minute}
	req, err := http.NewRequestWithContext(a.ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "LumInstaller")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("server returned %s", resp.Status)
	}

	out, err := os.Create(destPath)
	if err != nil {
		return err
	}
	defer out.Close()

	total := resp.ContentLength
	var downloaded int64
	buf := make([]byte, 64*1024)
	lastEmit := time.Now()
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, werr := out.Write(buf[:n]); werr != nil {
				return werr
			}
			downloaded += int64(n)
			if total > 0 && time.Since(lastEmit) > 100*time.Millisecond {
				a.emitAppUpdate(float64(downloaded)/float64(total)*100, false, "Downloading update…")
				lastEmit = time.Now()
			}
		}
		if readErr == io.EOF {
			break
		}
		if readErr != nil {
			return readErr
		}
	}
	return nil
}

// fetchExpectedSha downloads a sha256sum-format file and returns the hex digest.
func fetchExpectedSha(sha256URL string) (string, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(sha256URL)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("server returned %s", resp.Status)
	}
	data, err := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if err != nil {
		return "", err
	}
	// Format is "<hex>  <filename>"; take the first whitespace-delimited field.
	fields := strings.Fields(string(data))
	if len(fields) == 0 {
		return "", fmt.Errorf("empty checksum file")
	}
	return fields[0], nil
}

func fileSha256(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}
