import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { BodyThemeSync } from "@/components/BodyThemeSync";
import { AppModeProvider } from "@/components/shell/AppModeContext";
import { AppShell } from "@/components/shell/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OBS Live Suite",
  description: "Desktop-first live show overlay control and management suite for OBS",
};

/**
 * Root layout component for the application
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AppModeProvider>
            <BodyThemeSync />
            <AppShell>
              {children}
            </AppShell>
          </AppModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

