import { useState } from "react";
import { PrismLauncherPatch } from "@/components/PrismLauncherPatch";
import { ElyPrismLauncherPatch } from "@/components/ElyPrismLauncherPatch";

type Launcher = "prism" | "ely";

const launchers: { id: Launcher; label: string }[] = [
  { id: "prism", label: "PrismLauncher" },
  { id: "ely", label: "Ely PrismLauncher" },
];

export function MinecraftPatch() {
  const [launcher, setLauncher] = useState<Launcher>("prism");

  return (
    <div className="max-w-2xl space-y-5">
      {/* Launcher selector */}
      <div className="inline-flex rounded-lg border border-border bg-card p-1">
        {launchers.map((l) => (
          <button
            key={l.id}
            onClick={() => setLauncher(l.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              launcher === l.id
                ? "bg-brand/15 text-brand"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {launcher === "prism" ? <PrismLauncherPatch /> : <ElyPrismLauncherPatch />}
    </div>
  );
}
