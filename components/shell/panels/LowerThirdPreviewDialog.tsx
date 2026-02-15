"use client";

import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LowerThirdDisplay } from "@/components/overlays/LowerThirdDisplay";
import { OverlayMotionProvider } from "@/components/overlays/OverlayMotionProvider";
import { apiGet } from "@/lib/utils/ClientFetch";
import { ColorScheme, FontConfig, LayoutConfig, LowerThirdAnimationTheme } from "@/lib/models/Theme";
import { Loader2 } from "lucide-react";

interface LowerThirdPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "guest" | "text";
  title?: string;
  subtitle?: string;
  markdown?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  side: "left" | "right" | "center";
}

interface ThemeData {
  colors: ColorScheme;
  font: FontConfig;
  layout: LayoutConfig;
  lowerThirdAnimation?: LowerThirdAnimationTheme;
}

const DEFAULT_PREVIEW_THEME: ThemeData = {
  colors: {
    primary: "#3b82f6",
    accent: "#8b5cf6",
    surface: "#1a1a2e",
    text: "#ffffff",
    success: "#22c55e",
    warn: "#f59e0b",
  },
  font: {
    family: "Inter, sans-serif",
    size: 32,
    weight: 700,
  },
  layout: {
    x: 60,
    y: 920,
    scale: 1,
  },
};

interface Profile {
  id: string;
  name: string;
  themeId?: string | null;
  isActive: boolean;
}

interface ProfilesResponse {
  profiles?: Profile[];
}

interface ThemeResponse {
  theme?: {
    colors: ColorScheme;
    lowerThirdFont: FontConfig;
    lowerThirdLayout: LayoutConfig;
    lowerThirdAnimation?: LowerThirdAnimationTheme;
  };
}

export function LowerThirdPreviewDialog({
  open,
  onOpenChange,
  mode,
  title,
  subtitle,
  markdown,
  imageUrl,
  imageAlt,
  side,
}: LowerThirdPreviewDialogProps) {
  const t = useTranslations("dashboard.lowerThird");
  const [theme, setTheme] = useState<ThemeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.5);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    if (!container) return;

    const updateScale = (entries?: ResizeObserverEntry[]) => {
      const width = entries?.[0]?.contentRect.width ?? container.clientWidth;
      const scale = width / 1920;
      setPreviewScale(scale);
    };

    const resizeObserver = new ResizeObserver(updateScale);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setAnimating(false);
      return;
    }

    const fetchTheme = async () => {
      setLoading(true);
      try {
        const profilesData = await apiGet<ProfilesResponse>("/api/profiles");
        const activeProfile = profilesData.profiles?.find(p => p.isActive);

        if (activeProfile?.themeId) {
          const themeData = await apiGet<ThemeResponse>(`/api/themes/${activeProfile.themeId}`);

          if (themeData.theme) {
            setTheme({
              colors: themeData.theme.colors,
              font: themeData.theme.lowerThirdFont,
              layout: themeData.theme.lowerThirdLayout,
              lowerThirdAnimation: themeData.theme.lowerThirdAnimation,
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch theme for preview:", error);
      } finally {
        setLoading(false);
        setTimeout(() => setAnimating(true), 100);
      }
    };

    fetchTheme();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("previewTitle")}</DialogTitle>
        </DialogHeader>

        <div
          ref={containerRef}
          className="relative w-full bg-[#0f1014] rounded-lg"
          style={{
            aspectRatio: "16/9",
            overflow: "hidden",
            isolation: "isolate", // Create stacking context for proper clipping
          }}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: `${1920 * previewScale}px`,
                height: `${1080 * previewScale}px`,
                overflow: "hidden",
              }}
            >
              <OverlayMotionProvider>
              <div
                className="origin-top-left"
                style={{
                  transform: `scale(${previewScale})`,
                  width: "1920px",
                  height: "1080px",
                }}
              >
                <LowerThirdDisplay
                  title={mode === "guest" ? title : undefined}
                  subtitle={mode === "guest" ? subtitle : undefined}
                  body={mode === "text" ? markdown : undefined}
                  contentType={mode}
                  imageUrl={imageUrl || undefined}
                  imageAlt={imageAlt}
                  side={side}
                  theme={theme || DEFAULT_PREVIEW_THEME}
                  animating={animating}
                  isPreview={true}
                  viewportWidth={1920}
                />
              </div>
              </OverlayMotionProvider>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t("previewNote")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
