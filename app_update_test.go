package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestFileSha256(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "f.bin")
	// "abc" has a well-known SHA-256.
	if err := os.WriteFile(p, []byte("abc"), 0o644); err != nil {
		t.Fatal(err)
	}
	const want = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
	got, err := fileSha256(p)
	if err != nil {
		t.Fatalf("fileSha256: %v", err)
	}
	if got != want {
		t.Errorf("fileSha256 = %q, want %q", got, want)
	}
}

func TestRequireHTTPS(t *testing.T) {
	if err := requireHTTPS("https://example.com/x.exe"); err != nil {
		t.Errorf("https should be allowed: %v", err)
	}
	if err := requireHTTPS("http://example.com/x.exe"); err == nil {
		t.Errorf("http should be rejected")
	}
	if err := requireHTTPS("file:///etc/passwd"); err == nil {
		t.Errorf("file scheme should be rejected")
	}
}
