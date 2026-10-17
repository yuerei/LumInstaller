package main

import (
	"archive/zip"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// makeZip builds a zip at path from a name->content map.
func makeZip(t *testing.T, path string, entries map[string]string) {
	t.Helper()
	f, err := os.Create(path)
	if err != nil {
		t.Fatalf("create zip: %v", err)
	}
	defer f.Close()
	zw := zip.NewWriter(f)
	for name, content := range entries {
		w, err := zw.Create(name)
		if err != nil {
			t.Fatalf("zip create entry %q: %v", name, err)
		}
		if _, err := w.Write([]byte(content)); err != nil {
			t.Fatalf("zip write %q: %v", name, err)
		}
	}
	if err := zw.Close(); err != nil {
		t.Fatalf("zip close: %v", err)
	}
}

func TestExtractZip_ExtractsAndStripsServerFiles(t *testing.T) {
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "pack.zip")
	makeZip(t, zipPath, map[string]string{
		"mods/example.jar":  "jarbytes",
		"config/foo.cfg":    "cfg",
		"server.properties": "should-be-skipped",
		"eula.txt":          "should-be-skipped",
		"options.txt":       "keep-me",
	})

	dest := filepath.Join(dir, ".minecraft")
	app := &App{}
	if err := app.extractZip("test", zipPath, dest); err != nil {
		t.Fatalf("extractZip: %v", err)
	}

	// Kept files exist.
	for _, p := range []string{"mods/example.jar", "config/foo.cfg", "options.txt"} {
		if _, err := os.Stat(filepath.Join(dest, filepath.FromSlash(p))); err != nil {
			t.Errorf("expected %q to be extracted: %v", p, err)
		}
	}
	// Server-only files stripped.
	for _, p := range []string{"server.properties", "eula.txt"} {
		if _, err := os.Stat(filepath.Join(dest, p)); !os.IsNotExist(err) {
			t.Errorf("expected server-only %q to be skipped", p)
		}
	}
}

func TestExtractZip_RejectsZipSlip(t *testing.T) {
	dir := t.TempDir()
	zipPath := filepath.Join(dir, "evil.zip")
	// A path-traversal entry.
	makeZip(t, zipPath, map[string]string{
		"../escape.txt": "pwned",
	})

	dest := filepath.Join(dir, ".minecraft")
	app := &App{}
	err := app.extractZip("test", zipPath, dest)
	if err == nil || !strings.Contains(err.Error(), "illegal path") {
		t.Fatalf("expected zip-slip rejection, got: %v", err)
	}
	// Ensure nothing escaped.
	if _, serr := os.Stat(filepath.Join(dir, "escape.txt")); !os.IsNotExist(serr) {
		t.Errorf("zip-slip wrote outside destination")
	}
}

func TestWriteMMCPack_PinsMinecraftAndForge(t *testing.T) {
	dir := t.TempDir()
	if err := writeMMCPack(dir, "1.12.2", "forge", "14.23.5.2860"); err != nil {
		t.Fatalf("writeMMCPack: %v", err)
	}
	data, err := os.ReadFile(filepath.Join(dir, "mmc-pack.json"))
	if err != nil {
		t.Fatalf("read mmc-pack.json: %v", err)
	}
	s := string(data)
	for _, want := range []string{"net.minecraft", "1.12.2", "net.minecraftforge", "14.23.5.2860"} {
		if !strings.Contains(s, want) {
			t.Errorf("mmc-pack.json missing %q; got:\n%s", want, s)
		}
	}
	if strings.Contains(s, "fabric") {
		t.Errorf("forge pack should not reference fabric; got:\n%s", s)
	}
}

func TestWriteMMCPack_PinsFabric(t *testing.T) {
	dir := t.TempDir()
	if err := writeMMCPack(dir, "1.20.1", "fabric", "0.16.9"); err != nil {
		t.Fatalf("writeMMCPack: %v", err)
	}
	data, err := os.ReadFile(filepath.Join(dir, "mmc-pack.json"))
	if err != nil {
		t.Fatalf("read mmc-pack.json: %v", err)
	}
	s := string(data)
	// Fabric needs loader + intermediary (pinned to MC version), no Forge.
	for _, want := range []string{
		"net.minecraft", "1.20.1",
		"net.fabricmc.fabric-loader", "0.16.9",
		"net.fabricmc.intermediary",
	} {
		if !strings.Contains(s, want) {
			t.Errorf("mmc-pack.json missing %q; got:\n%s", want, s)
		}
	}
	if strings.Contains(s, "net.minecraftforge") {
		t.Errorf("fabric pack should not reference forge; got:\n%s", s)
	}
}

func TestWriteMMCPack_DefaultsToForge(t *testing.T) {
	dir := t.TempDir()
	// Empty loader string should be treated as forge.
	if err := writeMMCPack(dir, "1.12.2", "", "14.23.5.2860"); err != nil {
		t.Fatalf("writeMMCPack: %v", err)
	}
	data, _ := os.ReadFile(filepath.Join(dir, "mmc-pack.json"))
	if !strings.Contains(string(data), "net.minecraftforge") {
		t.Errorf("empty loader should default to forge; got:\n%s", string(data))
	}
}

func TestWriteMMCPack_VanillaWhenNoLoaderVersion(t *testing.T) {
	dir := t.TempDir()
	if err := writeMMCPack(dir, "1.20.1", "fabric", ""); err != nil {
		t.Fatalf("writeMMCPack: %v", err)
	}
	data, _ := os.ReadFile(filepath.Join(dir, "mmc-pack.json"))
	s := string(data)
	if strings.Contains(s, "fabric") || strings.Contains(s, "forge") {
		t.Errorf("no loader version should produce a vanilla pack; got:\n%s", s)
	}
}

func TestWriteInstanceCfg(t *testing.T) {
	dir := t.TempDir()
	if err := writeInstanceCfg(dir, "RLCraft"); err != nil {
		t.Fatalf("writeInstanceCfg: %v", err)
	}
	data, err := os.ReadFile(filepath.Join(dir, "instance.cfg"))
	if err != nil {
		t.Fatalf("read instance.cfg: %v", err)
	}
	if !strings.Contains(string(data), "name=RLCraft") {
		t.Errorf("instance.cfg missing name; got:\n%s", string(data))
	}
}
