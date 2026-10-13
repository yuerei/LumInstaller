package main

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// InstallProgress is emitted on "install:progress" while a modpack is being
// extracted into a PrismLauncher instance.
type InstallProgress struct {
	ModID     string  `json:"modId"`
	Extracted int     `json:"extracted"`
	Total     int     `json:"total"`
	Percent   float64 `json:"percent"`
	Done      bool    `json:"done"`
	Message   string  `json:"message"`
}

// serverOnlyFiles are files/dirs that only make sense for a dedicated server.
// They are harmless but cluttering in a client instance, so we skip them.
// Keys are matched case-insensitively against the entry's root path element.
var serverOnlyFiles = map[string]bool{
	"server.properties": true,
	"for servers only - set these in server.properties.txt": true,
	"eula.txt":            true,
	"start.bat":           true,
	"start.sh":            true,
	"server-icon.png":     true,
	"ops.json":            true,
	"whitelist.json":      true,
	"banned-ips.json":     true,
	"banned-players.json": true,
	"usercache.json":      true,
}

func isServerOnly(name string) bool {
	// Only consider top-level files (no path separator) for server-only pruning,
	// so we don't accidentally drop a legitimately-named file deep in config/.
	if strings.ContainsAny(name, "/\\") {
		return false
	}
	return serverOnlyFiles[strings.ToLower(name)]
}

// InstallMinecraftPack turns a downloaded CurseForge/server-pack zip into a
// usable PrismLauncher instance:
//
//	instances/<instanceName>/
//	├── instance.cfg
//	├── mmc-pack.json        (pins Minecraft + Forge)
//	└── .minecraft/          (the extracted pack contents)
//
// The source zip is deleted on success. mcVersion and forgeVersion pin the
// instance's components; if forgeVersion is empty, only Minecraft is pinned.
func (a *App) InstallMinecraftPack(modID, zipPath, instanceName, mcVersion, forgeVersion string) error {
	instanceName = strings.TrimSpace(instanceName)
	if instanceName == "" {
		return fmt.Errorf("instance name is required")
	}
	if strings.ContainsAny(instanceName, `/\:*?"<>|`) {
		return fmt.Errorf("instance name contains invalid characters")
	}
	if strings.TrimSpace(mcVersion) == "" {
		return fmt.Errorf("minecraft version is required")
	}

	prism, err := prismDir()
	if err != nil {
		return err
	}

	instanceDir := filepath.Join(prism, "instances", instanceName)
	mcDir := filepath.Join(instanceDir, ".minecraft")
	if err := os.MkdirAll(mcDir, 0o755); err != nil {
		return fmt.Errorf("cannot create instance folder: %w", err)
	}

	if err := a.extractZip(modID, zipPath, mcDir); err != nil {
		return err
	}

	if err := writeInstanceCfg(instanceDir, instanceName); err != nil {
		return fmt.Errorf("writing instance.cfg: %w", err)
	}
	if err := writeMMCPack(instanceDir, mcVersion, forgeVersion); err != nil {
		return fmt.Errorf("writing mmc-pack.json: %w", err)
	}

	// Clean up the source zip now that extraction succeeded.
	if err := os.Remove(zipPath); err != nil && !os.IsNotExist(err) {
		// Non-fatal: the instance is already usable.
		runtime.LogWarningf(a.ctx, "could not delete source zip: %v", err)
	}

	a.emitInstall(modID, 1, 1, true, "Instance ready")
	return nil
}

