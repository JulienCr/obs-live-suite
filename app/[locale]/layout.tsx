import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/theme-provider";
import { BodyThemeSync } from "@/components/BodyThemeSync";
import { AppModeProvider } from "@/components/shell/AppModeContext";
import { AppShell } from "@/components/shell/AppShell";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Locale layout - provides i18n context and app shell for localized routes
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate that the incoming locale is valid
  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  // Get messages for the current locale
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
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
    </NextIntlClientProvider>
  );
}
