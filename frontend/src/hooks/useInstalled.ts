import { useState, useEffect, useCallback } from "react";
import {
  GetInstalledMods,
  ReconcileInstalled,
  RemoveInstalled,
} from "../../wailsjs/go/main/App";
import type { main } from "../../wailsjs/go/models";

export type InstalledMod = main.InstalledMod;

function toMap(mods: InstalledMod[]): Record<string, InstalledMod> {
  const map: Record<string, InstalledMod> = {};
  for (const m of mods) map[m.id] = m;
  return map;
}

export function useInstalled() {
  const [installed, setInstalled] = useState<Record<string, InstalledMod>>({});

  // Cheap refresh (no disk reconciliation) — for use right after a change.
  const reload = useCallback(async () => {
    try {
      setInstalled(toMap(await GetInstalledMods()));
    } catch (e) {
      console.error("load installed failed", e);
    }
  }, []);

  // On mount, reconcile against disk so records for deleted instances are
  // pruned and the catalog reflects what's actually installed.
  useEffect(() => {
    (async () => {
      try {
        setInstalled(toMap(await ReconcileInstalled()));
      } catch (e) {
        console.error("reconcile installed failed", e);
        // Fall back to a plain read if reconcile fails.
        try {
          setInstalled(toMap(await GetInstalledMods()));
        } catch {
          /* ignore */
        }
      }
    })();
  }, []);

  // Optimistically merge a record into local state (after a successful install)
  // without a round-trip.
  const markInstalled = useCallback((rec: InstalledMod) => {
    setInstalled((prev) => ({ ...prev, [rec.id]: rec }));
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await RemoveInstalled(id);
      setInstalled((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (e) {
      console.error("remove installed failed", e);
    }
  }, []);

  return { installed, reload, markInstalled, remove };
}
