"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

/**
 * Syncs the theme with the body element to support BlueprintJS theming
 * Adds/removes bp5-dark class based on the current theme
 */
export function BodyThemeSync() {
  const { theme } = useTheme();

  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("bp5-dark");
    } else {
      document.body.classList.remove("bp5-dark");
    }
  }, [theme]);

  return null;
}
