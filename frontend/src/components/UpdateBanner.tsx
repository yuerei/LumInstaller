import { ArrowUpCircle, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrowserOpenURL } from "../../wailsjs/runtime/runtime";
import type { UpdateInfo } from "@/hooks/useUpdate";

export function UpdateBanner({
  update,
  onDismiss,
}: {
  update: UpdateInfo;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-brand/30 bg-brand/10 px-8 py-2.5">
      <ArrowUpCircle className="size-4 shrink-0 text-brand" />
      <p className="flex-1 min-w-0 text-sm">
        <span className="font-medium">Update available</span>
        <span className="text-muted-foreground">
          {" "}
          — v{update.latest} is out (you have v{update.current}).
        </span>
      </p>
      <Button
        variant="brand"
        size="sm"
        onClick={() => update.url && BrowserOpenURL(update.url)}
      >
        <ExternalLink className="size-4 mr-1" />
        View release
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDismiss}
        title="Dismiss"
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
