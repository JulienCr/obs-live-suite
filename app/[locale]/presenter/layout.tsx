import { getTranslations } from "next-intl/server";
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata, Viewport } from "next";

/**
 * Viewport configuration for PWA standalone mode
 * - viewportFit: "cover" allows content to extend under the notch on iOS
 * - userScalable: false prevents accidental zoom on mobile
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "presenter.meta" });

  return {
    title: t("title"),
    description: t("description"),
    // PWA - Apple Web App configuration
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: t("title"),
    },
    // PWA - Manifest link
    manifest: "/presenter-manifest.json",
    // PWA - Apple touch icon
    icons: {
      apple: [
        { url: "/icons/icon-180x180.png", sizes: "180x180", type: "image/png" },
      ],
    },
    // PWA - Theme color for browser UI
    themeColor: "#09090b",
    // PWA - Android Chrome support
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export default function PresenterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      forcedTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
