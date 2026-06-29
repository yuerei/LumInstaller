import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HomeProps {
    onSelectFeature: (feature: 'luma' | 'mods') => void;
    isPatchReady: boolean;
}

export function Home({
    onSelectFeature,
    isPatchReady,
}: HomeProps) {
  return (
    <div className="bg-slate-800/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-6 mt-2 justify-center">
            <h2 className="m-0 text-[1.35rem] font-semibold text-white tracking-tight">
                LumInstaller
            </h2>
        </div>
        <div className="flex flex-col gap-3 w-full">
            <Button 
                onClick={() => onSelectFeature('luma')}
                className="w-64 h-14 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl shadow-[0_4px_12px_rgba(59,130,246,0.2)] transition-all"
            >
                Install Luma Patch
            </Button>

            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="w-full">
                        <Button 
                            onClick={() => { if (isPatchReady) onSelectFeature('mods'); }}
                            disabled={!isPatchReady}
                            className={`w-64 h-14 font-semibold rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                                isPatchReady 
                                ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-md' 
                                : 'bg-slate-700/40 border border-white/5 text-slate-500 cursor-not-allowed opacity-50'
                            }`}
                        >
                            Install Mods
                        </Button>
                    </div>
                </TooltipTrigger>
                {!isPatchReady && (
                    <TooltipContent side="right" className="bg-slate-950 border-white/10 text-slate-200 text-xs shadow-lg max-w-45 text-center">
                        You must complete the Luma patch process first.
                    </TooltipContent>
                )}
            </Tooltip>
        </div>
    </div>
  );
}