import { useState, useEffect, useCallback } from "react";
import { FetchCatalog } from "../../wailsjs/go/main/App";
import {
  type Catalog,
  type Mod,
  fallbackCatalog,
  SUPPORTED_CATALOG_VERSION,
} from "@/data/catalog";

type Status = "loading" | "ready" | "error";

function isMod(value: unknown): value is Mod {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === "string" &&
    typeof m.name === "string" &&
    typeof m.game === "string" &&
    typeof m.url === "string"
  );
}

function parseCatalog(raw: string): Catalog {
  const data = JSON.parse(raw) as unknown;
  if (typeof data !== "object" || data === null) {
    throw new Error("Catalog root is not an object");
  }
  const obj = data as Record<string, unknown>;

  if (obj.version !== SUPPORTED_CATALOG_VERSION) {
    throw new Error(
      `Unsupported catalog version ${String(obj.version)} (expected ${SUPPORTED_CATALOG_VERSION})`,
    );
  }
  if (!Array.isArray(obj.mods)) {
    throw new Error("Catalog has no mods array");
  }

  // Keep only well-formed entries, normalizing optional fields.
  const mods: Mod[] = obj.mods.filter(isMod).map((m) => ({
    ...m,
    description: m.description ?? "",
    size: typeof m.size === "number" ? m.size : 0,
    filename: m.filename ?? "",
  }));

  return {
    version: obj.version,
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : undefined,
    mods,
  };
}

export function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog>(fallbackCatalog);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const raw = await FetchCatalog();
      setCatalog(parseCatalog(raw));
      setStatus("ready");
    } catch (e) {
      console.error("catalog load failed", e);
      setError(String(e instanceof Error ? e.message : e));
      setCatalog(fallbackCatalog);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { catalog, status, error, reload: load };
}
