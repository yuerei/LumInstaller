import { useState, useEffect, useCallback } from "react";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import { Download, InstallMinecraftPack } from "../../wailsjs/go/main/App";
import type { Mod } from "@/data/catalog";

export interface DownloadState {
  status: "idle" | "downloading" | "extracting" | "done" | "error";
  percent: number;
  downloaded: number;
  total: number;
  speedBps: number;
  etaSeconds: number;
  /** Human-readable status detail, e.g. "Extracting…". */
  message?: string;
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

/** Mirrors the Go `InstallProgress` struct emitted on "install:progress". */
interface InstallProgressEvent {
  modId: string;
  extracted: number;
  total: number;
  percent: number;
  done: boolean;
  message: string;
}

const initial: DownloadState = {
  status: "idle",
  percent: 0,
  downloaded: 0,
  total: 0,
  speedBps: 0,
  etaSeconds: 0,
};

/** True when a mod entry is a Minecraft modpack that needs instance install. */
function isMinecraftPack(mod: Mod): boolean {
  return (
    mod.game.toLowerCase() === "minecraft" &&
    Boolean(mod.minecraft) &&
    mod.filename.toLowerCase().endsWith(".zip")
  );
}

export function useDownloads() {
  const [downloads, setDownloads] = useState<Record<string, DownloadState>>({});

  useEffect(() => {
    const offDownload = EventsOn(
      "download:progress",
      (p: DownloadProgressEvent) => {
        setDownloads((prev) => {
          // Once we flip to extracting, ignore late download events.
          if (prev[p.modId]?.status === "extracting") return prev;
          return {
            ...prev,
            [p.modId]: {
              status: p.done ? "done" : "downloading",
              percent: p.percent,
              downloaded: p.downloaded,
              total: p.total,
              speedBps: p.speedBps,
              etaSeconds: p.etaSeconds,
            },
          };
        });
      },
    );

    const offInstall = EventsOn(
      "install:progress",
      (p: InstallProgressEvent) => {
        setDownloads((prev) => ({
          ...prev,
          [p.modId]: {
            ...(prev[p.modId] ?? initial),
            status: p.done ? "done" : "extracting",
            percent: p.percent,
            message: p.message,
          },
        }));
      },
    );

    return () => {
      offDownload();
      offInstall();
    };
  }, []);

  const start = useCallback(async (mod: Mod, destFolder: string) => {
    setDownloads((prev) => ({
      ...prev,
      [mod.id]: { ...initial, status: "downloading" },
    }));
    try {
      const zipPath = await Download(mod.id, mod.url, destFolder, mod.filename);

      // Minecraft modpacks: extract into a PrismLauncher instance.
      if (isMinecraftPack(mod)) {
        setDownloads((prev) => ({
          ...prev,
          [mod.id]: {
            ...(prev[mod.id] ?? initial),
            status: "extracting",
            message: "Preparing instance…",
          },
        }));
        await InstallMinecraftPack(
          mod.id,
          zipPath,
          mod.instanceName || mod.name,
          mod.minecraft || "",
          mod.forge || "",
        );
      }

      setDownloads((prev) => ({
        ...prev,
        [mod.id]: { ...(prev[mod.id] ?? initial), status: "done", percent: 100 },
      }));
    } catch (e) {
      setDownloads((prev) => ({
        ...prev,
        [mod.id]: {
          ...(prev[mod.id] ?? initial),
          status: "error",
          error: String(e),
        },
      }));
    }
  }, []);

  return { downloads, start };
}
