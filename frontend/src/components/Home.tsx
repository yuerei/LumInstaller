import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HomeProps {
    onSelectPage: (feature: 'luma' | 'mods') => void;
    isPatchReady: boolean;
}
export function Home({ onSelectPage, isPatchReady }: HomeProps) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-slate-800/70 p-8 shadow-2xl backdrop-blur-md">    
        {/* Header Section */}
        <div className="mb-6 mt-2 flex items-center justify-center gap-3">
            <h2 className="m-0 text-2xl font-semibold tracking-tight text-white">
                LumInstaller
            </h2>
        </div>
        {/* Action Buttons */}
        <div className="flex w-full flex-col gap-3">
            <Button 
                onClick={() => onSelectPage('luma')}
                className="h-14 w-64 rounded-xl bg-blue-500 font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:bg-blue-600"
            >
                Install Luma Patch
            </Button>

            <Tooltip>
                <TooltipTrigger asChild>
                    <div tabIndex={0} className={`w-fit rounded-xl focus:outline-none ${!isPatchReady ? 'cursor-not-allowed' : ''}`}>
                        <Button 
                            onClick={() => onSelectPage('mods')}
                            disabled={!isPatchReady}
                            className={`h-14 w-64 flex-col gap-0.5 rounded-xl font-semibold transition-all ${
                                isPatchReady 
                                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 hover:bg-purple-600' 
                                : 'pointer-events-none border border-white/5 bg-slate-700/40 text-slate-500 opacity-50'
                            }`}
                        >
                            Install Mods
                        </Button>
                    </div>
                </TooltipTrigger>
                
                {!isPatchReady && (
                    <TooltipContent side="right" className="max-w-45 border-white/10 bg-slate-950 text-center text-xs text-slate-200 shadow-lg">
                        You must complete the Luma patch process first.
                    </TooltipContent>
                )}
            </Tooltip>
        </div>
    </div>
  );
}