import { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";

import { CheckFile, SelectDirectory, DetectSteamPath, SaveConfig, LoadConfig } from "../wailsjs/go/main/App";
import { TitleBar } from "./components/TitleBar";
import { Home } from "./components/Home";
import { LumaPatch } from "./components/LumaPatch";
import { Mods } from "./components/Mods";

type SavedConfigType = { steamPath: string; luma: boolean; };
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
        try {
            const steamOk = await verifySteam(path);
            const lumaOk = await verifyLuma(path);
            
            await SaveConfig({ steamPath: path, luma: lumaOk });
        } catch (err) {
            console.error("Failed executing configuration save verification loop:", err);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        async function initializeConfiguration() {
            try {
                let currentConfig = await LoadConfig();
                let chosenPath = currentConfig.steamPath;

                if (!chosenPath) { chosenPath = await DetectSteamPath(); }

                setSteamPath(chosenPath);
                
                const steamOk = await verifySteam(chosenPath);
                const lumaOk = await verifyLuma(chosenPath);

                await SaveConfig({ steamPath: chosenPath, luma: lumaOk });
            } catch (error) {
                toast.error("Initialization Alert", {
                    description: "Unable to reconstruct local initialization variables safely."
                });
            }
        }
        initializeConfiguration();
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
                            onSelectFolder={async () => {
                                const selected = await SelectDirectory("Select your Steam folder");
                                if (selected) {
                                    setSteamPath(selected);
                                    handleRefresh(selected);
                                }
                            }}
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