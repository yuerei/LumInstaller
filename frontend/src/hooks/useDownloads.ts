import { useState, useEffect, useCallback } from "react";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import {
  Download,
  InstallMinecraftPack,
  RecordInstalledMod,
} from "../../wailsjs/go/main/App";
import { type Mod, isMinecraftPack } from "@/data/catalog";
import type { InstalledMod } from "@/hooks/useInstalled";

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

  const start = useCallback(
    async (
      mod: Mod,
      destFolder: string,
      onInstalled?: (rec: InstalledMod) => void,
    ) => {
      setDownloads((prev) => ({
        ...prev,
        [mod.id]: { ...initial, status: "downloading" },
      }));
      try {
        const zipPath = await Download(
          mod.id,
          mod.url,
          destFolder,
          mod.filename,
        );

        let installPath = destFolder;
        const loader = mod.loader === "fabric" ? "fabric" : "forge";

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
          const loaderVersion =
            loader === "fabric" ? mod.fabric || "" : mod.forge || "";
          installPath = await InstallMinecraftPack(
            mod.id,
            zipPath,
            mod.instanceName || mod.name,
            mod.minecraft || "",
            loader,
            loaderVersion,
          );
        }

        // Persist the install so it's remembered across restarts.
        try {
          await RecordInstalledMod(
            mod.id,
            mod.name,
            mod.game,
            mod.version || "",
            isMinecraftPack(mod) ? loader : "",
            mod.minecraft || "",
            mod.instanceName || "",
            installPath,
          );
          onInstalled?.({
            id: mod.id,
            name: mod.name,
            game: mod.game,
            version: mod.version || "",
            loader: isMinecraftPack(mod) ? loader : "",
            minecraft: mod.minecraft || "",
            instanceName: mod.instanceName || "",
            path: installPath,
            installedAt: new Date().toISOString(),
          });
        } catch (e) {
          console.error("record install failed", e);
        }

        setDownloads((prev) => ({
          ...prev,
          [mod.id]: {
            ...(prev[mod.id] ?? initial),
            status: "done",
            percent: 100,
          },
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
    },
    [],
  );

  return { downloads, start };
}
