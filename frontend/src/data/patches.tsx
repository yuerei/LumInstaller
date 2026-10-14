import type { ComponentType, ReactNode } from "react";
import { Blocks, Gamepad2 } from "lucide-react";
import { MinecraftPatch } from "@/components/MinecraftPatch";
import { SteamPatch } from "@/components/SteamPatch";

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
    id: "minecraft",
    title: "Minecraft",
    description: "Install a launcher and patch an offline account.",
    icon: <Blocks className="size-6" />,
    page: MinecraftPatch,
  },
  {
    id: "steam",
    title: "Steam",
    description: "Patches family limitation.",
    icon: <Gamepad2 className="size-6" />,
    page: SteamPatch,
  },
];
