import { useEffect, useState } from "react";
import { CheckForUpdate, Version } from "../../wailsjs/go/main/App";

export interface UpdateInfo {
  available: boolean;
  current: string;
  latest: string;
  url: string;
  notes: string;
}

export function useUpdate() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [version, setVersion] = useState<string>("");
  const [dismissed, setDismissed] = useState(false);

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
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    version,
    update: dismissed ? null : update,
    dismiss: () => setDismissed(true),
  };
}