// extractZip safely unpacks src into destDir, guarding against zip-slip and
// skipping server-only files. Emits "install:progress" as it goes.
func (a *App) extractZip(modID, src, destDir string) error {
	r, err := zip.OpenReader(src)
	if err != nil {
		return fmt.Errorf("cannot open archive: %w", err)
	}
	defer r.Close()

	// Resolve destDir to an absolute, cleaned path for the containment check.
	destAbs, err := filepath.Abs(destDir)
	if err != nil {
		return fmt.Errorf("cannot resolve destination: %w", err)
	}

	total := len(r.File)
	lastEmit := time.Now()
	for i, f := range r.File {
		if isServerOnly(f.Name) {
			continue
		}

		// Zip-slip guard: the resolved target must stay inside destDir.
		target := filepath.Join(destAbs, filepath.FromSlash(f.Name))
		if target != destAbs && !strings.HasPrefix(target, destAbs+string(os.PathSeparator)) {
			return fmt.Errorf("illegal path in archive: %q", f.Name)
		}

		if f.FileInfo().IsDir() {
			if err := os.MkdirAll(target, 0o755); err != nil {
				return fmt.Errorf("mkdir %q: %w", f.Name, err)
			}
			continue
		}

		if err := extractFile(f, target); err != nil {
			return err
		}

		if time.Since(lastEmit) > 100*time.Millisecond {
			a.emitInstall(modID, i+1, total, false, "Extracting…")
			lastEmit = time.Now()
		}
	}
	a.emitInstall(modID, total, total, false, "Writing instance metadata…")
	return nil
}

// extractFile writes a single zip entry to target, creating parent dirs.
func extractFile(f *zip.File, target string) error {
	if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
		return fmt.Errorf("mkdir for %q: %w", f.Name, err)
	}

	rc, err := f.Open()
	if err != nil {
		return fmt.Errorf("open %q in archive: %w", f.Name, err)
	}
	defer rc.Close()

	out, err := os.OpenFile(target, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode()|0o200)
	if err != nil {
		return fmt.Errorf("create %q: %w", target, err)
	}
	defer out.Close()

	// Limit copy to the entry's declared uncompressed size (+ small slack) to
	// defend against decompression bombs with lying headers.
	limit := int64(f.UncompressedSize64) + 1<<20
	if _, err := io.CopyN(out, rc, limit); err != nil && err != io.EOF {
		return fmt.Errorf("extracting %q: %w", f.Name, err)
	}
	return nil
}

// writeInstanceCfg writes a minimal PrismLauncher instance.cfg.
func writeInstanceCfg(instanceDir, name string) error {
	cfg := "InstanceType=OneSix\n" +
		"name=" + name + "\n" +
		"iconKey=default\n"
	return os.WriteFile(filepath.Join(instanceDir, "instance.cfg"), []byte(cfg), 0o644)
}

// mmcComponent is one entry in mmc-pack.json's component list.
type mmcComponent struct {
	UID            string `json:"uid"`
	Version        string `json:"version"`
	Important      bool   `json:"important,omitempty"`
	CachedName     string `json:"cachedName,omitempty"`
	CachedVersion  string `json:"cachedVersion,omitempty"`
	DependencyOnly bool   `json:"dependencyOnly,omitempty"`
}

type mmcPack struct {
	Components    []mmcComponent `json:"components"`
	FormatVersion int            `json:"formatVersion"`
}

// writeMMCPack writes mmc-pack.json pinning Minecraft and (optionally) Forge.
// PrismLauncher resolves the exact artifacts from these UIDs/versions.
func writeMMCPack(instanceDir, mcVersion, forgeVersion string) error {
	components := []mmcComponent{
		{
			UID:        "net.minecraft",
			Version:    mcVersion,
			Important:  true,
			CachedName: "Minecraft",
		},
	}
	if strings.TrimSpace(forgeVersion) != "" {
		components = append(components, mmcComponent{
			UID:        "net.minecraftforge",
			Version:    forgeVersion,
			CachedName: "Forge",
		})
	}

	pack := mmcPack{
		Components:    components,
		FormatVersion: 1,
	}
	data, err := json.MarshalIndent(pack, "", "    ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(instanceDir, "mmc-pack.json"), data, 0o644)
}

func (a *App) emitInstall(modID string, extracted, total int, done bool, msg string) {
	if a.ctx == nil {
		return
	}
	var percent float64
	if total > 0 {
		percent = float64(extracted) / float64(total) * 100
	}
	runtime.EventsEmit(a.ctx, "install:progress", InstallProgress{
		ModID:     modID,
		Extracted: extracted,
		Total:     total,
		Percent:   percent,
		Done:      done,
		Message:   msg,
	})
}
