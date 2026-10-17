import {
  Download as DownloadIcon,
  HardDrive,
  Check,
  Loader2,
  AlertCircle,
  Boxes,
  Tag,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Stat } from "@/components/Stat";
import { formatSpeed, formatEta, formatBytes } from "@/lib/format";
import type { DownloadState } from "@/hooks/useDownloads";
import type { InstalledMod } from "@/hooks/useInstalled";
import { type Mod, isMinecraftPack, loaderLabel } from "@/data/catalog";

export function ModCard({
  mod,
  state,
  installed,
  folderSet,
  onInstall,
}: {
  mod: Mod;
  state?: DownloadState;
  installed?: InstalledMod;
  folderSet: boolean;
  onInstall: () => void;
}) {
  const status = state?.status ?? "idle";
  const downloading = status === "downloading";
  const extracting = status === "extracting";
  const sessionDone = status === "done";
  const error = status === "error";
  const busy = downloading || extracting;
  const isPack = isMinecraftPack(mod);

  // Persisted install state (survives restarts). An update is available when a
  // record exists but its version differs from the catalog's current version.
  const isInstalled = Boolean(installed) || sessionDone;
  const updateAvailable =
    Boolean(installed) &&
    Boolean(mod.version) &&
    installed!.version !== mod.version &&
    !sessionDone;

  return (
    <Card className="flex flex-col hover:ring-brand/40 transition-all">
      <CardHeader>
        <CardTitle className="text-base">{mod.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {mod.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground mr-0.5">
            <HardDrive className="size-3.5" />
            {mod.size > 0 ? formatBytes(mod.size) : "Unknown size"}
          </span>
          {mod.version && (
            <Badge>
              <Tag className="size-3" />v{mod.version}
            </Badge>
          )}
          {isPack && <Badge tone="brand">{loaderLabel(mod)}</Badge>}
          {mod.minecraft && (
            <Badge>
              <Boxes className="size-3" />
              {mod.minecraft}
            </Badge>
          )}
          {isInstalled && !updateAvailable && !busy && (
            <Badge tone="brand">
              <Check className="size-3" />
              Installed
            </Badge>
          )}
          {updateAvailable && !busy && (
            <Badge tone="brand">
              <RefreshCw className="size-3" />
              Update
            </Badge>
          )}
        </div>

        {downloading && (
          <div className="space-y-2.5">
            <Progress value={state?.percent ?? 0} className="h-1.5" />
            <div className="grid grid-cols-3 gap-2">
              <Stat
                label="Progress"
                value={`${(state?.percent ?? 0).toFixed(0)}%`}
                valueClassName="text-brand"
              />
              <Stat label="Speed" value={formatSpeed(state?.speedBps ?? 0)} />
              <Stat label="ETA" value={formatEta(state?.etaSeconds ?? 0)} />
            </div>
            {(state?.total ?? 0) > 0 && (
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {formatBytes(state?.downloaded ?? 0)} of{" "}
                {formatBytes(state?.total ?? 0)}
              </p>
            )}
          </div>
        )}

        {extracting && (
          <div className="space-y-2">
            <Progress value={state?.percent ?? 0} className="h-1.5" />
            <p className="flex items-center gap-1.5 text-xs text-brand">
              <Loader2 className="size-3.5 animate-spin" />
              {state?.message ?? "Installing instance…"}
            </p>
          </div>
        )}

        {sessionDone && (
          <p className="flex items-center gap-1.5 text-xs text-brand">
            <Check className="size-3.5" />
            {isPack ? "Instance ready" : "Download complete"}
          </p>
        )}

        {updateAvailable && (
          <p className="text-xs text-muted-foreground">
            Installed v{installed!.version || "?"} — v{mod.version} available.
          </p>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="size-3.5" />
            {state?.error ?? "Download failed"}
          </p>
        )}

        {!folderSet && !busy && (
          <p className="text-xs text-amber-400/80">
            Set this game's folder in Settings first.
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          size="sm"
          disabled={busy || !folderSet || (isInstalled && !updateAvailable)}
          variant={isInstalled && !updateAvailable ? "outline" : "brand"}
          onClick={onInstall}
        >
          {downloading ? (
            <>
              <Loader2 className="size-4 mr-1 animate-spin" /> Downloading…
            </>
          ) : extracting ? (
            <>
              <Loader2 className="size-4 mr-1 animate-spin" /> Installing…
            </>
          ) : updateAvailable ? (
            <>
              <RefreshCw className="size-4 mr-1" /> Update
            </>
          ) : isInstalled ? (
            <>
              <Check className="size-4 mr-1 text-brand" /> Installed
            </>
          ) : error ? (
            <>
              <DownloadIcon className="size-4 mr-1" /> Retry
            </>
          ) : (
            <>
              <DownloadIcon className="size-4 mr-1" /> Install
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
