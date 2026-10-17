import { useState, useMemo, useCallback } from "react";
import {
  Gamepad2,
  Package,
  ChevronLeft,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { GameCard } from "@/components/GameCard";
import { ModCard } from "@/components/ModCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useDownloads } from "@/hooks/useDownloads";
import { useInstalled } from "@/hooks/useInstalled";
import { type Catalog, type Mod, isMinecraftPack } from "@/data/catalog";
import { InstanceExists } from "../../wailsjs/go/main/App";

export function CatalogView({
  catalog,
  status,
  error,
  onReload,
  folders,
}: {
  catalog: Catalog;
  status: "loading" | "ready" | "error";
  error: string | null;
  onReload: () => void;
  folders: Record<string, string>;
}) {
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [confirmMod, setConfirmMod] = useState<Mod | null>(null);

  const { downloads, start } = useDownloads();
  const { installed, markInstalled } = useInstalled();

  const grouped = useMemo(() => {
    const groups: Record<string, Mod[]> = {};
    for (const mod of catalog.mods) (groups[mod.game] ??= []).push(mod);
    return groups;
  }, [catalog]);

  const runInstall = useCallback(
    (mod: Mod) => start(mod, folders[mod.game], markInstalled),
    [start, folders, markInstalled],
  );

  // Warn before overwriting an existing Minecraft instance folder.
  const installMod = useCallback(
    async (mod: Mod) => {
      const dest = folders[mod.game];
      if (dest && isMinecraftPack(mod)) {
        try {
          if (await InstanceExists(dest, mod.instanceName || mod.name)) {
            setConfirmMod(mod);
            return;
          }
        } catch (e) {
          console.error("instance check failed", e);
        }
      }
      runInstall(mod);
    },
    [folders, runInstall],
  );

  let body: React.ReactNode;
  if (status === "loading") {
    body = (
      <EmptyState
        icon={<Loader2 className="size-7 animate-spin text-brand" />}
        title="Loading catalog…"
      />
    );
  } else if (status === "error" && catalog.mods.length === 0) {
    body = (
      <EmptyState
        icon={<AlertCircle className="size-8 text-amber-400/80" />}
        title="Couldn't load the catalog"
        description={error ?? "Check your connection and try again."}
        action={
          <Button variant="outline" size="sm" onClick={onReload}>
            <RefreshCw className="size-4 mr-1" /> Retry
          </Button>
        }
      />
    );
  } else if (catalog.mods.length === 0) {
    body = (
      <EmptyState
        icon={<Package className="size-8 opacity-40" />}
        title="The catalog is empty right now."
        action={
          <Button variant="outline" size="sm" onClick={onReload}>
            <RefreshCw className="size-4 mr-1" /> Refresh
          </Button>
        }
      />
    );
  } else if (selectedGame === null) {
    body = (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(grouped).map(([game, mods]) => (
          <GameCard
            key={game}
            game={game}
            count={mods.length}
            onClick={() => setSelectedGame(game)}
          />
        ))}
      </div>
    );
  } else {
    const mods = grouped[selectedGame] ?? [];
    body = (
      <div>
        <button
          type="button"
          onClick={() => setSelectedGame(null)}
          className="mb-5 flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to games
        </button>

        <div className="mb-4 flex items-center gap-2">
          <Gamepad2 className="size-5 text-brand" />
          <h3 className="text-xl font-semibold">{selectedGame}</h3>
          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
            {mods.length}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mods.map((mod) => (
            <ModCard
              key={mod.id}
              mod={mod}
              state={downloads[mod.id]}
              installed={installed[mod.id]}
              folderSet={Boolean(folders[mod.game])}
              onInstall={() => installMod(mod)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {body}

      <AlertDialog
        open={confirmMod !== null}
        onOpenChange={(open) => !open && setConfirmMod(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Instance already exists</AlertDialogTitle>
            <AlertDialogDescription>
              An instance named{" "}
              <span className="font-medium text-foreground">
                {confirmMod?.instanceName || confirmMod?.name}
              </span>{" "}
              already exists in this folder. Reinstalling will overwrite its
              files — worlds and saves inside the instance may be lost. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmMod(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmMod) runInstall(confirmMod);
                setConfirmMod(null);
              }}
            >
              Overwrite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
