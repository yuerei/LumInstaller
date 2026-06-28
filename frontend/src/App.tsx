import { CheckFile, CheckFolder, ForceClose, Install, Execute, RenameFile, DeleteFile, LaunchAndExit } from "../wailsjs/go/main/App";
import { useState, useEffect } from 'react';
import './App.css';

function App() {
    const [page, setPage] = useState<number>(1);
    const [isNavigating, setIsNavigating] = useState<boolean>(false);
    const [steamExists, setSteamExists] = useState<string>('Checking...');
    const [managerExists, setManagerExists] = useState<string>('Checking...');
    const [installStatus, setInstallStatus] = useState<string>('Ready');
    const [isInstalling, setIsInstalling] = useState<boolean>(false);

    const steamPath = "C:\\Program Files (x86)\\Steam";
    const managerPath = "C:\\Program Files (x86)\\Steam\\user32.dll";

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const navigateToPage = async (targetPage: number) => {
        setIsNavigating(true);
        await delay(200);
        setPage(targetPage);
        setIsNavigating(false);
    };

    const verifySteamPath = async () => {
        const exists = await CheckFolder(steamPath);
        setSteamExists(exists ? 'Found' : 'Missing Steam');
    };

    const verifyManagerPath = async () => {
        const exists = await CheckFile(managerPath);
        setManagerExists(exists ? 'Active' : 'Not Installed');
    };

    const handleRefresh = async () => {
        setSteamExists('Checking...');
        setManagerExists('Checking...');
        await Promise.all([verifySteamPath(), verifyManagerPath()]);
    };

    useEffect(() => {
        verifySteamPath();
        verifyManagerPath();
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
            const managerExePath = `${steamPath}\\DeleteSteamAppCache.exe`;
            await Execute(managerExePath);
            await delay(800);

            setInstallStatus('Configuring system bindings...');
            const oldExePath = `${steamPath}\\user32SF.dll`;
            const newExePath = managerPath;
            await RenameFile(oldExePath, newExePath);
            await delay(800);

            setInstallStatus('Cleaning up temporary tools...');
            await DeleteFile(managerExePath);
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
        try {
            await LaunchAndExit(steamPath + "\\steam.exe");
        } catch (err) {
            alert(`Could not launch Steam automatically: ${err}`);
        }
    };

    const isSteamFound = steamExists === 'Found';
    const isManagerFound = managerExists === 'Active';
    const isEverythingReady = isSteamFound && isManagerFound;

    const transitionClass = isNavigating ? 'fade-out' : 'fade-in';

    return (
        <div id="app">
            {/* PAGE 1: DASHBOARD */}
            {page === 1 && (
                <div className={`status-card ${transitionClass}`}>
                    <div className="card-header">
                        <div className={`status-indicator-dot ${isEverythingReady ? 'dot-success' : 'dot-warning'}`}></div>
                        <h2 className="card-title">
                            {isEverythingReady ? "System Ready" : "System Guard"}
                        </h2>
                    </div>
                    
                    <div className="status-container">
                        <div className="status-row">
                            <span className="label">Steam Platform</span>
                            <span className={`badge ${isSteamFound ? 'badge-success' : 'badge-danger'}`}>
                                {steamExists}
                            </span>
                        </div>
                        <div className="status-row">
                            <span className="label">GreenLuma Hook</span>
                            <span className={`badge ${isManagerFound ? 'badge-success' : 'badge-muted'}`}>
                                {managerExists}
                            </span>
                        </div>
                    </div>

                    <div className="action-row">
                        {isEverythingReady ? (
                            <button onClick={handleLaunchAndClose} className="btn-success">
                                Launch Steam Platform
                            </button>
                        ) : (
                            <>
                                <button onClick={handleRefresh} className="btn-accent" disabled={steamExists === 'Checking...'}>
                                    Scan System Env
                                </button>
                                {isSteamFound && !isManagerFound && (
                                    <button onClick={() => navigateToPage(2)} className="btn-primary">
                                        Deploy Manager Hook →
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
                    <h2 className="card-title">Deployment Overview</h2>
                    <br />
                    <p className="card-description">
                        Target path verified. The framework will integrate custom dependency hooks directly into your application directory variables.
                    </p>
                    
                    <div className="action-row horizontal">
                        <button onClick={() => navigateToPage(1)} className="btn-accent">
                            ← Back
                        </button>
                        <button className="btn-primary" onClick={() => navigateToPage(3)}>
                            Initialize Setup
                        </button>
                    </div>
                </div>
            )}

            {/* PAGE 3: RUNTIME SAFETY EXECUTOR */}
            {page === 3 && (
                <div className={`status-card warning-border ${transitionClass}`}>
                    <h2 className="card-title warning-text">⚠️ Application Conflict Check</h2>
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
                            Abort
                        </button>
                        <button 
                            className="btn-primary btn-warning-action" 
                            onClick={handleInstall} 
                            disabled={isInstalling}
                        >
                            {isInstalling ? 'Processing Execution...' : 'Confirm & Initialize'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;