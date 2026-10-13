import { useState, useEffect } from "react";
import { DefaultGameFolder } from "../../wailsjs/go/main/App";

const STORAGE_KEY = "luminstaller.gameFolders";

export function useGameFolders(games: string[]) {
  const [folders, setFolders] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
  }, [folders]);

  // For any game without a saved folder, ask the backend for a sensible
  // default (e.g. Minecraft -> %APPDATA%\PrismLauncher\instances) and seed it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const game of games) {
        if (folders[game]) continue;
        try {
          const def = await DefaultGameFolder(game);
          if (!cancelled && def) {
            setFolders((prev) =>
              prev[game] ? prev : { ...prev, [game]: def },
            );
          }
        } catch (e) {
          console.error("default folder resolve failed", game, e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only react to the set of games; folder edits shouldn't re-trigger seeding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [games]);

  const setFolder = (game: string, path: string) =>
    setFolders((prev) => ({ ...prev, [game]: path }));

  return { folders, setFolder };
}
