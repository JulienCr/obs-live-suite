import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OBS Live Suite",
  description: "Desktop-first live show overlay control and management suite for OBS",
};

/**
 * Root layout - minimal wrapper for non-localized routes (overlays, etc.)
 * Localized routes use app/[locale]/layout.tsx instead
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

