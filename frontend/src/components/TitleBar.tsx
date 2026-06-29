import { useState } from "react";
import { Minus, Square, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WindowMinimise, WindowToggleMaximise, Quit } from "../../wailsjs/runtime/runtime";

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMaximize = () => {
    WindowToggleMaximise();
    setIsMaximized((prev) => !prev);
  };

  const dragStyle = {
    "--wails-draggable": "drag",
    WebkitAppRegion: "drag",
  } as React.CSSProperties;

  const noDragStyle = {
    "--wails-draggable": "no-drag",
    WebkitAppRegion: "no-drag",
  } as React.CSSProperties;

  return (
    <div 
      className="flex items-center justify-between w-full h-10 bg-[#111827] border-b border-gray-800 select-none z-50 relative"
      style={dragStyle}
    >
      {/* Left Section: App Logo & Title */}
      <div className="flex items-center gap-2 px-4 pointer-events-none">
        <span className="text-xs font-semibold text-gray-400 tracking-wider uppercase font-sans">
          LumInstaller
        </span>
      </div>

      {/* Right Section: Windows Control Actions */}
      <div 
        className="flex items-center h-full"
        style={noDragStyle}
      >
        {/* Minimize Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-12 rounded-none hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          onClick={WindowMinimise}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>

        {/* Maximize / Restore Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-12 rounded-none hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          onClick={handleMaximize}
        >
          {isMaximized ? (
            <Copy className="h-3.5 w-3.5 rotate-180 scale-x-[-1]" />
          ) : (
            <Square className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-12 rounded-none hover:bg-rose-600 text-gray-400 hover:text-white transition-colors"
          onClick={Quit}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}