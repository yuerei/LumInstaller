import type { ComponentType, ReactNode } from "react";
import { Wrench } from "lucide-react";
import { PrismLauncherPatch } from "@/components/PrismLauncherPatch";

export interface PatchDef {
  /** Stable id used for routing/selection. */
  id: string;
  /** Title shown on the patch card and page header. */
  title: string;
  /** Short description shown on the patch card. */
  description: string;
  /** Icon shown on the patch card. */
  icon: ReactNode;
  /** The page component rendered when this patch is opened. */
  page: ComponentType;
}

// Add new patches here — each becomes a card on the Patch tab with its own page.
export const patches: PatchDef[] = [
  {
    id: "prismlauncher",
    title: "PrismLauncher",
    description: "Install PrismLauncher and patch an offline account.",
    icon: <Wrench className="size-6" />,
    page: PrismLauncherPatch,
  },
];
