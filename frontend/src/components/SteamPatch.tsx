import { useEffect, useState } from "react";
import {
  Wrench,
  Check,
  Loader2,
  AlertCircle,
  FolderOpen,
  RefreshCw,
  TriangleAlert,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import {
  ApplySteamPatch,
  DetectSteamPath,
  IsSteamRunning,
  ChooseFolder,
} from "../../wailsjs/go/main/App";

type Status = "idle" | "working" | "done" | "error";

interface SteamProgress {
  done: boolean;
  message: string;
}

export function SteamPatch() {
  const [steamPath, setSteamPath] = useState("");
  const [running, setRunning] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const [path, isRunning] = await Promise.all([
        DetectSteamPath(),
        IsSteamRunning(),
      ]);
      setSteamPath((prev) => prev || path);
      setRunning(isRunning);
    } catch (e) {
      console.error("steam detect failed", e);
    }
  }

  useEffect(() => {
    refresh();
    const off = EventsOn("steam:progress", (p: SteamProgress) => {
      setMessage(p.message);
    });
    return () => off();
  }, []);

  async function pickFolder() {
    try {
      const p = await ChooseFolder();
      if (p) setSteamPath(p);
    } catch (e) {
      console.error("folder pick failed", e);
    }
  }

  async function apply() {
    setStatus("working");
    setError(null);
    setMessage("Starting…");
    try {
      await ApplySteamPatch(steamPath);
      setStatus("done");
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setStatus("error");
    } finally {
      // Re-check running state after the attempt.
      try {
        setRunning(await IsSteamRunning());
      } catch {
        /* ignore */
      }
    }
  }

  const working = status === "working";
  const done = status === "done";

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-brand/15 text-brand shrink-0">
              <Wrench className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">Steam</CardTitle>
              <CardDescription>Patches family limitation.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Steam folder */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Steam folder
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 min-w-0 truncate rounded-lg border border-border bg-background px-3 py-2 text-xs">
                {steamPath || "Detecting…"}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={pickFolder}
                className="shrink-0"
              >
                <FolderOpen className="size-4 mr-1" />
                Change
              </Button>
            </div>
          </div>

          {/* Steam-running warning */}
          {running ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-300">
              <TriangleAlert className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                Steam is currently running. Close it completely before patching.
              </div>
              <Button variant="ghost" size="icon-sm" onClick={refresh} title="Re-check">
                <RefreshCw className="size-3.5" />
              </Button>
            </div>
          ) : (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Check className="size-3.5 text-brand" />
              Steam is not running.
            </p>
          )}

          {working && (
            <p className="flex items-center gap-1.5 text-xs text-brand">
              <Loader2 className="size-3.5 animate-spin" />
              {message || "Working…"}
            </p>
          )}

          {done && (
            <p className="flex items-center gap-1.5 text-xs text-brand">
              <Check className="size-3.5" />
              {message || "Steam patch applied."}
            </p>
          )}

          {status === "error" && (
            <p className="flex items-start gap-1.5 text-xs text-red-400">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
              {error ?? "Patch failed"}
            </p>
          )}

          <Button
            className="w-full"
            size="sm"
            disabled={working || done || running === true}
            variant={done ? "outline" : "brand"}
            onClick={apply}
          >
            {working ? (
              <>
                <Loader2 className="size-4 mr-1 animate-spin" /> Patching…
              </>
            ) : done ? (
              <>
                <Check className="size-4 mr-1 text-brand" /> Patched
              </>
            ) : (
              <>
                <Wrench className="size-4 mr-1" /> Patch Steam
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
