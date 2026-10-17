import { Suspense } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { PatchCard } from "@/components/PatchCard";
import { patches, type PatchDef } from "@/data/patches";

export function PatchView({
  activePatch,
  onSelect,
  onBack,
}: {
  activePatch: PatchDef | null;
  onSelect: (id: string) => void;
  onBack: () => void;
}) {
  if (activePatch) {
    const Page = activePatch.page;
    return (
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-5 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to patches
        </button>
        <Suspense
          fallback={
            <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-brand" />
              Loading…
            </div>
          }
        >
          <Page />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {patches.map((patch) => (
        <PatchCard
          key={patch.id}
          title={patch.title}
          description={patch.description}
          icon={patch.icon}
          onClick={() => onSelect(patch.id)}
        />
      ))}
    </div>
  );
}
