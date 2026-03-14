"use client";

import { useEffect } from "react";

/**
 * Layout for Studio Return overlay — forces transparent background
 * on html+body so the Tauri transparent window shows through.
 * OBS browser sources already ignore body background, but Tauri needs explicit transparency.
 */
export default function StudioReturnLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";

    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  return <>{children}</>;
}
