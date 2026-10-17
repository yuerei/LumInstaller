import { useState, useMemo, useCallback } from "react";
import {
  Settings,
  Gamepad2,
  Package,
  ChevronLeft,
  Wrench,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { GameCard } from "@/components/GameCard";
import { ModCard } from "@/components/ModCard";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PatchCard } from "@/components/PatchCard";
import { Button } from "@/components/ui/button";
import { UpdateBanner } from "@/components/UpdateBanner";
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

import { useGameFolders } from "@/hooks/useGameFolders";
import { useDownloads } from "@/hooks/useDownloads";
import { useCatalog } from "@/hooks/useCatalog";
import { useUpdate } from "@/hooks/useUpdate";
import { useInstalled } from "@/hooks/useInstalled";

import { patches } from "@/data/patches";
import { type Mod, isMinecraftPack } from "@/data/catalog";
import { InstanceExists } from "../wailsjs/go/main/App";

function App() {
  const [active, setActive] = useState<"catalog" | "patch" | "settings">(
    "catalog",
  );
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [selectedPatch, setSelectedPatch] = useState<string | null>(null);

  const {
    catalog,
    status: catalogStatus,
    error: catalogError,
    reload: reloadCatalog,
  } = useCatalog();

  const groupedCatalog = useMemo(() => {
    const groups: Record<string, Mod[]> = {};
    for (const mod of catalog.mods) {
      (groups[mod.game] ??= []).push(mod);
    }
    return groups;
  }, [catalog]);

  const gameList = useMemo(() => Object.keys(groupedCatalog), [groupedCatalog]);

  const { folders, setFolder } = useGameFolders(gameList);
  const { downloads, start } = useDownloads();
  const { version, update, dismiss } = useUpdate();
  const { installed, markInstalled } = useInstalled();

  // Overwrite-confirmation dialog state: holds the mod awaiting confirmation.
  const [confirmMod, setConfirmMod] = useState<Mod | null>(null);

  // Run the actual install for a mod into its game's folder, recording it.
  const runInstall = useCallback(
    (mod: Mod) => start(mod, folders[mod.game], markInstalled),
    [start, folders, markInstalled],
  );

  // Install entrypoint: for Minecraft modpacks, warn first if the instance
  // folder already exists so the user doesn't accidentally overwrite it.
  const installMod = useCallback(
    async (mod: Mod) => {
      const dest = folders[mod.game];
      if (dest && isMinecraftPack(mod)) {
        try {
          const exists = await InstanceExists(
            dest,
            mod.instanceName || mod.name,
          );
          if (exists) {
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

  const activePatch = useMemo(
    () => patches.find((p) => p.id === selectedPatch) ?? null,
    [selectedPatch],
  );
  const ActivePatchPage = activePatch?.page ?? null;

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-brand/15 text-brand shrink-0">
              <Package className="size-4.5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-foreground tracking-tight leading-none">
                LumInstaller
              </h1>
              <p className="text-[11px] text-muted-foreground mt-1 leading-none">
                Mod &amp; patch installer
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <p className="px-3 pb-1.5 pt-1 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Library
          </p>
          <NavItem
            icon={<Package className="size-4" />}
            label="Catalog"
            active={active === "catalog"}
            onClick={() => {
              setActive("catalog");
              setSelectedGame(null);
            }}
          />
          <NavItem
            icon={<Wrench className="size-4" />}
            label="Patch"
            active={active === "patch"}
            onClick={() => {
              setActive("patch");
              setSelectedGame(null);
              setSelectedPatch(null);
            }}
          />
          <p className="px-3 pb-1.5 pt-3 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Configure
          </p>
          <NavItem
            icon={<Settings className="size-4" />}
            label="Settings"
            active={active === "settings"}
            onClick={() => {
              setActive("settings");
              setSelectedGame(null);
              setSelectedPatch(null);
            }}
          />
        </nav>

        <div className="p-4 border-t border-border text-[11px] text-muted-foreground">
          v{version || "0.1.0"}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {update && <UpdateBanner update={update} onDismiss={dismiss} />}
        <header className="px-8 py-6 border-b border-border">
          <h2 className="text-2xl font-semibold">
            {active === "catalog"
              ? "Catalog"
              : active === "patch"
                ? activePatch
                  ? activePatch.title
                  : "Patch"
                : "Settings"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {active === "catalog"
              ? "Browse and install mods and menus"
              : active === "patch"
                ? activePatch
                  ? activePatch.description
                  : "Apply patches to your games"
                : "Configure download folders per game"}
          </p>
        </header>

        <div className="p-8">
          {active === "catalog" ? (
            catalogStatus === "loading" ? (
              // ---- Loading ----
              <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
                <Loader2 className="size-7 mb-3 animate-spin text-brand" />
                <p className="text-sm">Loading catalog…</p>
              </div>
            ) : catalogStatus === "error" && catalog.mods.length === 0 ? (
              // ---- Error (and nothing cached to show) ----
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <AlertCircle className="size-8 mb-3 text-amber-400/80" />
                <p className="text-sm font-medium">Couldn't load the catalog</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  {catalogError ?? "Check your connection and try again."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={reloadCatalog}
                >
                  <RefreshCw className="size-4 mr-1" />
                  Retry
                </Button>
              </div>
            ) : catalog.mods.length === 0 ? (
              // ---- Empty ----
              <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
                <Package className="size-8 mb-3 opacity-40" />
                <p className="text-sm">The catalog is empty right now.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={reloadCatalog}
                >
                  <RefreshCw className="size-4 mr-1" />
                  Refresh
                </Button>
              </div>
            ) : selectedGame === null ? (
              // ---- Game grid ----
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(groupedCatalog).map(([game, mods]) => (
                  <GameCard
                    key={game}
                    game={game}
                    count={mods.length}
                    onClick={() => setSelectedGame(game)}
                  />
                ))}
              </div>
            ) : (
              // ---- Mods for selected game ----
              <div>
                <button
                  onClick={() => setSelectedGame(null)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
                >
                  <ChevronLeft className="size-4" />
                  Back to games
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <Gamepad2 className="size-5 text-brand" />
                  <h3 className="text-xl font-semibold">{selectedGame}</h3>
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">
                    {groupedCatalog[selectedGame]?.length ?? 0}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(groupedCatalog[selectedGame] ?? []).map((mod) => (
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
            )
          ) : active === "patch" ? (
            activePatch === null ? (
              // ---- Patch grid ----
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {patches.map((patch) => (
                  <PatchCard
                    key={patch.id}
                    title={patch.title}
                    description={patch.description}
                    icon={patch.icon}
                    onClick={() => setSelectedPatch(patch.id)}
                  />
                ))}
              </div>
            ) : (
              // ---- Selected patch page ----
              <div>
                <button
                  onClick={() => setSelectedPatch(null)}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
                >
                  <ChevronLeft className="size-4" />
                  Back to patches
                </button>

                {ActivePatchPage && <ActivePatchPage />}
              </div>
            )
          ) : (
            <SettingsPanel
              games={gameList}
              folders={folders}
              onSetFolder={setFolder}
            />
          )}
        </div>
      </main>

      {/* Overwrite confirmation for existing Minecraft instances */}
      <AlertDialog
        open={confirmMod !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmMod(null);
        }}
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
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-brand/15 text-brand"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default App;
