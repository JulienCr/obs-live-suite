import type { DisplayMode } from "@/hooks/useArmedVideoPoster";

export const posterEndpoint = (mode: DisplayMode | null | undefined): string =>
  mode === "bigpicture" ? "/api/overlays/poster-bigpicture" : "/api/overlays/poster";
