import { useState, useMemo } from "react";
import { Sidebar, type Tab } from "@/components/Sidebar";
import { CatalogView } from "@/components/CatalogView";
import { PatchView } from "@/components/PatchView";
import { SettingsPanel } from "@/components/SettingsPanel";
import { UpdateBanner } from "@/components/UpdateBanner";

import { useGameFolders } from "@/hooks/useGameFolders";
import { useCatalog } from "@/hooks/useCatalog";
import { useUpdate } from "@/hooks/useUpdate";

import { patches } from "@/data/patches";

function App() {
  const [active, setActive] = useState<Tab>("catalog");
  const [selectedPatch, setSelectedPatch] = useState<string | null>(null);

  const {
    catalog,
    status: catalogStatus,
    error: catalogError,
    reload: reloadCatalog,
  } = useCatalog();

  const gameList = useMemo(
    () => [...new Set(catalog.mods.map((m) => m.game))],
    [catalog],
  );

  const { folders, setFolder } = useGameFolders(gameList);
  const { version, update, dismiss } = useUpdate();

  const activePatch = useMemo(
    () => patches.find((p) => p.id === selectedPatch) ?? null,
    [selectedPatch],
  );

  // Navigating via the sidebar always resets any open drill-down.
  const navigate = (tab: Tab) => {
    setActive(tab);
    setSelectedPatch(null);
  };

  const header =
    active === "catalog"
      ? { title: "Catalog", subtitle: "Browse and install mods and menus" }
      : active === "patch"
        ? activePatch
          ? { title: activePatch.title, subtitle: activePatch.description }
          : { title: "Patch", subtitle: "Apply patches to your games" }
        : { title: "Settings", subtitle: "Configure download folders per game" };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar active={active} version={version} onNavigate={navigate} />

      <main className="flex-1 overflow-y-auto">
        {update && <UpdateBanner update={update} onDismiss={dismiss} />}

        <header className="border-b border-border px-8 py-6">
          <h2 className="text-2xl font-semibold">{header.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{header.subtitle}</p>
        </header>

        <div className="p-8">
          {active === "catalog" && (
            <CatalogView
              catalog={catalog}
              status={catalogStatus}
              error={catalogError}
              onReload={reloadCatalog}
              folders={folders}
            />
          )}
          {active === "patch" && (
            <PatchView
              activePatch={activePatch}
              onSelect={setSelectedPatch}
              onBack={() => setSelectedPatch(null)}
            />
          )}
          {active === "settings" && (
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

export default App;
