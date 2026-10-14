//go:build windows

package main

import (
	"os/exec"
	"syscall"
)

// CREATE_NO_WINDOW prevents the spawned console process from showing a window.
const createNoWindow = 0x08000000

// hiddenCommand builds an *exec.Cmd that runs without flashing a console window.
// Used for all the helper CLI tools we shell out to on Windows.
func hiddenCommand(name string, args ...string) *exec.Cmd {
	cmd := exec.Command(name, args...)
	cmd.SysProcAttr = &syscall.SysProcAttr{
		HideWindow:    true,
		CreationFlags: createNoWindow,
	}
	return cmd
}
