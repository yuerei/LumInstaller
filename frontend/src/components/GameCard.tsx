import { Gamepad2, ChevronRight, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function GameCard({
  game,
  count,
  onClick,
}: {
  game: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:border-emerald-500/50 hover:bg-accent/30 transition-colors group"
    >
      <CardContent className="flex items-center gap-4 py-5">
        <div className="flex items-center justify-center size-12 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
          <Gamepad2 className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{game}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Package className="size-3.5" />
            {count} {count === 1 ? "item" : "items"}
          </p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground group-hover:text-emerald-400 transition-colors shrink-0" />
      </CardContent>
    </Card>
  );
}
