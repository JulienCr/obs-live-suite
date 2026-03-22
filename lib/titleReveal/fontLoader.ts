// ---------------------------------------------------------------------------
// Google Font loader (browser-only, no React dependency)
// Uses waitForFont from shared utils for reliable font detection.
// ---------------------------------------------------------------------------

import { waitForFont } from "@/lib/utils/fontLoader";

const loadedFonts = new Set<string>();

export async function loadGoogleFont(family: string): Promise<void> {
  if (loadedFonts.has(family)) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(family);

  // Wait for font to be available using the shared utility
  await waitForFont(family);
}
