//go:build !windows

package main

import "fmt"

// swapAndRelaunch is only implemented for Windows (the only release target).
func swapAndRelaunch(_, _ string) error {
	return fmt.Errorf("self-update is only supported on Windows")
}
