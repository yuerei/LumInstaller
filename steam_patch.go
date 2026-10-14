package main

import (
	"fmt"
	"os"
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

// DetectSteamPath returns Steam's install directory. It prefers the registry
// value, then the standard Program Files location, and finally returns the
// default path even if it does not exist so the UI always has a value to show.
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
	out, err := hiddenCommand("reg", "query", `HKCU\Software\Valve\Steam`, "/v", "SteamPath").Output()
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
	out, err := hiddenCommand("tasklist", "/FI", "IMAGENAME eq steam.exe", "/NH").Output()
	if err != nil {
		return false
	}
	return strings.Contains(strings.ToLower(string(out)), "steam.exe")
}

// CloseSteam terminates steam.exe (and its child processes). It is a no-op if
// Steam is not running. Steam itself is designed to be killed safely.
func (a *App) CloseSteam() error {
	if !a.IsSteamRunning() {
		return nil
	}
	// /T kills child processes too; /F forces termination.
	err := hiddenCommand("taskkill", "/IM", "steam.exe", "/T", "/F").Run()
	if err != nil {
		return fmt.Errorf("could not close Steam: %w", err)
	}
	// Give the OS a moment to release file handles before any patching.
	time.Sleep(500 * time.Millisecond)
	return nil
}

// IsElevated reports whether the current process is running with administrator
// privileges, by running `net session` which only succeeds when elevated.
func (a *App) IsElevated() bool {
	// This avoids pulling in extra Windows API dependencies for a cheap check.
	return hiddenCommand("net", "session").Run() == nil
}

// RelaunchAsAdmin restarts the application with a UAC elevation prompt, then
// signals the current (non-elevated) instance to quit. Returns an error if the
// user declines the prompt or the relaunch fails (the current instance keeps
// running in that case).
func (a *App) RelaunchAsAdmin() error {
	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("cannot locate executable: %w", err)
	}

	// Start-Process -Verb RunAs triggers the UAC prompt. The path is wrapped in
	// a PowerShell single-quoted string; any embedded single quote is escaped by
	// doubling it (PowerShell's single-quote escape rule). If the user declines,
	// PowerShell exits non-zero and we surface that as an error.
	psPath := strings.ReplaceAll(exePath, "'", "''")
	cmd := hiddenCommand("powershell", "-NoProfile", "-Command",
		fmt.Sprintf("Start-Process -FilePath '%s' -Verb RunAs", psPath))
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("elevation was cancelled or failed")
	}

	// Elevated instance launched — quit this one so there aren't two windows.
	runtime.Quit(a.ctx)
	return nil
}

// ApplySteamPatch downloads SteamPatch.zip, extracts it into steamPath, runs
// the bundled cache cleaner, then deletes the cleaner. steamPath may be empty,
// in which case the detected/default path is used.
//
// It refuses to run while Steam is open. It writes only if the target folder is
// writable; if a write would require administrator rights it returns a
// NEEDS_ADMIN error so the UI can offer to relaunch elevated.
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

	// Only elevation-gate if we actually can't write to the Steam folder. Many
	// installs live outside Program Files and need no admin rights at all, so we
	// probe first and prompt for UAC only when the probe fails with permission.
	if err := canWriteDir(steamPath); err != nil {
		if os.IsPermission(err) {
			return fmt.Errorf("NEEDS_ADMIN: administrator rights are required to patch %q", steamPath)
		}
		return fmt.Errorf("cannot write to Steam folder: %w", err)
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
			return fmt.Errorf("NEEDS_ADMIN: administrator rights are required to patch %q", steamPath)
		}
		return fmt.Errorf("extracting patch: %w", err)
	}

	cleaner := filepath.Join(steamPath, cacheCleanerExe)
	if _, err := os.Stat(cleaner); err != nil {
		return fmt.Errorf("%s was not found after extraction", cacheCleanerExe)
	}

	a.emitSteam(false, "Running "+cacheCleanerExe+"…")
	cmd := hiddenCommand(cleaner)
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

// canWriteDir probes whether the current process can create files in dir by
// writing and removing a temporary file. Returns the underlying error (so
// callers can use os.IsPermission) or nil if writable.
func canWriteDir(dir string) error {
	f, err := os.CreateTemp(dir, ".luminstaller-write-probe-*")
	if err != nil {
		return err
	}
	name := f.Name()
	f.Close()
	return os.Remove(name)
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
