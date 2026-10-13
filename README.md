# LumInstaller

A desktop mod & menu installer built with [Wails](https://wails.io) (Go + React/TypeScript).
Browse a remotely-hosted catalog, install mods per game, patch PrismLauncher, and
install Minecraft modpacks directly as PrismLauncher instances.

## Features

- **Catalog** — mods/menus grouped by game, fetched from a remote `catalog.json`
  (CDN-hosted) with an on-disk cache for offline use.
- **Per-game install folders** — remembered between launches; Minecraft defaults
  to `%APPDATA%\PrismLauncher\instances`.
- **Minecraft modpacks** — a modpack `.zip` is extracted into a proper
  PrismLauncher instance (`instance.cfg` + `mmc-pack.json` pinning Minecraft and
  Forge), not just dropped as a file.
- **PrismLauncher patch** — detects an install and writes an offline account to
  `accounts.json`.
- **Update notifier** — checks GitHub Releases on launch and shows a banner when
  a newer version is available.

## Requirements

- [Go](https://go.dev/dl/) 1.21+
- [Node.js](https://nodejs.org/) 18+
- [Wails CLI](https://wails.io/docs/gettingstarted/installation): `go install github.com/wailsapp/wails/v2/cmd/wails@latest`

## Development

```bash
wails dev
```

Runs a Vite dev server with hot reload. Go methods are callable from the browser
dev server at http://localhost:34115.

## Building

```bash
wails build
```

Produces a redistributable binary in `build/bin/`.

## Catalog

The catalog is a JSON file hosted in a separate repo and served over jsDelivr.
Each entry:

```json
{
  "version": 1,
  "updatedAt": "2026-10-13T00:00:00Z",
  "mods": [
    {
      "id": "rlcraft",
      "name": "RLCraft",
      "game": "Minecraft",
      "description": "...",
      "size": 350000000,
      "filename": "RLCraft.zip",
      "url": "https://.../RLCraft.zip",
      "version": "2.9.3",
      "minecraft": "1.12.2",
      "forge": "14.23.5.2860",
      "instanceName": "RLCraft"
    }
  ]
}
```

`minecraft` / `forge` / `instanceName` are only needed for Minecraft modpack
entries; their presence triggers PrismLauncher instance extraction.

## Releasing

When cutting a new version, update it in three places and tag the release:

1. `update.go` → `AppVersion`
2. `wails.json` → `info.productVersion`
3. the GitHub release tag (e.g. `v0.2.0`)

## License

See [LICENSE](LICENSE).
