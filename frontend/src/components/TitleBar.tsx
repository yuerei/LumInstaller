import { Minus, X } from "lucide-react";
import { WindowMinimise, Quit } from "../../wailsjs/runtime/runtime";
import { Button } from "@/components/ui/button";

export function TitleBar() {
  return (
    <div className="relative z-50 flex h-10 w-full select-none items-center justify-between border-b border-slate-800 bg-slate-900 [--wails-draggable:drag] [-webkit-app-region:drag]">
      {/* Left Section: App Logo & Title */}
      <div className="pointer-events-none flex items-center gap-2 px-4">
        <span className="font-sans text-xs font-semibold tracking-wider text-slate-400">
          LumInstaller
        </span>
      </div>

      {/* Right Section: Windows Control Actions */}
      <div className="flex h-full items-center [--wails-draggable:no-drag] [-webkit-app-region:no-drag]">
        {/* Minimize Button */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Minimize window"
          className="h-10 w-12 rounded-none text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          onClick={WindowMinimise}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close window"
          className="h-10 w-12 rounded-none text-slate-400 transition-colors hover:bg-rose-600 hover:text-white"
          onClick={Quit}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}