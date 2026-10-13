import { useEffect, useState } from "react";
import { Folder, FolderOpen, Check, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChooseFolder, DefaultGameFolder } from "../../wailsjs/go/main/App";

export function SettingsPanel({
  games,
  folders,
  onSetFolder,
}: {
  games: string[];
  folders: Record<string, string>;
  onSetFolder: (game: string, path: string) => void;
}) {
  // Resolve the known default folder per game (empty string = no default).
  const [defaults, setDefaults] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const game of games) {
        try {
          next[game] = await DefaultGameFolder(game);
        } catch {
          next[game] = "";
        }
      }
      if (!cancelled) setDefaults(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [games]);

  async function pick(game: string) {
    try {
      const path = await ChooseFolder();
      if (path) onSetFolder(game, path);
    } catch (e) {
      console.error("folder pick failed", e);
    }
  }

  async function useDefault(game: string) {
    try {
      const def = await DefaultGameFolder(game);
      if (def) onSetFolder(game, def);
    } catch (e) {
      console.error("default folder failed", e);
    }
  }

  return (
    <div className="space-y-3 max-w-2xl">
      <p className="text-sm text-muted-foreground mb-4">
        Choose where downloads install for each game.
      </p>

      {games.map((game) => {
        const path = folders[game];
        const def = defaults[game];
        const hasDefault = Boolean(def);
        const isDefault = Boolean(path) && path === def;
        return (
          <Card key={game}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex items-center justify-center size-10 rounded-lg bg-brand/15 text-brand shrink-0">
                <Folder className="size-5" />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium">{game}</h3>
                {path ? (
                  <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                    <Check className="size-3.5 text-brand shrink-0" />
                    {path}
                    {isDefault && (
                      <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-mono">
                        default
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    No folder set
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {hasDefault && !isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => useDefault(game)}
                    title={`Use default: ${def}`}
                  >
                    <Sparkles className="size-4 mr-1" />
                    Default
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => pick(game)}>
                  <FolderOpen className="size-4 mr-1" />
                  {path ? "Change" : "Set folder"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
