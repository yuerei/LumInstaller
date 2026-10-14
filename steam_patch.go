package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// steamPatchURL is the release asset containing the Steam patch payload.
const steamPatchURL = "https://github.com/yuerei/LumInstaller/releases/download/v0.1.0/SteamPatch.zip"

// defaultSteamPath is the usual 64-bit Windows install location for Steam.
const defaultSteamPath = `C:\Program Files (x86)\Steam`

// cacheCleanerExe is the executable shipped inside SteamPatch.zip that we run
// once and then delete.
const cacheCleanerExe = "DeleteSteamAppCache.exe"

// DetectSteamPath returns Steam's install directory, preferring the registry
// value and falling back to the default path if it exists.
func (a *App) DetectSteamPath() string {
	if p := steamPathFromRegistry(); p != "" {
		if info, err := os.Stat(p); err == nil && info.IsDir() {
			return p
		}
	}
	if info, err := os.Stat(defaultSteamPath); err == nil && info.IsDir() {
		return defaultSteamPath
	}
	// Return the default even if missing so the UI can show a sensible value.
	return defaultSteamPath
}

// steamPathFromRegistry reads HKCU\Software\Valve\Steam\SteamPath via `reg query`.
// Returns an empty string if unavailable (keeps this file free of extra deps).
func steamPathFromRegistry() string {
	out, err := exec.Command("reg", "query", `HKCU\Software\Valve\Steam`, "/v", "SteamPath").Output()
	if err != nil {
		return ""
	}
	// Output line looks like: "    SteamPath    REG_SZ    C:/Program Files (x86)/Steam"
	for _, line := range strings.Split(string(out), "\n") {
		if strings.Contains(line, "SteamPath") {
			if i := strings.Index(line, "REG_SZ"); i >= 0 {
				val := strings.TrimSpace(line[i+len("REG_SZ"):])
				// Steam stores forward slashes; normalize to the OS separator.
				return filepath.Clean(filepath.FromSlash(val))
			}
		}
	}
	return ""
}

// IsSteamRunning reports whether a steam.exe process is currently running.
func (a *App) IsSteamRunning() bool {
	out, err := exec.Command("tasklist", "/FI", "IMAGENAME eq steam.exe", "/NH").Output()
	if err != nil {
		return false
	}
	return strings.Contains(strings.ToLower(string(out)), "steam.exe")
}

// ApplySteamPatch downloads SteamPatch.zip, extracts it into steamPath, runs
// the bundled cache cleaner, then deletes the cleaner. steamPath may be empty,
// in which case the detected/default path is used.
//
// It refuses to run while Steam is open. Writing into Program Files requires
// the app to run with administrator rights; a permission failure surfaces a
// clear error.
func (a *App) ApplySteamPatch(steamPath string) error {
	steamPath = strings.TrimSpace(steamPath)
	if steamPath == "" {
		steamPath = a.DetectSteamPath()
	}

	if info, err := os.Stat(steamPath); err != nil || !info.IsDir() {
		return fmt.Errorf("Steam folder not found at %q — set the correct path first", steamPath)
	}

	if a.IsSteamRunning() {
		return fmt.Errorf("Steam is still running — please close Steam completely and try again")
	}

	a.emitSteam(false, "Downloading patch…")

	// Download the patch zip into the OS temp dir.
	tmpZip := filepath.Join(os.TempDir(), "LumInstaller-SteamPatch.zip")
	if err := a.downloadTo(steamPatchURL, tmpZip); err != nil {
		return fmt.Errorf("downloading patch: %w", err)
	}
	defer os.Remove(tmpZip)

	a.emitSteam(false, "Extracting into Steam folder…")
	if err := a.extractZip("steam", tmpZip, steamPath); err != nil {
		if os.IsPermission(err) {
			return fmt.Errorf("permission denied writing to %q — run LumInstaller as administrator", steamPath)
		}
		return fmt.Errorf("extracting patch: %w", err)
	}

	cleaner := filepath.Join(steamPath, cacheCleanerExe)
	if _, err := os.Stat(cleaner); err != nil {
		return fmt.Errorf("%s was not found after extraction", cacheCleanerExe)
	}

	a.emitSteam(false, "Running "+cacheCleanerExe+"…")
	cmd := exec.Command(cleaner)
	cmd.Dir = steamPath
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("running %s: %w", cacheCleanerExe, err)
	}

	a.emitSteam(false, "Cleaning up…")
	// Give the OS a moment to release the handle before deleting.
	time.Sleep(300 * time.Millisecond)
	if err := os.Remove(cleaner); err != nil && !os.IsNotExist(err) {
		// Non-fatal: the patch itself succeeded.
		runtime.LogWarningf(a.ctx, "could not delete %s: %v", cacheCleanerExe, err)
	}

	a.emitSteam(true, "Steam patch applied")
	return nil
}

// downloadTo fetches url and writes it to destPath (used for the patch zip).
func (a *App) downloadTo(url, destPath string) error {
	// Reuse the hardened Download by targeting the temp dir, then rename to the
	// fixed name the rest of the flow expects.
	dir := filepath.Dir(destPath)
	got, err := a.Download("steam-patch", url, dir, filepath.Base(destPath))
	if err != nil {
		return err
	}
	if got != destPath {
		// Download sanitized the name; move it to the expected path.
		if err := os.Rename(got, destPath); err != nil {
			return err
		}
	}
	return nil
}

// SteamPatchProgress is emitted on "steam:progress" during the patch flow.
type SteamPatchProgress struct {
	Done    bool   `json:"done"`
	Message string `json:"message"`
}

func (a *App) emitSteam(done bool, msg string) {
	if a.ctx == nil {
		return
	}
	runtime.EventsEmit(a.ctx, "steam:progress", SteamPatchProgress{
		Done:    done,
		Message: msg,
	})
}
