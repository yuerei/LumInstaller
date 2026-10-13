import { Folder, FolderOpen, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChooseFolder } from "../../wailsjs/go/main/App";

export function SettingsPanel({
  games,
  folders,
  onSetFolder,
}: {
  games: string[];
  folders: Record<string, string>;
  onSetFolder: (game: string, path: string) => void;
}) {
  async function pick(game: string) {
    try {
      const path = await ChooseFolder();
      if (path) onSetFolder(game, path);
    } catch (e) {
      console.error("folder pick failed", e);
    }
  }

  return (
    <div className="space-y-3 max-w-2xl">
      <p className="text-sm text-muted-foreground mb-4">
        Choose where downloads install for each game.
      </p>

      {games.map((game) => {
        const path = folders[game];
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
                  </p>
                ) : (
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    No folder set
                  </p>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => pick(game)}
                className="shrink-0"
              >
                <FolderOpen className="size-4 mr-1" />
                {path ? "Change" : "Set folder"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
