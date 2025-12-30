import { ThemeProvider } from "@/components/theme-provider";

export const metadata = {
  title: "Presenter Dashboard - OBS Live Suite",
  description: "Private presenter dashboard for live shows",
};

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
