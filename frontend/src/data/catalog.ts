import type { Mod } from "@/components/ModCard";

export const mockCatalog: Mod[] = [
  {
    id: "1",
    name: "Enhanced Graphics Pack",
    game: "GTA V",
    description:
      "4K textures and improved lighting for a more realistic world.",
    size: "1.2 GB",
    url: "https://example.com/mods/gtav-graphics.zip",
  },
  {
    id: "2",
    name: "Trainer Menu",
    game: "GTA V",
    description: "In-game menu for spawning vehicles, teleporting, and more.",
    size: "48 MB",
    url: "https://example.com/mods/gtav-trainer.zip",
  },
  {
    id: "3",
    name: "OptiFine HD",
    game: "Minecraft",
    description: "Performance boost and advanced video settings.",
    size: "12 MB",
    url: "https://example.com/mods/optifine.jar",
  },
  {
    id: "4",
    name: "Weather Overhaul",
    game: "Skyrim",
    description: "Dynamic weather, volumetric fog, and seasonal effects.",
    size: "340 MB",
    url: "https://example.com/mods/skyrim-weather.zip",
  },
];
