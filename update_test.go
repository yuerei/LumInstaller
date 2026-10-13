package main

import "testing"

func TestCompareSemver(t *testing.T) {
	cases := []struct {
		a, b string
		want int
	}{
		{"0.2.0", "0.1.0", 1},
		{"0.1.0", "0.2.0", -1},
		{"1.0.0", "1.0.0", 0},
		{"v1.2.3", "1.2.3", 0},
		{"1.10.0", "1.9.0", 1}, // numeric, not lexical
		{"1.0.1", "1.0.0", 1},
		{"2.0.0", "1.9.9", 1},
		{"1.2.0-beta", "1.2.0", 0}, // pre-release suffix ignored
		{"0.1.0", "0.1", 0},        // missing patch treated as 0
	}
	for _, c := range cases {
		if got := compareSemver(c.a, c.b); got != c.want {
			t.Errorf("compareSemver(%q,%q)=%d, want %d", c.a, c.b, got, c.want)
		}
	}
}

func TestNormalizeVersion(t *testing.T) {
	if got := normalizeVersion("  v1.2.3 "); got != "1.2.3" {
		t.Errorf("normalizeVersion = %q, want 1.2.3", got)
	}
}
