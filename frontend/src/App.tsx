import { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";

import { CheckFile, SelectDirectory, DetectSteamPath, SaveConfig, LoadConfig } from "../wailsjs/go/main/App";
import { TitleBar } from "./components/TitleBar";
import { Home } from "./components/Home";
import { LumaPatch } from "./components/LumaPatch";
import { Mods } from "./components/Mods";

type SavedConfigType = { steamPath: string; };
type FeaturePathway = 'home' | 'luma' | 'mods';

export default function App() {
    const [pathway, setPathway] = useState<FeaturePathway>('home');
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    const [isSteamFound, setIsSteamFound] = useState<boolean>(false);
    const [isLumaFound, setIsLumaFound] = useState<boolean>(false);
    const [steamPath, setSteamPath] = useState<string>("");

    const verifySteam = useCallback(async (path: string): Promise<boolean> => {
        if (!path) return false;
        const exists = await CheckFile(`${path}\\steam.exe`);
        setIsSteamFound(exists);
        return exists;
    }, []);
    
    const verifyLuma = useCallback(async (path: string): Promise<boolean> => {
        if (!path) return false;
        const exists = await CheckFile(`${path}\\user32.dll`);
        setIsLumaFound(exists);
        return exists;
    }, []);

    const handleRefresh = async (path: string = steamPath) => {
        if (!path) return;
        setIsRefreshing(true);
        await Promise.all([verifySteam(path), verifyLuma(path)]);
        setIsRefreshing(false);
        toast.success("Status Updated", { description: "System files re-scanned successfully." });
    };

    const selectFolder = async () => {
        try {
            const result = await SelectDirectory("Select your Steam folder");
            if (result?.trim()) {
                setSteamPath(result);
                await SaveConfig(result);
                await handleRefresh(result);
                toast.success("Configuration Saved", { description: `Target path updated to ${result}` });
            }
        } catch (err) { 
            toast.error("Directory Error", { description: `Could not configure directory: ${err}` });
        }
    };

    useEffect(() => {
        const initializeConfigAndPaths = async () => {
            try {
                const saved = (await LoadConfig()) as SavedConfigType;
                let path = saved?.steamPath || "";

                if (!path) {
                    const runningPath = await DetectSteamPath();
                    if (runningPath) {
                        path = runningPath;
                        await SaveConfig(path); 
                        toast.success("Steam Path Auto-Detected", { description: `Found active directory at: ${path}` });
                    }
                }

                setSteamPath(path);
                await Promise.all([verifySteam(path), verifyLuma(path)]);
            } catch (err) {
                toast.error("Initialization Error", { description: "Failed to read configuration mapping parameters." });
            }
        };
        
        initializeConfigAndPaths();
    }, [verifySteam, verifyLuma]);
    
    const isPatchReady = isSteamFound && isLumaFound;
        
    return (
        <div className="flex h-screen w-screen select-none flex-col overflow-hidden bg-[#0f172a] bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_100%)] font-sans text-slate-100">
            <TitleBar />
            <div id="app" className="box-border flex flex-1 flex-col items-center justify-center overflow-auto p-6">
                <div className="flex w-full max-w-2xl items-center justify-center opacity-100 transition-opacity duration-200">
                    {pathway === 'home' && (
                        <Home onSelectPage={setPathway} isPatchReady={isPatchReady} />
                    )}

                    {pathway === 'luma' && (
                        <LumaPatch 
                            steamPath={steamPath}
                            isSteamFound={isSteamFound}
                            isLumaFound={isLumaFound}
                            isPatchReady={isPatchReady}
                            isRefreshing={isRefreshing}
                            handleRefresh={handleRefresh}
                            onSelectFolder={selectFolder}
                            onBack={() => setPathway('home')}
                        />
                    )}

                    {pathway === 'mods' && (
                        <Mods onCancel={() => setPathway('home')} steamPath={steamPath} />
                    )}
                </div>
            </div>
        </div>
    );
}