import { Download, HardDrive, Gamepad2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface Mod {
  id: string;
  name: string;
  game: string;
  description: string;
  size: string;
  url: string;
}

export function ModCard({ mod }: { mod: Mod }) {
  return (
    <Card className="flex flex-col hover:border-emerald-500/50 transition-colors">
      <CardHeader>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium mb-1">
          <Gamepad2 className="size-3.5" />
          {mod.game}
        </div>
        <CardTitle className="text-base">{mod.name}</CardTitle>
        <CardDescription className="line-clamp-2">
          {mod.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <HardDrive className="size-3.5" />
          {mod.size}
        </div>
      </CardContent>

      <CardFooter>
        <Button className="w-full" size="sm">
          <Download className="size-4 mr-1" />
          Install
        </Button>
      </CardFooter>
    </Card>
  );
}
