package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestInstalledStore_RecordGetRemove(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("APPDATA", tmp)

	app := &App{}

	// Empty to start.
	mods, err := app.GetInstalledMods()
	if err != nil {
		t.Fatalf("GetInstalledMods: %v", err)
	}
	if len(mods) != 0 {
		t.Fatalf("expected 0 records, got %d", len(mods))
	}

	// Record one.
	if err := app.RecordInstalledMod("rlcraft", "RLCraft", "Minecraft", "2.9.3", "forge", "1.12.2", "RLCraft", `C:\inst\RLCraft`); err != nil {
		t.Fatalf("RecordInstalledMod: %v", err)
	}
	mods, _ = app.GetInstalledMods()
	if len(mods) != 1 || mods[0].ID != "rlcraft" || mods[0].Version != "2.9.3" {
		t.Fatalf("unexpected records: %+v", mods)
	}
	if mods[0].InstalledAt == "" {
		t.Errorf("InstalledAt was not set")
	}

	// Re-record same id updates in place (no duplicate).
	if err := app.RecordInstalledMod("rlcraft", "RLCraft", "Minecraft", "2.9.4", "forge", "1.12.2", "RLCraft", `C:\inst\RLCraft`); err != nil {
		t.Fatalf("re-record: %v", err)
	}
	mods, _ = app.GetInstalledMods()
	if len(mods) != 1 || mods[0].Version != "2.9.4" {
		t.Fatalf("expected single updated record, got: %+v", mods)
	}

	// Remove.
	if err := app.RemoveInstalled("rlcraft"); err != nil {
		t.Fatalf("RemoveInstalled: %v", err)
	}
	mods, _ = app.GetInstalledMods()
	if len(mods) != 0 {
		t.Fatalf("expected 0 after remove, got %d", len(mods))
	}

	// Removing a missing id is a no-op (no error).
	if err := app.RemoveInstalled("nope"); err != nil {
		t.Errorf("RemoveInstalled(missing): %v", err)
	}
}

func TestInstalledStore_RequiresID(t *testing.T) {
	t.Setenv("APPDATA", t.TempDir())
	app := &App{}
	if err := app.RecordInstalledMod("  ", "x", "g", "", "", "", "", ""); err == nil {
		t.Errorf("expected error for empty id")
	}
}

func TestInstanceExists(t *testing.T) {
	tmp := t.TempDir()
	app := &App{}

	if app.InstanceExists(tmp, "RLCraft") {
		t.Errorf("should not exist yet")
	}
	if err := os.MkdirAll(filepath.Join(tmp, "RLCraft"), 0o755); err != nil {
		t.Fatal(err)
	}
	if !app.InstanceExists(tmp, "RLCraft") {
		t.Errorf("should exist after mkdir")
	}
	// Empty inputs are not an existing instance.
	if app.InstanceExists("", "RLCraft") || app.InstanceExists(tmp, "") {
		t.Errorf("empty inputs should report false")
	}
}

func TestInstalledStore_CorruptFileRecovers(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("APPDATA", tmp)
	// Write garbage to installed.json.
	dir := filepath.Join(tmp, "LumInstaller")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "installed.json"), []byte("{not json"), 0o644); err != nil {
		t.Fatal(err)
	}
	app := &App{}
	mods, err := app.GetInstalledMods()
	if err != nil {
		t.Fatalf("GetInstalledMods on corrupt file: %v", err)
	}
	if len(mods) != 0 {
		t.Errorf("corrupt file should yield empty, got %d", len(mods))
	}
}

func TestReconcileInstalled_PrunesMissingPaths(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("APPDATA", tmp)
	app := &App{}

	// One record whose path exists, one whose path is gone, one with no path.
	existing := filepath.Join(tmp, "instances", "RLCraft")
	if err := os.MkdirAll(existing, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := app.RecordInstalledMod("rlcraft", "RLCraft", "Minecraft", "2.9.3", "forge", "1.12.2", "RLCraft", existing); err != nil {
		t.Fatal(err)
	}
	if err := app.RecordInstalledMod("gone", "Gone", "Minecraft", "1.0", "forge", "1.20.1", "Gone", filepath.Join(tmp, "instances", "Gone")); err != nil {
		t.Fatal(err)
	}
	if err := app.RecordInstalledMod("nopath", "NoPath", "GTA V", "1.0", "", "", "", ""); err != nil {
		t.Fatal(err)
	}

	kept, err := app.ReconcileInstalled()
	if err != nil {
		t.Fatalf("ReconcileInstalled: %v", err)
	}

	ids := map[string]bool{}
	for _, m := range kept {
		ids[m.ID] = true
	}
	if !ids["rlcraft"] {
		t.Errorf("existing-path record should survive")
	}
	if ids["gone"] {
		t.Errorf("missing-path record should be pruned")
	}
	if !ids["nopath"] {
		t.Errorf("empty-path record should be kept (nothing to verify)")
	}

	// The prune must be persisted.
	after, _ := app.GetInstalledMods()
	if len(after) != 2 {
		t.Errorf("expected 2 persisted after reconcile, got %d", len(after))
	}
}
