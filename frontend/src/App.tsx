import { CheckFile, ForceClose, SelectDirectory, DetectRunningSteamPath, Install, Execute, RenameFile, DeleteFile, LaunchAndExit, SaveConfig, LoadConfig } from "../wailsjs/go/main/App";
import { useState, useEffect, useCallback } from 'react';
import { TitleBar } from "./components/TitleBar";
import { Home } from "./components/Home";
import { LumaPatch } from "./components/LumaPatch";
import { Mods } from "./components/Mods";
import { toast } from "sonner";

type SavedConfigType = {
    steamPath: string;
};

type FeaturePathway = 'home' | 'luma' | 'mods';

const DELAY_MS = {
    NAVIGATE: 200,
    REFRESH: 500,
    FORCE_CLOSE: 1000,
    INSTALL: 800,
    CLEANUP: 500,
    COMPLETE: 1500
} as const;

export default function App() {
    const [pathway, setPathway] = useState<FeaturePathway>('home');
    const [page, setPage] = useState<number>(1);
    const [isNavigating, setIsNavigating] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    const [steamExists, setSteamExists] = useState<string>('Checking...');
    const [lumaExists, setLumaExists] = useState<string>('Checking...');

    const [installStatus, setInstallStatus] = useState<string>('Ready');
    const [isInstalling, setIsInstalling] = useState<boolean>(false);

    const [steamPath, setSteamPath] = useState<string>("");

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const navigateToPage = async (target: number) => {
        setIsNavigating(true);
        await delay(DELAY_MS.NAVIGATE);
        setPage(target);
        setIsNavigating(false);
    };

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
        toast.success("Status Updated", {
            description: "System files re-scanned successfully."
        });
    };

    const selectFolder = async () => {
        try {
            const result = await SelectDirectory("Select your Steam folder");
            if (result?.trim()) {
                setSteamPath(result);
                await SaveConfig(result);
                await handleRefresh(result);
                toast.success("Configuration Saved", {
                    description: `Target path updated to ${result}`
                });
            }
        } catch (err) { 
            toast.error("Directory Error", {
                description: `Could not configure directory: ${err}`
            });
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
                        toast.success("Steam Path Auto-Detected", {
                            description: `Found active directory at: ${path}`
                        });
                    }
                }

                setSteamPath(path);
                await Promise.all([verifySteam(path), verifyLuma(path)]);
            } catch (err) {
                toast.error("Initialization Error", {
                    description: "Failed to read configuration mapping parameters."
                });
            }
        };
        
        initializeConfigAndPaths();
    }, [verifySteam, verifyLuma]);

    const handleInstall = async () => {
        setIsInstalling(true);
        try {
            setInstallStatus('Closing Steam forcefully...');
            await ForceClose("steam.exe");
            await delay(DELAY_MS.FORCE_CLOSE);
            
            setInstallStatus('Downloading assets...');
            await Install("https://github.com/yuerei/LumInstaller/releases/download/v0.1.0/Luma.zip", "luma", steamPath);
            await delay(DELAY_MS.INSTALL);
            
            setInstallStatus('Flushing app cache blocks...');
            const lumaExePath = `${steamPath}\\DeleteSteamAppCache.exe`;
            await Execute(lumaExePath);
            await delay(DELAY_MS.INSTALL);

            setInstallStatus('Configuring system bindings...');
            await RenameFile(`${steamPath}\\user32SF.dll`, `${steamPath}\\user32.dll`);
            await delay(DELAY_MS.INSTALL);

            setInstallStatus('Cleaning up temporary tools...');
            await DeleteFile(lumaExePath);
            await delay(DELAY_MS.CLEANUP);

            setInstallStatus('✨ Installation Complete!');            
            await delay(DELAY_MS.COMPLETE);
        
            await handleRefresh(steamPath);
            setPage(1);
            setIsInstalling(false);
            setInstallStatus('Ready');
            
            toast.success("Installation Complete", {
                description: "GreenLuma hooks injected successfully!"
            });
        } catch (err) {
            setInstallStatus(`Error encountered: ${err}`);
            setIsInstalling(false);
            toast.error("Installation Failed", {
                description: `Execution terminated: ${err}`
            });
        }
    };

    const handleLaunchAndClose = async () => {
        try { 
            await LaunchAndExit(`${steamPath}\\steam.exe`); 
        } catch (err) { 
            toast.error("Launch Error", {
                description: `Could not launch Steam automatically: ${err}`
            });
        }
    };

    const isSteamFound = steamExists === 'Found';
    const isLumaFound = lumaExists === 'Active';
    const isPatchReady = isSteamFound && isLumaFound;

    const transitionClass = isNavigating 
        ? 'opacity-0 scale-95 -translate-y-2 transition-all duration-200 ease-out' 
        : 'opacity-100 scale-100 translate-y-0 transition-all duration-200 ease-out';

    return (
        <div className="flex flex-col h-screen w-screen bg-[#0f172a] bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_100%)] text-slate-100 overflow-hidden font-sans select-none">
            <TitleBar />
            
            <div id="app" className="flex-1 flex flex-col justify-center items-center overflow-auto p-6 box-border">
                <div className={transitionClass}>
                    {pathway === 'home' && (
                        <Home
                            onSelectFeature={(feat) => { setPathway(feat); setPage(1); }}
                            isPatchReady={isPatchReady}
                        />
                    )}

                    {pathway === 'luma' && (
                        <LumaPatch 
                            page={page}
                            onNavigatePage={navigateToPage}

                            steamPath={steamPath}
                            isSteamFound={isSteamFound}
                            steamExists={steamExists}
                            isLumaFound={isLumaFound}
                            lumaExists={lumaExists}
                            isPatchReady={isPatchReady}
                            
                            isRefreshing={isRefreshing}
                            handleRefresh={handleRefresh}
                            isInstalling={isInstalling}
                            installStatus={installStatus}
                            onInstall={handleInstall}
                            onSelectFolder={selectFolder}
                            handleLaunchAndClose={handleLaunchAndClose}
                            onBack={() => setPathway('home')}
                        />
                    )}

                    {pathway === 'mods' && (
                        <Mods 
                            onCancel={() => setPathway('home')}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}