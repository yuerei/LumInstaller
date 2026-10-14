package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultGameFolder_PrefersElyWhenPresent(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("APPDATA", tmp)

	ely := filepath.Join(tmp, "ElyPrismLauncher", "instances")
	if err := os.MkdirAll(ely, 0o755); err != nil {
		t.Fatal(err)
	}

	app := &App{}
	got, err := app.DefaultGameFolder("Minecraft")
	if err != nil {
		t.Fatalf("DefaultGameFolder: %v", err)
	}
	if got != ely {
		t.Errorf("expected Ely instances %q, got %q", ely, got)
	}
}

func TestDefaultGameFolder_PrefersPrismOverFallbackWhenElyAbsent(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("APPDATA", tmp)

	prism := filepath.Join(tmp, "PrismLauncher", "instances")
	if err := os.MkdirAll(prism, 0o755); err != nil {
		t.Fatal(err)
	}

	app := &App{}
	got, err := app.DefaultGameFolder("Minecraft")
	if err != nil {
		t.Fatalf("DefaultGameFolder: %v", err)
	}
	if got != prism {
		t.Errorf("expected Prism instances %q, got %q", prism, got)
	}
}

func TestDefaultGameFolder_FallsBackToPrismWhenNeitherExists(t *testing.T) {
	tmp := t.TempDir()
	t.Setenv("APPDATA", tmp)

	app := &App{}
	got, err := app.DefaultGameFolder("Minecraft")
	if err != nil {
		t.Fatalf("DefaultGameFolder: %v", err)
	}
	want := filepath.Join(tmp, "PrismLauncher", "instances")
	if got != want {
		t.Errorf("expected fallback %q, got %q", want, got)
	}
	// Fallback must be created.
	if info, err := os.Stat(got); err != nil || !info.IsDir() {
		t.Errorf("fallback folder was not created: %v", err)
	}
}

func TestDefaultGameFolder_UnknownGame(t *testing.T) {
	app := &App{}
	got, err := app.DefaultGameFolder("GTA V")
	if err != nil {
		t.Fatalf("DefaultGameFolder: %v", err)
	}
	if got != "" {
		t.Errorf("expected empty default for unknown game, got %q", got)
	}
}
