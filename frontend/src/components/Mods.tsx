import { useState } from "react";
import { ArrowLeft, Gamepad2, Download, Box, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { DownloadAndExtractMod } from "../../wailsjs/go/main/App";

interface ModsProps {
  onCancel: () => void;
  steamPath: string;
}

type Mod = {
  id: string;
  name: string;
  author: string;
  version: string;
  downloadUrl: string;
  location?: string;
  description: string;
  isRequired?: boolean;
};

type Game = {
  id: string;
  title: string;
  identifier: string;
  imageUrl: string;
  available: boolean;
  mods?: Mod[];
};

const GAMES: Game[] = [
  {
    id: "rv-there-yet",
    title: "RV There Yet?",
    identifier: "Ride",
    imageUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3949040/701632e4a84f8378c23fdf18ae127cb6a0f3f904/library_capsule.jpg?t=1778071815",
    available: true,
    mods: [
      {
        id: "more-rvers",
        name: "MoreRVers",
        author: "zzi00",
        version: "1.0.1",
        downloadUrl: "https://drive.usercontent.google.com/download?id=140josGX6sr5VLMHexrCP_d9wO4ICSqje&export=download",
        location: "\\Ride\\Binaries\\Win64",
        description: "This mod patches the game's multiplayer cap at runtime, allowing you to host sessions with more than the default 4 players.",
        isRequired: false,
      }
    ]
  },
  {
    id: "lethal-company",
    title: "Lethal Company",
    identifier: "LethalCompany",
    imageUrl: "https://steamcdn-a.akamaihd.net/steam/apps/1966720/library_600x900.jpg",
    available: true,
  },
  {
    id: "repo",
    title: "R.E.P.O.",
    identifier: "REPO",
    imageUrl: "https://steamcdn-a.akamaihd.net/steam/apps/3241660/library_600x900.jpg",
    available: true,
  },
  {
    id: "more-soon",
    title: "More Coming Soon",
    identifier: "coming-soon",
    imageUrl: "",
    available: false,
  },
];

export function Mods({ onCancel, steamPath }: ModsProps) {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const handleBack = () => {
    if (selectedGame) {
      setSelectedGame(null);
    } else {
      onCancel();
    }
  };

  return (
    <div className="relative w-4/5 max-w-4xl rounded-2xl border border-white/10 bg-slate-800/70 p-8 shadow-2xl backdrop-blur-md transition-all">
      
      {/* Dynamic Header */}
      <div className="mb-6 mt-2 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-8 w-8 rounded-lg text-slate-400 transition-all hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="m-0 text-xl font-semibold tracking-tight text-white">
          {selectedGame ? `Modding: ${selectedGame.title}` : "Select Game to Mod"}
        </h2>
      </div>

      {/* View Controller */}
      {!selectedGame ? (
        <GameGridView onSelectGame={setSelectedGame} />
      ) : (
        <ModSelectionView game={selectedGame} steamPath={steamPath} />
      )}
      
    </div>
  );
}

function GameGridView({ onSelectGame }: { onSelectGame: (game: Game) => void }) {
  return (
    <div className="grid w-full animate-in fade-in zoom-in-95 grid-cols-2 gap-6 sm:grid-cols-4 duration-200">
      {GAMES.map((game) => (
        <div
          key={game.id}
          onClick={() => game.available && onSelectGame(game)}
          className={`group relative flex aspect-2/3 w-full flex-col items-center justify-center overflow-hidden rounded-xl border transition-all duration-300 ${
            game.available
              ? "cursor-pointer border-white/10 bg-slate-900/50 hover:scale-105 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20"
              : "cursor-not-allowed border-white/5 bg-slate-900/20 opacity-60"
          }`}
        >
          {game.imageUrl ? (
            <img
              src={game.imageUrl}
              alt={game.title}
              className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
            />
          ) : (
            <Gamepad2 className="mb-2 h-8 w-8 text-slate-600" />
          )}

          {/* Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-900/20 to-transparent opacity-100 transition-opacity duration-300" />

          {/* Title Plate */}
          <div className="absolute bottom-0 w-full p-4 text-center">
            <span className="text-sm font-semibold tracking-wide text-slate-200 group-hover:text-white">
              {game.title}
            </span>
          </div>
          
          {/* "Coming Soon" Badge Overlay */}
          {!game.available && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-[2px]">
                  <span className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-xs font-bold uppercase text-slate-400">
                    Coming Soon
                  </span>
              </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ModSelectionView({ game, steamPath }: { game: Game, steamPath: string }) {
  const [downloadingModId, setDownloadingModId] = useState<string | null>(null);

  const handleInstall = async (mod: Mod) => {
    if (!steamPath) {
      toast.error("Installation Failed", { description: "Steam directory is not configured." });
      return;
    }

    setDownloadingModId(mod.id);
    const toastId = toast.loading(`Downloading ${mod.name}...`);

    try {
      const targetDir = `${steamPath}\\steamapps\\common\\${game.identifier}${mod.location || ""}`;

      await DownloadAndExtractMod(mod.downloadUrl, targetDir);
      
      toast.success(`${mod.name} Installed!`, { 
        id: toastId,
        description: "Mod files were extracted successfully." 
      });
    } catch (error) {
      toast.error(`Failed to install ${mod.name}`, { 
        id: toastId,
        description: String(error) 
      });
    } finally {
      setDownloadingModId(null);
    }
  };

  return (
    <div className="flex w-full animate-in fade-in slide-in-from-right-4 flex-col gap-4 duration-200">
      
      {/* Selected Game Profile Card */}
      <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-slate-900/40 p-4">
        {game.imageUrl ? (
             <img src={game.imageUrl} alt={game.title} className="h-20 w-14 rounded object-cover shadow-md" />
        ) : (
             <div className="flex h-20 w-14 items-center justify-center rounded bg-slate-800">
                 <Gamepad2 className="h-6 w-6 text-slate-600"/>
             </div>
        )}
        <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-400">Target Configuration</span>
            <span className="text-lg font-semibold text-white">{game.title}</span>
        </div>
      </div>
      
      {/* Dynamic Mod List Interface */}
      <div className="mt-2 flex flex-col gap-3">
        {game.mods && game.mods.length > 0 ? (
          game.mods.map((mod) => (
            <div key={mod.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/40 p-4 transition-all hover:bg-slate-800/60">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/5 bg-slate-800">
                  <Box className="h-5 w-5 text-slate-400" />
                </div>
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-white">{mod.name}</span>
                    <span className="text-xs font-medium text-slate-500">v{mod.version}</span>
                    {mod.isRequired && (
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-400">
                        Required
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-slate-400">by {mod.author}</span>
                  <p className="mt-1 text-xs text-slate-500">{mod.description}</p>
                </div>
              </div>
              
              <Button 
                variant="outline"
                disabled={downloadingModId !== null}
                className="h-9 gap-2 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={() => handleInstall(mod)}
              >
                {downloadingModId === mod.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Installing
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Install
                  </>
                )}
              </Button>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-900/20 p-12 text-center">
            <Info className="mb-4 h-10 w-10 text-slate-500" />
            <h3 className="mb-2 text-lg font-medium text-slate-300">No Mods Available</h3>
            <p className="text-sm text-slate-500">
              There are currently no mods configured for <span className="text-slate-300">{game.title}</span>.
            </p>
          </div>
        )}
      </div>
      
    </div>
  );
}