import { CheckFile, ForceClose, SelectDirectory, Install, Execute, RenameFile, DeleteFile, LaunchAndExit, SaveConfig, LoadConfig } from "../wailsjs/go/main/App";
import { useState, useEffect } from 'react';
import './App.css';
import { TitleBar } from "./components/TItleBar";

function App() {
    const [page, setPage] = useState<number>(1);
    const [isNavigating, setIsNavigating] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    const [steamExists, setSteamExists] = useState<string>('Checking...');
    const [lumaExists, setLumaExists] = useState<string>('Checking...');

    const [installStatus, setInstallStatus] = useState<string>('Ready');
    const [isInstalling, setIsInstalling] = useState<boolean>(false);

    const [steamPath, setSteamPath] = useState<string>("");

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const navigateToPage = async (_target: number) => {
        setIsNavigating(true);
        await delay(200);
        setPage(_target);
        setIsNavigating(false);
    };

    const verifySteam = async (_path: string = steamPath) => {
        if (!_path) return false;
        const targetFile = `${_path}\\steam.exe`;
        const exists = await CheckFile(targetFile);
        setSteamExists(exists ? 'Found' : 'Missing');
        return exists;
    }

    const verifyLuma = async (_path: string = steamPath) => {
        if (!_path) return false;
        const targetFile = `${_path}\\user32.dll`;
        const exists = await CheckFile(targetFile);
        setLumaExists(exists ? 'Active' : 'Not Installed');
        return exists;
    };

    const handleRefresh = async (_path: string = steamPath) => {
        if (!_path) return;
        setIsRefreshing(true);
        setSteamExists('Checking...');
        setLumaExists('Checking...');
        await delay(500);
        await Promise.all([verifySteam(_path), verifyLuma(_path)]);
        setIsRefreshing(false);
    };

    const selectFolder = async () => {
        try {
            const result = await SelectDirectory("Select your Steam folder");
            if (result && result.trim() !== "") {
                setSteamPath(result);
                await SaveConfig(result);
                await handleRefresh(result);
            }
        } catch (err) { alert(`Error choosing directory: ${err}`) }
    };

    useEffect(() => {
        const initializeConfigAndPaths = async () => {
            const savedPath = await LoadConfig();
            setSteamPath(savedPath.steamPath);
            await Promise.all([verifySteam(savedPath.steamPath), verifyLuma(savedPath.steamPath)]);
        };
        
        initializeConfigAndPaths();
    }, []);

    const handleInstall = async () => {
        setIsInstalling(true);
        try {
            setInstallStatus('Closing Steam forcefully...');
            await ForceClose("steam.exe");
            await delay(1000);
            
            setInstallStatus('Downloading assets...');
            await Install("https://github.com/yuerei/LumInstaller/releases/download/v0.1.0/Luma.zip", "luma", steamPath);
            await delay(800);
            
            setInstallStatus('Flushing app cache blocks...');
            const _lumaExePath = `${steamPath}\\DeleteSteamAppCache.exe`;
            await Execute(_lumaExePath);
            await delay(800);

            setInstallStatus('Configuring system bindings...');
            const _lumaPatchPathOld = `${steamPath}\\user32SF.dll`;
            const _lumaPatchPath = `${steamPath}\\user32.dll`;
            await RenameFile(_lumaPatchPathOld, _lumaPatchPath);
            await delay(800);

            setInstallStatus('Cleaning up temporary tools...');
            await DeleteFile(_lumaExePath);
            await delay(500);

            setInstallStatus('✨ Installation Complete!');            
            await delay(1500);
        
            await handleRefresh();
            setPage(1);
            setIsInstalling(false);
            setInstallStatus('Ready');
        } catch (err) {
            setInstallStatus(`Error encountered: ${err}`);
            setIsInstalling(false);
        }
    };

    const handleLaunchAndClose = async () => {
        try { await LaunchAndExit(steamPath + "\\steam.exe"); }
        catch (err) { alert(`Could not launch Steam automatically: ${err}`); }
    };

    const isSteamFound = steamExists === 'Found';
    const isLumaFound = lumaExists === 'Active';
    const isEverythingReady = isSteamFound && isLumaFound;

    const transitionClass = isNavigating ? 'fade-out' : 'fade-in';
    return (<>
    <div className="flex flex-col h-screen w-screen bg-[#111827] text-foreground overflow-hidden">
        <TitleBar />
        
        <div id="app" className="flex-1 overflow-auto p-6">
            {/* PAGE 1: DASHBOARD */}
            {page === 1 && (
                <div className={`status-card ${transitionClass}`}>
                    <div className="card-header">
                        <div className={`status-indicator-dot ${isEverythingReady ? 'dot-success' : 'dot-warning'}`}></div>
                        <h2 className="card-title">
                            {isEverythingReady ? "Luma Ready" : "Luma Not Installed"}
                        </h2>
                    </div>
                    
                    <div className="status-container">
                        <div className="status-row path-selector-row" onClick={selectFolder} title="Click to select a custom Steam folder location">
                            <div className="path-text-wrapper">
                                <span className="label">Steam Target Directory</span>
                                <span className="path-subtext">{steamPath}</span>
                            </div>
                            <span className="badge badge-change">Edit</span>
                        </div>
                        <div className="status-row">
                            <span className="label">Steam Platform</span>
                            <span className={`badge ${isRefreshing ? 'badge-refreshing' : isSteamFound ? 'badge-success' : 'badge-danger'}`}>
                                {steamExists}
                            </span>
                        </div>
                        <div className="status-row">
                            <span className="label">GreenLuma Hook</span>
                            <span className={`badge ${isRefreshing ? 'badge-refreshing' : isLumaFound ? 'badge-success' : 'badge-muted'}`}>
                                {lumaExists}
                            </span>
                        </div>
                    </div>

                    <div className="action-row">
                        {isEverythingReady ? (
                            <button onClick={handleLaunchAndClose} className="btn-success">
                                Launch Steam →
                            </button>
                        ) : (
                            <>
                                <button onClick={() => handleRefresh(steamPath)} className="btn-accent" disabled={isRefreshing}>
                                    Refresh Status
                                </button>
                                {isSteamFound && !isLumaFound && (
                                    <button onClick={() => navigateToPage(2)} className="btn-primary">
                                        Install Luma →
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* PAGE 2: DEPLOYMENT PROFILE OVERVIEW */}
            {page === 2 && (
                <div className={`status-card ${transitionClass}`}>
                    <h2 className="card-title">Installation Overview</h2>
                    <br />
                    <p className="card-description">
                        Steam path verified. The installer will start installing the Luma hook into your Steam installation. Please ensure that Steam is closed before proceeding to avoid any file conflicts.
                    </p>
                    
                    <div className="action-row horizontal">
                        <button onClick={() => navigateToPage(1)} className="btn-accent">
                            ← Back
                        </button>
                        <button className="btn-primary" onClick={() => navigateToPage(3)}>
                            Install Luma →
                        </button>
                    </div>
                </div>
            )}

            {/* PAGE 3: RUNTIME SAFETY EXECUTOR */}
            {page === 3 && (
                <div className={`status-card warning-border ${transitionClass}`}>
                    <h2 className="card-title warning-text">⚠️ Installation Conflict Check</h2>
                    <br />
                    <p className="card-description">
                        The utility tool will forcefully shut down any running active instances of Steam to prevent local system file-lock conflicts.
                    </p>

                    {isInstalling && (
                        <div className="progress-container">
                            <div className="spinner"></div>
                            <p className="install-progress">{installStatus}</p>
                        </div>
                    )}
                    
                    <div className="action-row horizontal">
                        <button onClick={() => navigateToPage(2)} className="btn-accent" disabled={isInstalling}>
                            ← Back
                        </button>
                        <button 
                            className="btn-primary btn-warning-action" 
                            onClick={handleInstall} 
                            disabled={isInstalling}
                        >
                            {isInstalling ? 'Processing Execution...' : 'Install Luma →'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    </div>
    </>);
}

export default App;
