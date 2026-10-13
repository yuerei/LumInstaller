import { useEffect, useState } from "react";
import {
  Download as DownloadIcon,
  ExternalLink,
  Check,
  Loader2,
  AlertCircle,
  Wrench,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrowserOpenURL } from "../../wailsjs/runtime/runtime";
import {
  IsPrismLauncherInstalled,
  PatchPrismAccount,
} from "../../wailsjs/go/main/App";

const PRISM_URL =
  "https://github.com/PrismLauncher/PrismLauncher/releases/download/9.3/PrismLauncher-Windows-MSVC-Setup-9.3.exe";

type PatchStatus = "idle" | "patching" | "done" | "error";

export function PrismLauncherPatch() {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<PatchStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function checkInstalled() {
    try {
      const result = await IsPrismLauncherInstalled();
      setInstalled(result);
    } catch (e) {
      console.error("prism check failed", e);
      setInstalled(false);
    }
  }

  useEffect(() => {
    checkInstalled();
  }, []);

  async function patch() {
    const name = username.trim();
    if (!name) return;
    setStatus("patching");
    setError(null);
    try {
      await PatchPrismAccount(name);
      setStatus("done");
    } catch (e) {
      console.error("patch failed", e);
      setError(String(e));
      setStatus("error");
    }
  }

  const patching = status === "patching";
  const done = status === "done";

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <Wrench className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">PrismLauncher</CardTitle>
              <CardDescription>
                Open-source, multi-instance Minecraft launcher.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Install status */}
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              {installed === null ? (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  Checking installation…
                </span>
              ) : installed ? (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="size-3.5" />
                  Installed
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-400/90">
                  <AlertCircle className="size-3.5" />
                  Not installed
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={checkInstalled}
                title="Re-check installation"
              >
                <RefreshCw className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => BrowserOpenURL(PRISM_URL)}
              >
                <DownloadIcon className="size-4 mr-1" />
                Install PrismLauncher
                <ExternalLink className="size-3.5 ml-1 opacity-70" />
              </Button>
            </div>
          </div>

          {!installed && installed !== null && (
            <p className="text-xs text-muted-foreground">
              Install PrismLauncher first, then re-check to enable patching.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Patch section — only shown when installed */}
      {installed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Patch offline account</CardTitle>
            <CardDescription>
              Writes an offline account with your nickname to
              <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
                %appdata%\PrismLauncher\accounts.json
              </code>
              .
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="prism-username"
                className="text-xs font-medium text-muted-foreground"
              >
                Username
              </label>
              <input
                id="prism-username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (status !== "idle") setStatus("idle");
                }}
                placeholder="YOUR-NICKNAME"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            {status === "error" && (
              <p className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="size-3.5" />
                {error ?? "Patch failed"}
              </p>
            )}

            {done && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Check className="size-3.5" />
                accounts.json patched successfully.
              </p>
            )}

            <Button
              className="w-full"
              size="sm"
              disabled={patching || username.trim() === ""}
              variant={done ? "outline" : "default"}
              onClick={patch}
            >
              {patching ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" /> Patching…
                </>
              ) : done ? (
                <>
                  <Check className="size-4 mr-1 text-emerald-400" /> Patched
                </>
              ) : (
                <>
                  <Wrench className="size-4 mr-1" /> Patch
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
