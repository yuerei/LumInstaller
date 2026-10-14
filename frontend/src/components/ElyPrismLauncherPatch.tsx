import {
  Download as DownloadIcon,
  ExternalLink,
  Palette,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrowserOpenURL } from "../../wailsjs/runtime/runtime";

// Direct Windows installer for the latest Ely PrismLauncher (PineconeMC) build.
const ELY_PRISM_URL =
  "https://github.com/ElyPrismLauncher/Launcher/releases/download/11.1.1/PineconeMC-Windows-MSVC-Setup-11.1.1.exe";

export function ElyPrismLauncherPatch() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-brand/15 text-brand shrink-0">
              <Palette className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">Ely PrismLauncher</CardTitle>
              <CardDescription>
                Customizable skin but need to Sign In.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Button
            variant="brand"
            size="sm"
            onClick={() => BrowserOpenURL(ELY_PRISM_URL)}
          >
            <DownloadIcon className="size-4 mr-1" />
            Download Ely PrismLauncher
            <ExternalLink className="size-3.5 ml-1 opacity-70" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
