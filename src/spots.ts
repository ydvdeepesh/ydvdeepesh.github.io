// Shared by the 3D scene and the page around it.
import { useEffect, useState } from "react";

export const BASE = `${import.meta.env.BASE_URL}room/`;
// the private claude.ai preview can't serve .glb, so its build loads embedded-glTF JSON copies instead
export const MODEL_EXT: string = import.meta.env.VITE_MODEL_EXT ?? ".glb";
// the preview's security policy also blocks WebAssembly (meshopt) and fetching blob: URLs (ImageBitmap textures)
export const PREVIEW = MODEL_EXT !== ".glb";
export const MOODS = ["golden", "afternoon", "overcast", "evening", "night"] as const;
export type Mood = (typeof MOODS)[number];
export const MOOD_LABEL: Record<Mood, string> = { golden: "Golden hour", afternoon: "Afternoon", overcast: "Overcast", evening: "Evening", night: "Night" };

export type Spot = "monitor" | "laptop" | "phone" | "chess" | "globe" | "gym" | "story" | "lamp" | "maxel";
export const SPOT_LABEL: Record<Spot, string> = {
  monitor: "Projects", laptop: "About me", phone: "Talk with me", chess: "Chess", globe: "Places", gym: "Gym",
  story: "Story board", lamp: "Change the light", maxel: "Ask Maxel",
};

export type Box = { center: [number, number, number]; size: [number, number, number] };

export function useHotspots() {
  const [boxes, setBoxes] = useState<Record<Spot, Box> | null>(null);
  useEffect(() => { fetch(`${BASE}hotspots.json`).then((r) => r.json()).then(setBoxes); }, []);
  return boxes;
}

