import { useState, useEffect } from "react";

const STORAGE_KEY = "luminstaller.gameFolders";

export function useGameFolders() {
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

  const setFolder = (game: string, path: string) =>
    setFolders((prev) => ({ ...prev, [game]: path }));

  return { folders, setFolder };
}
