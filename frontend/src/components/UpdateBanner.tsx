import {
  ArrowUpCircle,
  ExternalLink,
  X,
  Download,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BrowserOpenURL } from "../../wailsjs/runtime/runtime";
import type { UpdateInfo, UpdateStatus } from "@/hooks/useUpdate";

interface AppUpdateProgress {
  percent: number;
  done: boolean;
  message: string;
}

export function UpdateBanner({
  update,
  status,
  progress,
  error,
  canSelfUpdate,
  onUpdate,
  onDismiss,
}: {
  update: UpdateInfo;
  status: UpdateStatus;
  progress: AppUpdateProgress | null;
  error: string | null;
  canSelfUpdate: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
}) {
  const updating = status === "updating";

  return (
    <div className="border-b border-brand/30 bg-brand/10 px-8 py-2.5">
      <div className="flex items-center gap-3">
        <ArrowUpCircle className="size-4 shrink-0 text-brand" />
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-medium">Update available</span>
          <span className="text-muted-foreground">
            {" "}
            — v{update.latest} is out (you have v{update.current}).
          </span>
        </p>

        {canSelfUpdate && (
          <Button variant="brand" size="sm" onClick={onUpdate} disabled={updating}>
            {updating ? (
              <>
                <Loader2 className="size-4 mr-1 animate-spin" />
                {progress?.message ?? "Updating…"}
              </>
            ) : (
              <>
                <Download className="size-4 mr-1" />
                Update now
              </>
            )}
          </Button>
        )}

        <Button
          variant={canSelfUpdate ? "outline" : "brand"}
          size="sm"
          onClick={() => update.url && BrowserOpenURL(update.url)}
          disabled={updating}
        >
          <ExternalLink className="size-4 mr-1" />
          View release
        </Button>

        {!updating && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onDismiss}
            title="Dismiss"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      {updating && progress && progress.percent > 0 && progress.percent < 100 && (
        <Progress value={progress.percent} className="mt-2 h-1" />
      )}

      {status === "error" && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400">
          <AlertCircle className="size-3.5" />
          {error ?? "Update failed."} You can still update from the release page.
        </p>
      )}
    </div>
  );
}
