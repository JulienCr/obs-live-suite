import { type IDockviewPanelProps } from "dockview-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Timer, Loader2, ExternalLink, FileText, X, Search, Sparkles } from "lucide-react";
import { PosterQuickAdd } from "@/components/assets/PosterQuickAdd";
import { toast } from "sonner";

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

/**
 * Lower Third panel for Dockview - displays lower third controls without Card wrapper
 */
export function LowerThirdPanel(props: IDockviewPanelProps) {
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

  const handleShow = async () => {
    try {
      const payload =
        mode === "text"
          ? {
              contentType: "text",
              body: markdown,
              imageUrl: imageUrl || undefined,
              imageAlt: imageAlt || undefined,
              side,
            }
          : {
              contentType: "guest",
              title,
              subtitle,
              side,
            };

      const response = await fetch("/api/actions/lower/show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to show lower third");
      }

      setIsVisible(true);
    } catch (error) {
      console.error("Error showing lower third:", error);
    }
  };

  const handleHide = async () => {
    try {
      const response = await fetch("/api/actions/lower/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to hide lower third");
      }

      setIsVisible(false);
    } catch (error) {
      console.error("Error hiding lower third:", error);
    }
  };

  const handleAuto = async () => {
    try {
      const payload =
        mode === "text"
          ? {
              contentType: "text",
              body: markdown,
              imageUrl: imageUrl || undefined,
              imageAlt: imageAlt || undefined,
              side,
              duration: 5,
            }
          : {
              contentType: "guest",
              title,
              subtitle,
              side,
              duration: 5,
            };

      const response = await fetch("/api/actions/lower/show", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to show lower third");
      }

      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 5000);
    } catch (error) {
      console.error("Error showing lower third:", error);
    }
  };

  const handleWikipediaSearch = async (selectedTitle?: string) => {
    const queryToUse = selectedTitle || markdown;
    
    if (!queryToUse || typeof queryToUse !== 'string' || queryToUse.trim().length < 2) {
      toast.error("Please enter at least 2 characters to search");
      return;
    }

    setIsWikipediaLoading(true);
    const toastId = toast.loading(selectedTitle ? "Loading Wikipedia page..." : "Searching Wikipedia...");

    try {
      if (!selectedTitle) {
        const searchResponse = await fetch("/api/wikipedia/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: queryToUse.trim() }),
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          
          if (searchData.success && searchData.results && searchData.results.length > 1) {
            setWikipediaOptions(searchData.results);
            setShowWikipediaOptions(true);
            toast.info(`Found ${searchData.results.length} options - please select one`, { id: toastId });
            setIsWikipediaLoading(false);
            return;
          }
        }
      }

      const payload: any = selectedTitle 
        ? { query: queryToUse.trim(), title: selectedTitle }
        : { query: queryToUse.trim() };

      const response = await fetch("/api/wikipedia/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch Wikipedia page");
      }

      const data = await response.json();

      if (data.success) {
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

        toast.success("✓ Wikipedia content loaded - click Summarize or edit manually", {
          id: toastId,
        });
      } else {
        throw new Error(data.error || "Failed to load Wikipedia page");
      }
    } catch (error) {
      console.error("Wikipedia search error:", error);
      
      let errorMessage = "Failed to load Wikipedia page";
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          errorMessage = "No Wikipedia page found. Try rephrasing your query.";
        } else if (error.message.includes("timeout")) {
          errorMessage = "Request timed out. Please try again.";
        } else if (error.message.includes("rate limit")) {
          errorMessage = "Too many requests. Please wait a moment.";
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsWikipediaLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!markdown || markdown.trim().length < 50) {
      toast.error("Please enter at least 50 characters to summarize");
      return;
    }

    setIsSummarizing(true);
    const toastId = toast.loading("Summarizing with AI...");

    try {
      const response = await fetch("/api/llm/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: markdown.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to summarize");
      }

      const data = await response.json();

      if (data.success) {
        const summaryText = data.data.summary.join("\n");
        setMarkdown(summaryText);

        toast.success("✓ Summary ready - edit and click Show", {
          id: toastId,
        });
      } else {
        throw new Error(data.error || "Summarization failed");
      }
    } catch (error) {
      console.error("Summarization error:", error);
      
      let errorMessage = "Failed to generate summary";
      if (error instanceof Error) {
        if (error.message.includes("rate limit")) {
          errorMessage = "Too many requests. Please wait a moment.";
        } else if (error.message.includes("LLM")) {
          errorMessage = "LLM service unavailable. Check your settings.";
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div style={{ padding: "1rem", height: "100%", overflow: "auto" }}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Button
            variant={mode === "guest" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("guest")}
            className="flex-1"
          >
            Guest
          </Button>
          <Button
            variant={mode === "text" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("text")}
            className="flex-1"
          >
            Text
          </Button>
        </div>

        {mode === "guest" ? (
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter name..."
          />
        </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="markdown">Markdown</Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleWikipediaSearch()}
                  disabled={isWikipediaLoading || markdown.trim().length < 2}
                  className="h-8 gap-2"
                  title="Search Wikipedia and load raw content"
                >
                  {isWikipediaLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Wiki Search
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSummarize()}
                  disabled={isSummarizing || markdown.trim().length < 50}
                  className="h-8 gap-2"
                  title="Summarize text with AI"
                >
                  {isSummarizing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Summarize
                </Button>
              </div>
            </div>
            <textarea
              id="markdown"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Write your lower third copy, paste text to summarize, or type a query and click Wiki Search"
              className="min-h-[120px] w-full rounded border border-input bg-background px-2.5 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={isWikipediaLoading || isSummarizing}
            />
            <p className="text-xs text-muted-foreground">
              Markdown supported. Use Wiki Search for Wikipedia content or Summarize to condense any text.
            </p>
          </div>
        )}

        {/* Wikipedia Options Selection */}
        {mode === "text" && showWikipediaOptions && wikipediaOptions.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                Multiple pages found - select one:
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
                  Open Wikipedia page
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
                View original Wikipedia extract
              </summary>
              <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border border-blue-200 dark:border-blue-800 text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto text-xs">
                {wikipediaPreview.rawExtract}
              </div>
            </details>
          </div>
        )}

        {mode === "guest" && (
          <div className="space-y-2">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input
              id="subtitle"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="Enter role..."
            />
          </div>
        )}

        {mode === "text" && (
          <div className="space-y-2">
            <Label>Image (optional)</Label>
            <PosterQuickAdd
              mode="picker"
              allowedTypes={["image"]}
              title="Quick Add Image"
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
                  {imageAlt || "Selected image"}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImageUrl(null);
                    setImageAlt("");
                  }}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant={side === "left" ? "default" : "outline"}
            size="sm"
            onClick={() => setSide("left")}
            className="flex-1"
          >
            Left
          </Button>
          <Button
            variant={side === "right" ? "default" : "outline"}
            size="sm"
            onClick={() => setSide("right")}
            className="flex-1"
          >
            Right
          </Button>
          <Button
            variant={side === "center" ? "default" : "outline"}
            size="sm"
            onClick={() => setSide("center")}
            className="flex-1"
          >
            Center
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
            Show
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleHide}
            disabled={!isVisible}
            className="flex-1"
          >
            <EyeOff className="w-4 h-4 mr-2" />
            Hide
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
    </div>
  );
}
