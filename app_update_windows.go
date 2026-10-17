//go:build windows

package main

import (
	"fmt"
	"os"
	"path/filepath"
)

// swapAndRelaunch replaces oldExe with newExe and relaunches, after the current
// process exits. A running .exe can't overwrite itself on Windows, so we spawn
// a detached batch script that waits for this PID to die, swaps the files, then
// starts the new exe and deletes itself.
func swapAndRelaunch(oldExe, newExe string) error {
	pid := os.Getpid()

	script := fmt.Sprintf(`@echo off
rem Wait for the app (PID %d) to exit.
:waitloop
tasklist /FI "PID eq %d" 2>NUL | find "%d" >NUL
if not errorlevel 1 (
  timeout /t 1 /nobreak >NUL
  goto waitloop
)
rem Replace the executable, retrying briefly in case the handle lingers.
set /a tries=0
:copyloop
copy /Y "%s" "%s" >NUL
if errorlevel 1 (
  set /a tries+=1
  if %%tries%% LSS 10 (
    timeout /t 1 /nobreak >NUL
    goto copyloop
  )
)
del /Q "%s" >NUL 2>&1
start "" "%s"
del /Q "%%~f0" >NUL 2>&1
`, pid, pid, pid, newExe, oldExe, newExe, oldExe)

	scriptPath := filepath.Join(os.TempDir(), "LumInstaller-update.bat")
	if err := os.WriteFile(scriptPath, []byte(script), 0o644); err != nil {
		return err
	}

	// Launch the updater detached and hidden so it survives our exit.
	cmd := hiddenCommand("cmd", "/C", scriptPath)
	return cmd.Start()
}
