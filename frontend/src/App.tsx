import { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";

import { CheckFile, SelectDirectory, DetectRunningSteamPath, SaveConfig, LoadConfig } from "../wailsjs/go/main/App";
import { TitleBar } from "./components/TitleBar";

import { Home } from "./components/Home";
import { LumaPatch } from "./components/LumaPatch";
import { Mods } from "./components/Mods";

type SavedConfigType = { steamPath: string; };
type FeaturePathway = 'home' | 'luma' | 'mods';

const DELAY_MS = { REFRESH: 500 } as const;

export default function App() {
    const [pathway, setPathway] = useState<FeaturePathway>('home');
    const [isNavigating, setIsNavigating] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [steamExists, setSteamExists] = useState<string>('Checking...');
    const [lumaExists, setLumaExists] = useState<string>('Checking...');
    const [steamPath, setSteamPath] = useState<string>("");

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const verifySteam = useCallback(async (path: string): Promise<boolean> => {
        if (!path) {
            setSteamExists('Missing');
            return false;
        }
        const exists = await CheckFile(`${path}\\steam.exe`);
        setSteamExists(exists ? 'Found' : 'Missing');
        return exists;
    }, []);

    const verifyLuma = useCallback(async (path: string): Promise<boolean> => {
        if (!path) {
            setLumaExists('Not Installed');
            return false;
        }
        const exists = await CheckFile(`${path}\\user32.dll`);
        setLumaExists(exists ? 'Active' : 'Not Installed');
        return exists;
    }, []);

    const handleRefresh = async (path: string = steamPath) => {
        if (!path) return;
        setIsRefreshing(true);
        setSteamExists('Checking...');
        setLumaExists('Checking...');
        await delay(DELAY_MS.REFRESH);
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
                    const runningPath = await DetectRunningSteamPath();
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

    const handleNavigate = async (target: FeaturePathway) => {
        if (target === pathway) return;
        setIsNavigating(true); 
        await delay(200);   
        setPathway(target); 
        setIsNavigating(false);       
    };

    const isSteamFound = steamExists === 'Found';
    const isLumaFound = lumaExists === 'Active';
    const isPatchReady = isSteamFound && isLumaFound;

    const transitionClass = isNavigating 
        ? 'opacity-0 scale-95 transition-all duration-200 ease-out' 
        : 'opacity-100 scale-100 transition-all duration-200 ease-out';
        
    return (
        <div className="flex flex-col h-screen w-screen bg-[#0f172a] bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_100%)] text-slate-100 overflow-hidden font-sans select-none">
            <TitleBar />
            <div id="app" className="flex-1 flex flex-col justify-center items-center overflow-auto p-6 box-border">
                <div className={`w-full max-w-2xl flex justify-center items-center ${transitionClass}`}>
                {pathway === 'home' && (
                    <Home onSelectFeature={(feat) => handleNavigate(feat)} isPatchReady={isPatchReady} />
                )}  

                {pathway === 'luma' && (
                    <LumaPatch 
                        steamPath={steamPath}
                        isSteamFound={isSteamFound}
                        steamExists={steamExists}
                        isLumaFound={isLumaFound}
                        lumaExists={lumaExists}
                        isPatchReady={isPatchReady}
                        isRefreshing={isRefreshing}
                        handleRefresh={handleRefresh}
                        onSelectFolder={selectFolder}
                        onBack={() => handleNavigate('home')}
                    />
                )}

                {pathway === 'mods' && (
                    <Mods onCancel={() => handleNavigate('home')} />
                )}
                </div>
            </div>
        </div>
    );
}