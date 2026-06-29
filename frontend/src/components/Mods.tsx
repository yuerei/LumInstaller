import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ModsProps {
  onCancel: () => void;
}

export function Mods({ onCancel }: ModsProps) {
  return (
    <div className="bg-slate-800/70 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-2xl relative">
        <div className="flex items-center gap-3 mb-6 mt-2">
            <div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onCancel()}
                    className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </div>
            <h2 className="m-0 text-[1.35rem] font-semibold text-white tracking-tight">
                Game Mods
            </h2>
        </div>
        <div className="flex flex-col gap-3 w-full">
            <p className="text-slate-300 text-sm">
                This section is under development.<br />
                Please check back later for updates on mod management features.
            </p>
        </div>
    </div>
  );
}