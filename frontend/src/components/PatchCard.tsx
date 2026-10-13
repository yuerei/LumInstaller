import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function PatchCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer hover:border-emerald-500/50 hover:bg-accent/30 transition-colors group"
    >
      <CardContent className="flex items-center gap-4 py-5">
        <div className="flex items-center justify-center size-12 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground group-hover:text-emerald-400 transition-colors shrink-0" />
      </CardContent>
    </Card>
  );
}
