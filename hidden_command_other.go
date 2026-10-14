//go:build !windows

package main

import "os/exec"

// hiddenCommand on non-Windows platforms is a plain exec.Command; there is no
// console window to hide.
func hiddenCommand(name string, args ...string) *exec.Cmd {
	return exec.Command(name, args...)
}
