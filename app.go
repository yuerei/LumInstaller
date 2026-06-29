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
	"golang.org/x/sys/windows/registry"
)

type App struct { 
	ctx context.Context 
}

type AppConfig struct { 
	Luma      bool   `json:"luma"`
	SteamPath string `json:"steamPath"`
}

const defaultSteamPath = "C:\\Program Files (x86)\\Steam"

func NewApp() *App { 
	return &App{}
}

func (a *App) getConfigPath() string {
	localAppData := os.Getenv("LOCALAPPDATA")
	if localAppData == "" { localAppData = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Local") }
	return filepath.Join(localAppData, "LumInstaller", "config.json")
}

func (a *App) startup(ctx context.Context) { 
	a.ctx = ctx
}

func (a *App) shutdown(ctx context.Context) {}

func (a *App) LoadConfig() AppConfig {
	configPath := a.getConfigPath()
	
	if _, err := os.Stat(configPath); os.IsNotExist(err) {  return AppConfig{Luma: false, SteamPath: defaultSteamPath} }

	data, err := os.ReadFile(configPath)
	if err != nil { return AppConfig{Luma: false, SteamPath: defaultSteamPath} }

	var config AppConfig
	if err := json.Unmarshal(data, &config); err != nil { return AppConfig{Luma: false, SteamPath: defaultSteamPath} }

	config.SteamPath = filepath.Clean(config.SteamPath)
	return config
}

func (a *App) SaveConfig(config AppConfig) error {
	configPath := a.getConfigPath()
	
	if err := os.MkdirAll(filepath.Dir(configPath), 0755); err != nil { return fmt.Errorf("failed creating application configuration directory hierarchy: %w", err)}

	config.SteamPath = filepath.Clean(config.SteamPath)
	data, err := json.MarshalIndent(config, "", "  ")
	if err != nil { return fmt.Errorf("failed encoding configuration payload into JSON structure: %w", err) }

	if err := os.WriteFile(configPath, data, 0644); err != nil { return fmt.Errorf("failed writing config down to atomic disk block: %w", err) }

	return nil
}

func (a *App) CheckFile(path string) bool {
	info, err := os.Stat(path)
	if os.IsNotExist(err) { return false }
	return !info.IsDir()
}

func (a *App) ForceClose(app string) error {
	cmd := exec.Command("taskkill", "/F", "/IM", app)
	err := cmd.Run()
	if err != nil {
		if exitError, ok := err.(*exec.ExitError); ok {
			if exitError.ExitCode() == 128 { return nil }
		}
		return fmt.Errorf("could not close %s: %w", app, err)
	}
	return nil
}

func (a *App) DetectSteamPath() string {
	k, err := registry.OpenKey(registry.CURRENT_USER, `Software\Valve\Steam`, registry.QUERY_VALUE)
	if err != nil { return "" }
	defer k.Close()

	steamPath, _, err := k.GetStringValue("SteamPath")
	if err != nil { return "" }
	
	return filepath.Clean(steamPath)
}

func (a *App) SelectDirectory(text string) (string, error) {
	options := runtime.OpenDialogOptions{
		DefaultDirectory: "C:\\",
		Title:            text,
	}
	selectedDir, err := runtime.OpenDirectoryDialog(a.ctx, options)
	if (err != nil) { return "", fmt.Errorf("failed to open directory dialog: %w", err) }

	return selectedDir, nil
}

func (a *App) Install(link string, name string, dest string) error {
	runtime.EventsEmit(a.ctx, "install_status", "Downloading assets...")

	req, err := http.NewRequestWithContext(a.ctx, "GET", link, nil)
    if err != nil { return fmt.Errorf("failed to create request: %w", err) }

	client := &http.Client{}
    resp, err := client.Do(req)

	tmpZipPath := filepath.Join(os.TempDir(), name + ".zip")

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

	runtime.EventsEmit(a.ctx, "install_status", "Extracting files...")

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

		err = func() error {
			dstFile, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, file.Mode())
			if err != nil { return err }
			defer dstFile.Close()

			srcFile, err := file.Open()
			if err != nil { return err }
			defer srcFile.Close()

			_, err = io.Copy(dstFile, srcFile)
			return err
		}()

		if err != nil { return fmt.Errorf("failed to extract file %s: %w", file.Name, err) }
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

func (a *App) DownloadAndExtractMod(url string, targetDir string) error {
	tempFile, err := os.CreateTemp("", "mod-*.zip")
	if err != nil {
		return fmt.Errorf("failed to create temp file: %v", err)
	}
	defer os.Remove(tempFile.Name())
	defer tempFile.Close()

	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to download mod: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("bad status: %s", resp.Status)
	}

	_, err = io.Copy(tempFile, resp.Body)
	if err != nil {
		return fmt.Errorf("failed to write to temp file: %v", err)
	}

	// 3. Extract the zip file
	archive, err := zip.OpenReader(tempFile.Name())
	if err != nil {
		return fmt.Errorf("failed to open zip archive: %v", err)
	}
	defer archive.Close()

	for _, f := range archive.File {
		filePath := filepath.Join(targetDir, f.Name)

		// Prevent Zip Slip vulnerability
		if !strings.HasPrefix(filePath, filepath.Clean(targetDir)+string(os.PathSeparator)) {
			return fmt.Errorf("invalid file path: %s", filePath)
		}

		if f.FileInfo().IsDir() {
			os.MkdirAll(filePath, os.ModePerm)
			continue
		}

		if err := os.MkdirAll(filepath.Dir(filePath), os.ModePerm); err != nil {
			return err
		}

		dstFile, err := os.OpenFile(filePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, f.Mode())
		if err != nil {
			return err
		}

		srcFile, err := f.Open()
		if err != nil {
			dstFile.Close()
			return err
		}

		_, err = io.Copy(dstFile, srcFile)
		dstFile.Close()
		srcFile.Close()
		if err != nil {
			return err
		}
	}

	return nil
}