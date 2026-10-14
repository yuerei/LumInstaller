package main

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"
)

// AppVersion is the current application version (semver, no leading "v").
// Keep this in sync with the version shown in the UI and your release tags.
const AppVersion = "2.1.1"

// releasesAPIURL is the GitHub API endpoint for the latest published release
// of the app repository.
const releasesAPIURL = "https://api.github.com/repos/yuerei/LumInstaller/releases/latest"

// UpdateInfo describes the result of an update check.
type UpdateInfo struct {
	// Available is true when a newer release than AppVersion exists.
	Available bool `json:"available"`
	// Current is the running version.
	Current string `json:"current"`
	// Latest is the latest release version (empty if the check failed).
	Latest string `json:"latest"`
	// URL is the human-facing release page to open in a browser.
	URL string `json:"url"`
	// Notes is the release body/changelog (may be empty).
	Notes string `json:"notes"`
}

// githubRelease is the subset of the GitHub release payload we care about.
type githubRelease struct {
	TagName    string `json:"tag_name"`
	HTMLURL    string `json:"html_url"`
	Body       string `json:"body"`
	Draft      bool   `json:"draft"`
	Prerelease bool   `json:"prerelease"`
}

// CheckForUpdate queries GitHub for the latest release and compares it to the
// running version. Network/parse failures return a non-error UpdateInfo with
// Available=false so the UI can simply show nothing.
func (a *App) CheckForUpdate() (UpdateInfo, error) {
	info := UpdateInfo{Current: AppVersion}

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequestWithContext(a.ctx, http.MethodGet, releasesAPIURL, nil)
	if err != nil {
		return info, nil
	}
	// GitHub recommends setting these headers.
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "LumInstaller")

	resp, err := client.Do(req)
	if err != nil {
		return info, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// 404 = no releases yet; anything else = transient. Either way, no update.
		return info, nil
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return info, nil
	}

	var rel githubRelease
	if err := json.Unmarshal(body, &rel); err != nil {
		return info, nil
	}
	if rel.Draft || rel.Prerelease {
		return info, nil
	}

	latest := normalizeVersion(rel.TagName)
	info.Latest = latest
	info.URL = rel.HTMLURL
	info.Notes = rel.Body
	info.Available = compareSemver(latest, AppVersion) > 0
	return info, nil
}

// normalizeVersion strips a leading "v" and surrounding whitespace.
func normalizeVersion(v string) string {
	return strings.TrimPrefix(strings.TrimSpace(v), "v")
}

// compareSemver compares two dotted numeric versions (e.g. "1.2.0" vs "1.10.3").
// Returns 1 if a > b, -1 if a < b, 0 if equal. Non-numeric or missing parts are
// treated as 0. Any trailing pre-release suffix (after "-") is ignored.
func compareSemver(a, b string) int {
	ap := parseVersionParts(a)
	bp := parseVersionParts(b)
	for i := 0; i < 3; i++ {
		if ap[i] > bp[i] {
			return 1
		}
		if ap[i] < bp[i] {
			return -1
		}
	}
	return 0
}

func parseVersionParts(v string) [3]int {
	v = normalizeVersion(v)
	if i := strings.IndexByte(v, '-'); i >= 0 {
		v = v[:i]
	}
	if i := strings.IndexByte(v, '+'); i >= 0 {
		v = v[:i]
	}
	var out [3]int
	for i, part := range strings.SplitN(v, ".", 3) {
		if i > 2 {
			break
		}
		n, err := strconv.Atoi(strings.TrimSpace(part))
		if err == nil {
			out[i] = n
		}
	}
	return out
}

// Version returns the running application version (for the UI).
func (a *App) Version() string {
	return AppVersion
}
