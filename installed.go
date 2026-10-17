package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// InstalledMod is a persisted record of something the user installed, so the
// app can reflect installed state across restarts.
type InstalledMod struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Game         string `json:"game"`
	Version      string `json:"version,omitempty"`
	Loader       string `json:"loader,omitempty"`
	Minecraft    string `json:"minecraft,omitempty"`
	InstanceName string `json:"instanceName,omitempty"`
	// Path is the install location (instance dir for modpacks, else the folder).
	Path string `json:"path,omitempty"`
	// InstalledAt is an RFC3339 timestamp of the last successful install.
	InstalledAt string `json:"installedAt"`
}

// installedStore guards concurrent access to installed.json.
var installedStore sync.Mutex

func installedPath() (string, error) {
	dir, err := appDataDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "installed.json"), nil
}

// GetInstalledMods returns all persisted install records (empty slice if none).
func (a *App) GetInstalledMods() ([]InstalledMod, error) {
	installedStore.Lock()
	defer installedStore.Unlock()
	return readInstalled()
}

// readInstalled loads the records without locking (callers hold the lock).
func readInstalled() ([]InstalledMod, error) {
	path, err := installedPath()
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []InstalledMod{}, nil
		}
		return nil, err
	}
	var mods []InstalledMod
	if err := json.Unmarshal(data, &mods); err != nil {
		// A corrupt file shouldn't brick the app; start fresh.
		return []InstalledMod{}, nil
	}
	if mods == nil {
		mods = []InstalledMod{}
	}
	return mods, nil
}

// writeInstalled persists records atomically (write temp + rename).
func writeInstalled(mods []InstalledMod) error {
	path, err := installedPath()
	if err != nil {
		return err
	}
	data, err := json.MarshalIndent(mods, "", "  ")
	if err != nil {
		return err
	}
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

// recordInstall inserts or updates a record (keyed by id) and persists it.
func (a *App) recordInstall(rec InstalledMod) error {
	installedStore.Lock()
	defer installedStore.Unlock()

	mods, err := readInstalled()
	if err != nil {
		return err
	}
	rec.InstalledAt = time.Now().UTC().Format(time.RFC3339)

	replaced := false
	for i := range mods {
		if mods[i].ID == rec.ID {
			mods[i] = rec
			replaced = true
			break
		}
	}
	if !replaced {
		mods = append(mods, rec)
	}
	return writeInstalled(mods)
}

// RecordInstalledMod persists an install record from the frontend after a
// successful install/download. All fields except id are optional metadata.
func (a *App) RecordInstalledMod(id, name, game, version, loader, minecraft, instanceName, path string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("id is required")
	}
	return a.recordInstall(InstalledMod{
		ID:           id,
		Name:         name,
		Game:         game,
		Version:      version,
		Loader:       loader,
		Minecraft:    minecraft,
		InstanceName: instanceName,
		Path:         path,
	})
}

// RemoveInstalled deletes a record by id (no error if it wasn't present).
func (a *App) RemoveInstalled(id string) error {
	installedStore.Lock()
	defer installedStore.Unlock()

	mods, err := readInstalled()
	if err != nil {
		return err
	}
	out := mods[:0]
	for _, m := range mods {
		if m.ID != id {
			out = append(out, m)
		}
	}
	return writeInstalled(out)
}

// InstanceExists reports whether a PrismLauncher instance folder already exists
// for the given instance name inside instancesRoot. Used to warn before an
// overwrite. instancesRoot is the user's chosen Minecraft folder.
func (a *App) InstanceExists(instancesRoot, instanceName string) bool {
	instanceName = strings.TrimSpace(instanceName)
	if instancesRoot == "" || instanceName == "" {
		return false
	}
	info, err := os.Stat(filepath.Join(instancesRoot, instanceName))
	return err == nil && info.IsDir()
}

// ClearInstalled removes all install records (used for testing / reset).
func (a *App) ClearInstalled() error {
	installedStore.Lock()
	defer installedStore.Unlock()
	return writeInstalled([]InstalledMod{})
}

// ReconcileInstalled drops records whose on-disk install location no longer
// exists (e.g. the user deleted the instance in their launcher). It returns the
// surviving records. Records with an empty Path are kept, since we have no path
// to verify against (e.g. older records or plain downloads without a tracked
// location). Called on app launch so the catalog reflects reality.
func (a *App) ReconcileInstalled() ([]InstalledMod, error) {
	installedStore.Lock()
	defer installedStore.Unlock()

	mods, err := readInstalled()
	if err != nil {
		return nil, err
	}

	kept := make([]InstalledMod, 0, len(mods))
	changed := false
	for _, m := range mods {
		if m.Path == "" {
			kept = append(kept, m) // nothing to verify; keep it
			continue
		}
		if info, statErr := os.Stat(m.Path); statErr == nil && info.IsDir() {
			kept = append(kept, m) // still present
		} else {
			changed = true // folder gone -> prune
		}
	}

	if changed {
		if err := writeInstalled(kept); err != nil {
			return nil, err
		}
	}
	return kept, nil
}
