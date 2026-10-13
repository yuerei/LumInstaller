import {
  Download as DownloadIcon,
  HardDrive,
  Check,
  Loader2,
  AlertCircle,
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
import { Progress } from "@/components/ui/progress";
import { formatSpeed, formatEta } from "@/lib/format";
import type { DownloadState } from "@/hooks/useDownloads";

export interface Mod {
  id: string;
  name: string;
  game: string;
  description: string;
  size: string;
  url: string;
}

export function ModCard({
  mod,
  state,
  folderSet,
  onInstall,
}: {
  mod: Mod;
  state?: DownloadState;
  folderSet: boolean;
  onInstall: () => void;
}) {
  const status = state?.status ?? "idle";
  const downloading = status === "downloading";
  const done = status === "done";
  const error = status === "error";

  return (
    <Card className="flex flex-col hover:border-emerald-500/50 transition-colors">
      <CardHeader>
        <CardTitle className="text-base">{mod.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {mod.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <HardDrive className="size-3.5" />
          {mod.size}
        </div>

        {downloading && (
          <div className="space-y-1.5">
            <Progress value={state?.percent ?? 0} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{(state?.percent ?? 0).toFixed(0)}%</span>
              <span>{formatSpeed(state?.speedBps ?? 0)}</span>
              <span>{formatEta(state?.etaSeconds ?? 0)} left</span>
            </div>
          </div>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle className="size-3.5" />
            {state?.error ?? "Download failed"}
          </p>
        )}

        {!folderSet && !downloading && (
          <p className="text-xs text-amber-400/80">
            Set this game's folder in Settings first.
          </p>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          size="sm"
          disabled={downloading || !folderSet}
          variant={done ? "outline" : "default"}
          onClick={onInstall}
        >
          {downloading ? (
            <>
              <Loader2 className="size-4 mr-1 animate-spin" /> Installing…
            </>
          ) : done ? (
            <>
              <Check className="size-4 mr-1 text-emerald-400" /> Installed
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
