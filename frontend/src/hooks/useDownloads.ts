import { useState, useEffect, useCallback } from "react";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import { Download } from "../../wailsjs/go/main/App";

export interface DownloadState {
  status: "idle" | "downloading" | "done" | "error";
  percent: number;
  downloaded: number;
  total: number;
  speedBps: number;
  etaSeconds: number;
  error?: string;
}

/** Mirrors the Go `DownloadProgress` struct emitted on "download:progress". */
interface DownloadProgressEvent {
  modId: string;
  downloaded: number;
  total: number;
  percent: number;
  speedBps: number;
  etaSeconds: number;
  done: boolean;
}

const initial: DownloadState = {
  status: "idle",
  percent: 0,
  downloaded: 0,
  total: 0,
  speedBps: 0,
  etaSeconds: 0,
};

export function useDownloads() {
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});

  useEffect(() => {
    // Listen for progress events emitted from Go.
    const cancel = EventsOn("download:progress", (p: DownloadProgressEvent) => {
      setDownloads((prev) => ({
        ...prev,
        [p.modId]: {
          status: p.done ? "done" : "downloading",
          percent: p.percent,
          downloaded: p.downloaded,
          total: p.total,
          speedBps: p.speedBps,
          etaSeconds: p.etaSeconds,
        },
      }));
    });
    return () => cancel();
  }, []);

  const start = useCallback(
    async (modId: string, url: string, destFolder: string) => {
      setDownloads((prev) => ({
        ...prev,
        [modId]: { ...initial, status: "downloading" },
      }));
      try {
        await Download(modId, url, destFolder);
      } catch (e) {
        setDownloads((prev) => ({
          ...prev,
          [modId]: {
            ...(prev[modId] ?? initial),
            status: "error",
            error: String(e),
          },
        }));
      }
    },
    [],
  );

  return { downloads, start };
}
