import { useState, useMemo } from "react";
import {
  Download,
  Settings,
  Gamepad2,
  Package,
  ChevronLeft,
} from "lucide-react";
import { GameCard } from "@/components/GameCard";
import { ModCard } from "@/components/ModCard";
import { SettingsPanel } from "@/components/SettingsPanel";

import { useGameFolders } from "@/hooks/useGameFolders";
import { useDownloads } from "@/hooks/useDownloads";

import { mockCatalog } from "@/data/catalog";

function App() {
  const [active, setActive] = useState<"catalog" | "settings">("catalog");
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const groupedCatalog = useMemo(() => {
    const groups: Record<string, typeof mockCatalog> = {};
    for (const mod of mockCatalog) {
      (groups[mod.game] ??= []).push(mod);
    }
    return groups;
  }, []);

  const { folders, setFolder } = useGameFolders();
  const { downloads, start } = useDownloads();

  const gameList = useMemo(() => Object.keys(groupedCatalog), [groupedCatalog]);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <h1 className="text-xl font-bold text-emerald-400 tracking-tight">
            LumInstaller
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Mod & menu installer
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <NavItem
            icon={<Package className="size-4" />}
            label="Catalog"
            active={active === "catalog"}
            onClick={() => setActive("catalog")}
          />
          <NavItem
            icon={<Settings className="size-4" />}
            label="Settings"
            active={active === "settings"}
            onClick={() => setActive("settings")}
          />
        </nav>

        <div className="p-3 border-t border-border text-xs text-muted-foreground">
          v0.1.0
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <header className="px-8 py-6 border-b border-border">
          <h2 className="text-2xl font-semibold">
            {active === "catalog" ? "Catalog" : "Settings"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {active === "catalog"
              ? "Browse and install mods and menus"
              : "Configure download folders per game"}
          </p>
        </header>

        <div className="p-8">
          {active === "catalog" ? (
            selectedGame === null ? (
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
                  <Gamepad2 className="size-5 text-emerald-400" />
                  <h3 className="text-xl font-semibold">{selectedGame}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedCatalog[selectedGame].map((mod) => (
                    <ModCard
                      key={mod.id}
                      mod={mod}
                      state={downloads[mod.id]}
                      folderSet={Boolean(folders[mod.game])}
                      onInstall={() =>
                        start(mod.id, mod.url, folders[mod.game])
                      }
                    />
                  ))}
                </div>
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
      className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export default App;
