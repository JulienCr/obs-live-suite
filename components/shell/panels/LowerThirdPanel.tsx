import { type IDockviewPanelProps } from "dockview-react";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Timer, Loader2, ExternalLink, FileText, X, Search, Sparkles, Save } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTextPresets, useOverlaySettings } from "@/lib/queries";
import { PosterQuickAdd } from "@/components/assets/PosterQuickAdd";
import { DASHBOARD_EVENTS } from "@/lib/config/Constants";
import { toast } from "sonner";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { LowerThirdPreviewDialog } from "./LowerThirdPreviewDialog";
import { apiPost, isClientFetchError } from "@/lib/utils/ClientFetch";
import { useOverlayHideSync } from "@/hooks/useSyncWithOverlayState";

interface WikipediaPreview {
  title: string;
  url: string;
  rawExtract: string;
  thumbnail?: string;
}

interface WikipediaSearchOption {
  title: string;
  snippet: string;
  pageid?: number;
}

const config: PanelConfig = { id: "lowerThird", context: "dashboard" };

/**
 * Lower Third panel for Dockview - displays lower third controls without Card wrapper
 */
export function LowerThirdPanel(_props: IDockviewPanelProps) {
  const t = useTranslations("dashboard.lowerThird");
  const [mode, setMode] = useState<"guest" | "text">("guest");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageAlt, setImageAlt] = useState("");
  const [side, setSide] = useState<"left" | "right" | "center">("left");
  const [isVisible, setIsVisible] = useState(false);
  const [isWikipediaLoading, setIsWikipediaLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [wikipediaPreview, setWikipediaPreview] = useState<WikipediaPreview | null>(null);
  const [wikipediaOptions, setWikipediaOptions] = useState<WikipediaSearchOption[]>([]);
  const [showWikipediaOptions, setShowWikipediaOptions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { createTextPresetAsync } = useTextPresets({ enabled: true });
  const { lowerThirdDuration } = useOverlaySettings();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState("");

  // Sync local state with shared overlay state (handles external hide from EventLog)
  useOverlayHideSync("lowerThird", isVisible, () => setIsVisible(false));

  const buildPayload = (duration?: number) => {
    const base = mode === "text"
      ? { contentType: "text" as const, body: markdown, imageUrl: imageUrl || undefined, imageAlt: imageAlt || undefined, side }
      : { contentType: "guest" as const, title, subtitle, side };
    return duration !== undefined ? { ...base, duration } : base;
  };

  const handleShow = async () => {
    try {
      await apiPost("/api/actions/lower/show", buildPayload());
      setIsVisible(true);
    } catch (error) {
      console.error("Error showing lower third:", error);
    }
  };

  const handleHide = async () => {
    try {
      await apiPost("/api/actions/lower/hide");
      setIsVisible(false);
    } catch (error) {
      console.error("Error hiding lower third:", error);
    }
  };

  const handleAuto = async () => {
    try {
      await apiPost("/api/actions/lower/show", buildPayload(lowerThirdDuration));
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), lowerThirdDuration * 1000);
    } catch (error) {
      console.error("Error showing lower third:", error);
    }
  };

  const handleWikipediaSearch = async (selectedTitle?: string) => {
    const queryToUse = selectedTitle || markdown;
    
    if (!queryToUse || typeof queryToUse !== 'string' || queryToUse.trim().length < 2) {
      toast.error(t("toasts.searchMinChars"));
      return;
    }

    setIsWikipediaLoading(true);
    const toastId = toast.loading(selectedTitle ? t("toasts.loadingWikipediaPage") : t("toasts.searchingWikipedia"));

    try {
      if (!selectedTitle) {
        try {
          const searchData = await apiPost<{ success: boolean; results?: WikipediaSearchOption[] }>(
            "/api/wikipedia/search",
            { query: queryToUse.trim() }
          );

          if (searchData.success && searchData.results && searchData.results.length > 1) {
            setWikipediaOptions(searchData.results);
            setShowWikipediaOptions(true);
            toast.info(t("toasts.foundOptions", { count: searchData.results.length }), { id: toastId });
            setIsWikipediaLoading(false);
            return;
          }
        } catch {
          // Search failed, continue to resolve
        }
      }

      const payload = selectedTitle
        ? { query: queryToUse.trim(), title: selectedTitle }
        : { query: queryToUse.trim() };

      const data = await apiPost<{
        success: boolean;
        error?: string;
        data?: { title: string; url: string; extract: string; thumbnail?: string };
      }>("/api/wikipedia/resolve", payload);

      if (data.success && data.data) {
        setMarkdown(data.data.extract);

        if (data.data.thumbnail) {
          setImageUrl(data.data.thumbnail);
          setImageAlt(data.data.title || "");
        }

        setWikipediaPreview({
          title: data.data.title,
          url: data.data.url,
          rawExtract: data.data.extract,
          thumbnail: data.data.thumbnail,
        });

        setShowWikipediaOptions(false);
        setWikipediaOptions([]);

        toast.success("✓ " + t("toasts.wikiContentLoaded"), {
          id: toastId,
        });
      } else {
        throw new Error(data.error || t("toasts.failedLoadWiki"));
      }
    } catch (error) {
      console.error("Wikipedia search error:", error);

      let errorMessage = t("toasts.failedLoadWiki");
      if (isClientFetchError(error)) {
        if (error.errorMessage.includes("not found")) {
          errorMessage = t("toasts.wikiPageNotFound");
        } else if (error.errorMessage.includes("timeout")) {
          errorMessage = t("toasts.requestTimeout");
        } else if (error.errorMessage.includes("rate limit")) {
          errorMessage = t("toasts.rateLimitHit");
        } else {
          errorMessage = error.errorMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsWikipediaLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!markdown || markdown.trim().length < 50) {
      toast.error(t("toasts.summarizeMinChars"));
      return;
    }

    setIsSummarizing(true);
    const toastId = toast.loading(t("toasts.summarizingAI"));

    try {
      const data = await apiPost<{
        success: boolean;
        error?: string;
        data?: { summary: string[] };
      }>("/api/llm/summarize", { text: markdown.trim() });

      if (data.success && data.data) {
        const summaryText = data.data.summary.join("\n");
        setMarkdown(summaryText);

        toast.success("✓ " + t("toasts.summaryReady"), {
          id: toastId,
        });
      } else {
        throw new Error(data.error || t("toasts.failedGenerateSummary"));
      }
    } catch (error) {
      console.error("Summarization error:", error);

      let errorMessage = t("toasts.failedGenerateSummary");
      if (isClientFetchError(error)) {
        if (error.errorMessage.includes("rate limit")) {
          errorMessage = t("toasts.rateLimitHit");
        } else if (error.errorMessage.includes("LLM")) {
          errorMessage = t("toasts.llmUnavailable");
        } else {
          errorMessage = error.errorMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSummarizing(false);
    }
  };

  // Listen for load-text-preset events from the Quick LT panel
  useEffect(() => {
    const handler = (e: Event) => {
      const { body, side: presetSide, imageUrl: presetImageUrl, imageAlt: presetImageAlt } = (e as CustomEvent).detail;
      setMarkdown(body);
      setSide(presetSide);
      setImageUrl(presetImageUrl || null);
      setImageAlt(presetImageAlt || "");
      if (mode !== "text") setMode("text");
    };
    window.addEventListener(DASHBOARD_EVENTS.LOAD_TEXT_PRESET, handler);
    return () => window.removeEventListener(DASHBOARD_EVENTS.LOAD_TEXT_PRESET, handler);
  }, [mode]);

  const handleSaveAsPreset = async () => {
    if (!presetName.trim() || !markdown.trim()) return;
    try {
      await createTextPresetAsync({
        name: presetName.trim(),
        body: markdown,
        side,
        imageUrl: imageUrl || null,
        imageAlt: imageAlt || null,
      });
      setShowSaveDialog(false);
      setPresetName("");
      toast.success(t("presetSaved"));
    } catch (error) {
      console.error("Failed to save preset:", error);
      toast.error(t("presetSaveFailed"));
    }
  };

  return (
    <BasePanelWrapper config={config}>
        <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={mode === "guest" ? "default" : "outline-solid"}
            size="sm"
            onClick={() => setMode("guest")}
            className="flex-1"
          >
            {t("guest")}
          </Button>
          <Button
            variant={mode === "text" ? "default" : "outline-solid"}
            size="sm"
            onClick={() => setMode("text")}
            className="flex-1"
          >
            {t("text")}
          </Button>
        </div>

        {mode === "guest" ? (
        <div className="space-y-2">
          <Label htmlFor="title">{t("titleLabel")}</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("enterName")}
          />
        </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="markdown">{t("markdown")}</Label>
              <div className="flex gap-2">
                <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 gap-2"
                      title={t("saveAsPreset")}
                      disabled={!markdown.trim()}
                    >
                      <Save className="h-4 w-4" />
                      {t("save")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3" align="end">
                    <div className="space-y-2">
                      <Label htmlFor="presetName">{t("presetNameLabel")}</Label>
                      <Input
                        id="presetName"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        placeholder={t("presetNamePlaceholder")}
                        maxLength={100}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveAsPreset();
                        }}
                      />
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={handleSaveAsPreset}
                        disabled={!presetName.trim()}
                      >
                        {t("savePreset")}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleWikipediaSearch()}
                  disabled={isWikipediaLoading || markdown.trim().length < 2}
                  className="h-8 gap-2"
                  title={t("wikiSearchTooltip")}
                >
                  {isWikipediaLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  {t("wikiSearch")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSummarize()}
                  disabled={isSummarizing || markdown.trim().length < 50}
                  className="h-8 gap-2"
                  title={t("summarizeTooltip")}
                >
                  {isSummarizing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {t("summarize")}
                </Button>
              </div>
            </div>
            <textarea
              id="markdown"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder={t("markdownPlaceholder")}
              className="min-h-[120px] w-full rounded border border-input bg-background px-2.5 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={isWikipediaLoading || isSummarizing}
            />
            <p className="text-xs text-muted-foreground">
              {t("markdownSupported")}
            </p>
          </div>
        )}

        {/* Wikipedia Options Selection */}
        {mode === "text" && showWikipediaOptions && wikipediaOptions.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                {t("multiplePagesFound")}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowWikipediaOptions(false);
                  setWikipediaOptions([]);
                }}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {wikipediaOptions.map((option, index) => (
                <button
                  key={option.pageid || index}
                  onClick={() => handleWikipediaSearch(option.title)}
                  disabled={isWikipediaLoading}
                  className="w-full text-left p-2 rounded border border-yellow-200 dark:border-yellow-800 bg-white dark:bg-gray-900 hover:bg-yellow-100 dark:hover:bg-yellow-950/30 transition-colors disabled:opacity-50"
                >
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                    {option.title}
                  </div>
                  {option.snippet && (
                    <div 
                      className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: option.snippet }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Wikipedia Preview */}
        {mode === "text" && wikipediaPreview && (
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    {wikipediaPreview.title}
                  </h4>
                </div>
                <a
                  href={wikipediaPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  {t("openWikipediaPage")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWikipediaPreview(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Raw Extract Preview */}
            <details className="text-xs">
              <summary className="cursor-pointer text-blue-700 dark:text-blue-300 font-medium hover:underline">
                {t("viewOriginalExtract")}
              </summary>
              <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border border-blue-200 dark:border-blue-800 text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto text-xs">
                {wikipediaPreview.rawExtract}
              </div>
            </details>
          </div>
        )}

        {mode === "guest" && (
          <div className="space-y-2">
            <Label htmlFor="subtitle">{t("subtitle")}</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder={t("enterRole")}
            />
          </div>
        )}

        {mode === "text" && (
          <div className="space-y-2">
            <Label>{t("imageOptional")}</Label>
            <PosterQuickAdd
              mode="picker"
              allowedTypes={["image"]}
              title={t("quickAddImage")}
              showTitleEditor={false}
              onMediaSelected={(media) => {
                setImageUrl(media.fileUrl);
                setImageAlt(media.title || "");
              }}
            />
            {imageUrl && (
              <div className="flex items-center gap-3 rounded border border-input bg-muted/50 p-2">
                <img
                  src={imageUrl}
                  alt={imageAlt || "Lower third image"}
                  className="h-16 w-28 rounded object-cover"
                />
                <div className="flex-1 text-xs text-muted-foreground">
                  {imageAlt || t("selectedImage")}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImageUrl(null);
                    setImageAlt("");
                  }}
                >
                  {t("clear")}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant={side === "left" ? "default" : "outline-solid"}
            size="sm"
            onClick={() => setSide("left")}
            className="flex-1"
          >
            {t("left")}
          </Button>
          <Button
            variant={side === "right" ? "default" : "outline-solid"}
            size="sm"
            onClick={() => setSide("right")}
            className="flex-1"
          >
            {t("right")}
          </Button>
          <Button
            variant={side === "center" ? "default" : "outline-solid"}
            size="sm"
            onClick={() => setSide("center")}
            className="flex-1"
          >
            {t("center")}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleShow}
            disabled={mode === "guest" ? !title || isVisible : !markdown.trim() || isVisible}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            {t("show")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleHide}
            disabled={!isVisible}
            className="flex-1"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            {t("hide")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(true)}
            disabled={mode === "guest" ? !title : !markdown.trim()}
            title={t("preview")}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAuto}
            disabled={mode === "guest" ? !title : !markdown.trim()}
          >
            <Timer className="w-4 h-4" />
          </Button>
        </div>
        </div>

        <LowerThirdPreviewDialog
          open={showPreview}
          onOpenChange={setShowPreview}
          mode={mode}
          title={title}
          subtitle={subtitle}
          markdown={markdown}
          imageUrl={imageUrl}
          imageAlt={imageAlt}
          side={side}
        />
    </BasePanelWrapper>
  );
}
