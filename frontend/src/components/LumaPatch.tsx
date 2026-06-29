import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft } from "lucide-react";

interface LumaPatchProps {
    page: number;
    onNavigatePage: (target: number) => void;

    steamPath: string;
    isSteamFound: boolean;
    steamExists: string;
    isLumaFound: boolean;
    lumaExists: string;
    isPatchReady: boolean;

    isRefreshing: boolean;
    handleRefresh: (steamPath: string) => void;
    isInstalling: boolean;
    installStatus: string;
    onInstall: () => void;
    onSelectFolder: () => void;
    handleLaunchAndClose: () => void;
    onBack: () => void;
}

export function LumaPatch({
    page,
    onNavigatePage,
    
    steamPath,
    isSteamFound,
    steamExists,
    isLumaFound,
    lumaExists,
    isPatchReady,
    
    isRefreshing,
    handleRefresh,
    isInstalling,
    installStatus,
    onInstall,
    onSelectFolder,
    handleLaunchAndClose,
    onBack,
}: LumaPatchProps) {
    return (
        <div className="bg-slate-800/70 backdrop-blur-md border border-white/10 rounded-2xl w-full p-8 shadow-2xl relative">
        {/* PAGE 1: DASHBOARD */}
        {page === 1 && (<> 
        <div className="flex items-center gap-3 mb-6 mt-2">
            <div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onBack()}
                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </div>
            <h2 className="m-0 text-[1.35rem] font-semibold text-white tracking-tight">
                Luma Patch
            </h2>
        </div>
          
        <div className="flex flex-col gap-3.5 mb-8">
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex justify-between items-center p-3 px-4 bg-slate-900/40 rounded-xl border border-white/5 cursor-pointer transition-all duration-200 hover:bg-white/10 hover:border-white/15" onClick={onSelectFolder}>
                        <div className="flex flex-col gap-1 text-left max-w-[80%]">
                            <span className="text-[0.875rem] text-slate-400 font-medium">Steam Target Directory</span>
                            <span className="text-[0.75rem] text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">{steamPath || "None Selected"}</span>
                        </div>
                        <span className="text-[0.75rem] font-bold p-1 px-2.5 rounded-md uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/20">Edit</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-slate-950 border-white/10 text-slate-200 text-xs shadow-lg">
                    Click to change your default Steam folder location
                </TooltipContent>
            </Tooltip>

            <div className="flex justify-between items-center p-3 px-4 bg-slate-900/40 rounded-xl border border-white/5">
                <span className="text-[0.875rem] text-slate-400 font-medium">Steam Platform</span>
                <span className={`text-[0.75rem] font-bold p-1 px-2.5 rounded-md uppercase tracking-wider ${isRefreshing ? 'bg-slate-700/20 text-slate-400' : isSteamFound ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                    {steamExists}
                </span>
            </div>

            <div className="flex justify-between items-center p-3 px-4 bg-slate-900/40 rounded-xl border border-white/5">
                <span className="text-[0.875rem] text-slate-400 font-medium">GreenLuma Hook</span>
                <span className={`text-[0.75rem] font-bold p-1 px-2.5 rounded-md uppercase tracking-wider ${isRefreshing ? 'bg-slate-700/20 text-slate-400' : isLumaFound ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/20 text-slate-400'}`}>
                    {lumaExists}
                </span>
            </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
            {isPatchReady ? (
                <Button onClick={handleLaunchAndClose} className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all">
                    Launch Steam →
                </Button>
            ) : (<>
                <Button variant="outline" onClick={() => handleRefresh(steamPath)} className="w-full h-11 border-white/15 text-slate-200 bg-black/5 hover:bg-white/5 hover:text-white rounded-xl transition-all" disabled={isRefreshing}>
                    Refresh Status
                </Button>
                {isSteamFound && !isLumaFound && (
                    <Button onClick={() => onNavigatePage(2)} className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-[0_4px_12px_rgba(59,130,246,0.2)] transition-all">
                        Install Luma →
                    </Button>
                )}
            </>)}
        </div>
        </>)}

        {/* PAGE 2: DEPLOYMENT PROFILE OVERVIEW */}
        {page === 2 && (<>
            <h2 className="m-0 text-[1.35rem] font-semibold text-white tracking-tight">Installation Overview</h2>
            <br />
            <p className="text-slate-400 text-[0.875rem] leading-relaxed m-0 mb-7 text-left">
                Steam path verified. The installer will start installing the Luma hook into your Steam installation. Please ensure that Steam is closed before proceeding to avoid any file conflicts.
            </p>
            
            <div className="flex gap-3 w-full">
                <Button variant="outline" onClick={() => onNavigatePage(1)} className="flex-1 h-11 border-white/15 text-slate-300 bg-black/5 hover:bg-white/5 hover:text-white rounded-xl transition-all">
                    ← Back
                </Button>
                <Button onClick={() => onNavigatePage(3)} className="flex-1 h-11 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-[0_4px_12px_rgba(59,130,246,0.2)] transition-all">
                    Install Luma →
                </Button>
            </div>
        </>)}

        {/* PAGE 3: RUNTIME SAFETY EXECUTOR */}
        {page === 3 && (<>
            <h2 className="m-0 text-[1.35rem] font-semibold tracking-tight text-amber-400">Important Notice</h2>
            <br />
            <p className="text-slate-400 text-[0.875rem] leading-relaxed m-0 mb-7 text-left">
                The utility tool will forcefully shut down any running active instances of Steam to prevent local system file-lock conflicts.
            </p>

            {isInstalling && (
                <div className="flex items-center gap-4 bg-slate-950/50 p-4 rounded-xl mb-6 border border-white/5">
                    <div className="w-4 h-4 border-2 border-purple-500/20 border-top-purple-400 rounded-full animate-spin"></div>
                    <p className="text-[0.875rem] text-slate-200 m-0 font-medium min-w-50 text-left">{installStatus}</p>
                </div>
            )}
            
            <div className="flex gap-3 w-full">
                <Button variant="outline" onClick={() => onNavigatePage(2)} className="flex-1 h-11 border-white/15 text-slate-300 bg-black/5 hover:bg-white/5 hover:text-white rounded-xl transition-all" disabled={isInstalling}>
                    ← Back
                </Button>
                <Button 
                    onClick={onInstall} 
                    disabled={isInstalling}
                    className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-xl shadow-[0_4px_12px_rgba(234,179,8,0.2)] transition-all"
                >
                    {isInstalling ? 'Processing...' : 'Install Luma →'}
                </Button>
            </div>
        </>)}
    </div>
  );
}