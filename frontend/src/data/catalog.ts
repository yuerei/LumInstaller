// Catalog schema — mirrors catalog.json served from the remote CDN and the
// Go `FetchCatalog` return value.

export interface Mod {
  id: string;
  name: string;
  game: string;
  description: string;
  /** Size in bytes. 0 / undefined means unknown. */
  size: number;
  /** Preferred output filename for the download. */
  filename: string;
  url: string;
  /** Lowercase hex SHA-256 of the file, for integrity verification. */
  sha256?: string;
  /** Mod version string, e.g. "2.9.3". */
  version?: string;

  // --- Minecraft modpack install metadata (optional) ---
  /** Minecraft version the pack targets, e.g. "1.12.2". */
  minecraft?: string;
  /** Forge version, e.g. "14.23.5.2860". */
  forge?: string;
  /** PrismLauncher instance folder/display name, e.g. "RLCraft". */
  instanceName?: string;
}

export interface Catalog {
  version: number;
  updatedAt?: string;
  mods: Mod[];
}

/** Schema version this build understands. */
export const SUPPORTED_CATALOG_VERSION = 1;

/**
 * Bundled fallback used only if the remote fetch fails AND there is no cached
 * copy on disk (e.g. first launch while offline). Keep this minimal.
 */
export const fallbackCatalog: Catalog = {
  version: 1,
  mods: [],
};
