import { useEffect, useState, useCallback } from "react";
import {
  CheckForUpdate,
  Version,
  ApplyAppUpdate,
} from "../../wailsjs/go/main/App";
import { EventsOn } from "../../wailsjs/runtime/runtime";

export interface UpdateInfo {
  available: boolean;
  current: string;
  latest: string;
  url: string;
  notes: string;
  exeUrl: string;
  sha256Url: string;
}

interface AppUpdateProgress {
  percent: number;
  done: boolean;
  message: string;
}

export type UpdateStatus = "idle" | "updating" | "error";

export function useUpdate() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [version, setVersion] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [progress, setProgress] = useState<AppUpdateProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await Version();
        if (!cancelled) setVersion(v);
      } catch {
        /* non-fatal */
      }
      try {
        const info = (await CheckForUpdate()) as UpdateInfo;
        if (!cancelled && info?.available) setUpdate(info);
      } catch {
        // Update checks are best-effort; silently ignore failures.
      }
    })();

    const off = EventsOn("appupdate:progress", (p: AppUpdateProgress) => {
      setProgress(p);
    });

    return () => {
      cancelled = true;
      off();
    };
  }, []);

  // Download + verify + swap + relaunch. On success the app quits (the helper
  // relaunches the new version), so this promise typically doesn't resolve.
  const applyUpdate = useCallback(async () => {
    if (!update?.exeUrl) return;
    setStatus("updating");
    setError(null);
    setProgress({ percent: 0, done: false, message: "Starting…" });
    try {
      await ApplyAppUpdate(update.exeUrl, update.sha256Url);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setStatus("error");
    }
  }, [update]);

  return {
    version,
    update: dismissed ? null : update,
    dismiss: () => setDismissed(true),
    status,
    progress,
    error,
    applyUpdate,
    canSelfUpdate: Boolean(update?.exeUrl),
  };
}
