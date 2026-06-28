package main

import (
	"archive/zip"
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type AppConfig struct { SteamPath string `json:"steamPath"` }
type App struct { ctx context.Context }

func NewApp() *App                         { return &App{} }
func (a *App) startup(ctx context.Context) { a.ctx = ctx }

func (a *App) getConfigPath() string {
	localAppData := os.Getenv("LOCALAPPDATA")
	if localAppData == "" { localAppData = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Local") }
	return filepath.Join(localAppData, "LumInstaller", "config.json")
}

func (a *App) GetDefaultSteamPath() string { return "C:\\Program Files (x86)\\Steam" }

func (a *App) LoadConfig() string {
	configPath := a.getConfigPath()
	
	if _, err := os.Stat(configPath); os.IsNotExist(err) { return a.GetDefaultSteamPath() }

	file, err := os.ReadFile(configPath)
	if err != nil { return a.GetDefaultSteamPath() }

	var config AppConfig
	if err := json.Unmarshal(file, &config); err != nil { return a.GetDefaultSteamPath() }

	if strings.TrimSpace(config.SteamPath) == "" { return a.GetDefaultSteamPath() }

	return config.SteamPath
}

func (a *App) SaveConfig(path string) error {
	configPath := a.getConfigPath()
	configDir := filepath.Dir(configPath)

	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("failed to create config directory: %w", err)
	}

	config := AppConfig{SteamPath: path}
	file, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to parse configuration schema: %w", err)
	}

	if err := os.WriteFile(configPath, file, 0644); err != nil {
		return fmt.Errorf("failed to save configuration parameters: %w", err)
	}

	return nil
}

func (a *App) CheckFile(path string) bool {
	info, err := os.Stat(path)
	if os.IsNotExist(err) { return false }
	return !info.IsDir()
}

func (a *App) ForceClose(app string) error {
	cmd := exec.Command("taskkill", "/F", "/IM", app)
	_ = cmd.Run()
	return nil
}

func (a *App) SelectDirectory(text string) (string, error) {
	options := runtime.OpenDialogOptions{
		DefaultDirectory: "C:\\",
		Title:            text,
	}

	selectedDir, err := runtime.OpenDirectoryDialog(a.ctx, options)
	if (err != nil) {
		return "", fmt.Errorf("failed to open directory dialog: %w", err)
	}

	return selectedDir, nil
}

func (a *App) Install(link string, name string, dest string) error {
	downloadURL := link
	tmpZipPath := filepath.Join(os.TempDir(), name + ".zip")

	resp, err := http.Get(downloadURL)
	if err != nil { return fmt.Errorf("failed to connect to download server: %w", err) }
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK { return fmt.Errorf("server returned bad status: %s", resp.Status) }

	out, err := os.Create(tmpZipPath)
	if err != nil { return fmt.Errorf("failed to create temp file: %w", err) }
	defer func() {
		out.Close()
		_ = os.Remove(tmpZipPath)
	}()

	bufferedOut := bufio.NewWriter(out)
	_, err = io.Copy(bufferedOut, resp.Body)
	if err != nil {
		return fmt.Errorf("failed to save downloaded data: %w", err)
	}
	bufferedOut.Flush()
	out.Close()

	archive, err := zip.OpenReader(tmpZipPath)
	if err != nil { return fmt.Errorf("failed to open zip archive: %w", err) }
	defer archive.Close()

	cleanDest := filepath.Clean(dest)
	for _, file := range archive.File {
		filePath := filepath.Join(cleanDest, file.Name)

		if !strings.HasPrefix(filePath, cleanDest+string(filepath.Separator)) && filePath != cleanDest {
			return fmt.Errorf("illegal file path in zip archive: %s", file.Name)
		}
		
		if file.FileInfo().IsDir() {
			os.MkdirAll(filePath, os.ModePerm)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(filePath), os.ModePerm); err != nil { return err }

		dstFile, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
		if err != nil { return err }

		srcFile, err := file.Open()
		if err != nil {
			dstFile.Close()
			return err
		}

		_, err = io.Copy(dstFile, srcFile)
		dstFile.Close()
		srcFile.Close()
		if err != nil { return err }
	}

	return nil
}

func (a *App) Execute(app string) error {
	targetExe := filepath.Clean(app)
	
	if _, err := os.Stat(targetExe); os.IsNotExist(err) { return nil }

	cmd := exec.Command(targetExe)
	err := cmd.Run()
	if err != nil {
		return fmt.Errorf("failed to execute %s: %w", targetExe, err)
	}
	
	return nil
}

func (a *App) RenameFile(oldPath string, newPath string) error {
	cleanedOld := filepath.Clean(oldPath)
	cleanedNew := filepath.Clean(newPath)

	err := os.Rename(cleanedOld, cleanedNew)
	if err != nil {
		return fmt.Errorf("failed to rename file: %w", err)
	}
	return nil
}

func (a *App) DeleteFile(path string) error {
	cleanedPath := filepath.Clean(path)
	
	if _, err := os.Stat(cleanedPath); os.IsNotExist(err) { return nil }

	err := os.Remove(cleanedPath)
	if err != nil {
		return fmt.Errorf("failed to delete file at %s: %w", cleanedPath, err)
	}
	
	return nil
}

func (a *App) LaunchAndExit(app string) error {
	targetExe := filepath.Clean(app)
	cmd := exec.Command(targetExe)
	
	cmd.Dir = filepath.Dir(targetExe)

	err := cmd.Start()
	if err != nil {
		return fmt.Errorf("failed to launch %s: %w", targetExe, err)
	}
	
	runtime.Quit(a.ctx)
	return nil
}