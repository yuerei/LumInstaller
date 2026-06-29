import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { DeleteFile, Execute, ForceClose, Install, LaunchAndExit, RenameFile } from "../../wailsjs/go/main/App";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface LumaPatchProps {
    steamPath: string;
    isSteamFound: boolean;
    isLumaFound: boolean;
    isPatchReady: boolean;
    isRefreshing: boolean;
    handleRefresh: (steamPath: string) => void;
    onSelectFolder: () => void;
    onBack: () => void;
}

export function LumaPatch(props: LumaPatchProps) {
    const [page, setPage] = useState<number>(1);

    return (
        <div className="relative w-3/5 rounded-2xl border border-white/10 bg-slate-800/70 p-8 shadow-2xl backdrop-blur-md transition-all">
            {page === 1 && <DashboardView {...props} onNavigatePage={setPage} />}
            {page === 2 && <OverviewView onNavigatePage={setPage} />}
            {page === 3 && <ExecutorView steamPath={props.steamPath} handleRefresh={props.handleRefresh} onNavigatePage={setPage} />}
        </div>
    );
}

function DashboardView({ steamPath, isSteamFound, isLumaFound, isPatchReady, isRefreshing, handleRefresh, onSelectFolder, onBack, onNavigatePage }: any) {
    const handleLaunchAndClose = async () => {
        try { 
            await LaunchAndExit(`${steamPath}\\steam.exe`); 
        } catch (err) { 
            toast.error("Launch Error", { description: `Could not launch Steam automatically: ${err}` });
        }
    };

    return (
        <div className="animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-6 mt-2 flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-lg text-slate-400 transition-all hover:bg-white/5 hover:text-white">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h2 className="m-0 text-xl font-semibold tracking-tight text-white">Luma Patch</h2>
            </div>
              
            <div className="mb-8 flex flex-col gap-3.5">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div tabIndex={0} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-slate-900/40 p-3 px-4 transition-all duration-200 hover:border-white/15 hover:bg-white/10 focus:outline-none" onClick={onSelectFolder}>
                            <div className="flex max-w-[80%] flex-col gap-1 text-left">
                                <span className="text-sm font-medium text-slate-400">Steam Target Directory</span>
                                <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-500">{steamPath || "None Selected"}</span>
                            </div>
                            <span className="rounded-md border border-blue-500/20 bg-blue-500/15 p-1 px-2.5 text-xs font-bold uppercase tracking-wider text-blue-400">Edit</span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-45 border-white/10 bg-slate-950 text-xs text-slate-200 shadow-lg">
                        Click to change your default Steam folder location
                    </TooltipContent>
                </Tooltip>

                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/40 p-3 px-4">
                    <span className="text-sm font-medium text-slate-400">Steam Platform</span>
                    <span className={`rounded-md p-1 px-2.5 text-xs font-bold uppercase tracking-wider ${isRefreshing ? 'bg-slate-700/20 text-slate-400' : isSteamFound ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                        {isRefreshing ? 'Checking...' : isSteamFound ? 'Found' : 'Missing'}
                    </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/40 p-3 px-4">
                    <span className="text-sm font-medium text-slate-400">GreenLuma Hook</span>
                    <span className={`rounded-md p-1 px-2.5 text-xs font-bold uppercase tracking-wider ${isRefreshing ? 'bg-slate-700/20 text-slate-400' : isLumaFound ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/20 text-slate-400'}`}>
                        {isRefreshing ? 'Checking...' : isLumaFound ? 'Active' : 'Not Installed'}
                    </span>
                </div>
            </div>

            <div className="flex w-full flex-col gap-3">
                {isPatchReady ? (
                    <Button onClick={handleLaunchAndClose} className="h-11 w-full rounded-xl bg-emerald-500 font-semibold text-white shadow-md shadow-emerald-500/30 transition-all hover:bg-emerald-600">
                        Launch Steam →
                    </Button>
                ) : (
                    <>
                        <Button variant="outline" onClick={() => handleRefresh(steamPath)} className="h-11 w-full rounded-xl border-white/15 bg-black/5 text-slate-200 transition-all hover:bg-white/5 hover:text-white" disabled={isRefreshing}>
                            Refresh Status
                        </Button>
                        {isSteamFound && !isLumaFound && (
                            <Button onClick={() => onNavigatePage(2)} className="h-11 w-full rounded-xl bg-blue-500 font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-600">
                                Install Luma →
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
       
function OverviewView({ onNavigatePage }: any) {
    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            <h2 className="m-0 text-xl font-semibold tracking-tight text-white">Installation Overview</h2>
            <br />
            <p className="m-0 mb-7 text-left text-sm leading-relaxed text-slate-400">
                Steam path verified. The installer will start installing the Luma hook into your Steam installation. Please ensure that Steam is closed before proceeding to avoid any file conflicts.
            </p>
            
            <div className="flex w-full gap-3">
                <Button variant="outline" onClick={() => onNavigatePage(1)} className="h-11 flex-1 rounded-xl border-white/15 bg-black/5 text-slate-300 transition-all hover:bg-white/5 hover:text-white">
                    ← Back
                </Button>
                <Button onClick={() => onNavigatePage(3)} className="h-11 flex-1 rounded-xl bg-blue-500 font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-600">
                    Install Luma →
                </Button>
            </div>
        </div>
    );
}

function ExecutorView({ steamPath, handleRefresh, onNavigatePage }: any) {
    const [installStatus, setInstallStatus] = useState<string>('Ready');
    const [isInstalling, setIsInstalling] = useState<boolean>(false);

    const handleInstall = async () => {
        setIsInstalling(true);
        try {
            setInstallStatus('Closing Steam forcefully...');
            await ForceClose("steam.exe");
            
            setInstallStatus('Downloading assets...');
            await Install("https://github.com/yuerei/LumInstaller/releases/download/v0.1.0/Luma.zip", "luma", steamPath);
            
            setInstallStatus('Flushing app cache blocks...');
            const lumaExePath = `${steamPath}\\DeleteSteamAppCache.exe`;
            await Execute(lumaExePath);

            setInstallStatus('Configuring system bindings...');
            await RenameFile(`${steamPath}\\user32SF.dll`, `${steamPath}\\user32.dll`);

            setInstallStatus('Cleaning up temporary tools...');
            await DeleteFile(lumaExePath);

            await handleRefresh(steamPath);
            onNavigatePage(1);
            
            toast.success("Installation Complete", { description: "GreenLuma hooks injected successfully!" });
        } catch (err) {
            setInstallStatus(`Error encountered: ${err}`);
            toast.error("Installation Failed", { description: `Execution terminated: ${err}` });
        } finally {
            setIsInstalling(false);
        }
    };

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            <h2 className="m-0 text-xl font-semibold tracking-tight text-amber-400">Important Notice</h2>
            <br />
            <p className="m-0 mb-7 text-left text-sm leading-relaxed text-slate-400">
                The utility tool will forcefully shut down any running active instances of Steam to prevent local system file-lock conflicts.
            </p>

            {isInstalling && (
                <div className="mb-6 flex items-center gap-4 rounded-xl border border-white/5 bg-slate-950/50 p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    <p className="m-0 min-w-12.5 text-left text-sm font-medium text-slate-200">{installStatus}</p>
                </div>
            )}
            
            <div className="flex w-full gap-3">
                <Button variant="outline" onClick={() => onNavigatePage(2)} className="h-11 flex-1 rounded-xl border-white/15 bg-black/5 text-slate-300 transition-all hover:bg-white/5 hover:text-white" disabled={isInstalling}>
                    ← Back
                </Button>
                <Button onClick={handleInstall} disabled={isInstalling} className="h-11 flex-1 rounded-xl bg-amber-500 font-semibold text-slate-900 shadow-md shadow-amber-500/20 transition-all hover:bg-amber-600">
                    {isInstalling ? 'Processing...' : 'Install Luma →'}
                </Button>
            </div>
        </div>
    );
}