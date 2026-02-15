"use client";

import { useState, useRef, ChangeEvent, DragEvent, ClipboardEvent as ReactClipboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, Image as ImageIcon, Video, Youtube } from "lucide-react";
import {
  isYouTubeUrl,
  extractYouTubeId,
  isDirectMediaUrl,
  getMediaTypeFromUrl,
  getFilenameFromUrl,
} from "@/lib/utils/urlDetection";
import { apiGet, apiPost, isClientFetchError } from "@/lib/utils/ClientFetch";

type MediaType = "image" | "video" | "youtube";
type DisplayMode = "left" | "right" | "bigpicture";

interface Poster {
  id: string;
  title: string;
  fileUrl: string;
  type: MediaType;
  source?: string;
}

interface PosterQuickAddProps {
  onPosterAdded?: () => void;
  onPosterDisplayed?: (poster: Poster, mode: DisplayMode) => void;
  onMediaSelected?: (media: PreviewState) => void;
  mode?: "poster" | "picker";
  allowedTypes?: MediaType[];
  title?: string;
  showTitleEditor?: boolean;
}

interface PreviewState {
  fileUrl: string;
  type: MediaType;
  title: string;
  source?: string;
  thumbnailUrl?: string;
}

/**
 * Quick add component for rapidly adding posters to the system
 * Supports: file upload (browse/drag-drop), paste files, YouTube URLs, direct media URLs
 */
export function PosterQuickAdd({
  onPosterAdded,
  onPosterDisplayed,
  onMediaSelected,
  mode = "poster",
  allowedTypes = ["image", "video", "youtube"],
  title,
  showTitleEditor = true,
}: PosterQuickAddProps) {
  const t = useTranslations("assets.quickAdd");
  const isImageOnly = allowedTypes.length === 1 && allowedTypes[0] === "image";
  const displayTitle = title ?? (isImageOnly ? t("titleImageOnly") : t("title"));
  const [urlInput, setUrlInput] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const isPickerMode = mode === "picker";
  const isTypeAllowed = (type: MediaType) => allowedTypes.includes(type);

  /**
   * Clear error after 5 seconds
   */
  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 5000);
  };

  /**
   * Upload a file to the server
   */
  const handleFileUpload = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const fileType: MediaType | null = isImage ? "image" : isVideo ? "video" : null;

    if (!fileType || !isTypeAllowed(fileType)) {
      showError(t("errors.typesNotAllowed", { types: allowedTypes.join(", ") }));
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await res.json();

      // Auto-generate title from filename
      const title = file.name.replace(/\.[^/.]+$/, "") || "Untitled";

      setPreview({
        fileUrl: data.url,
        type: data.type,
        title,
        thumbnailUrl: data.type === "image" ? data.url : undefined,
      });

      setUrlInput(""); // Clear input
    } catch (err) {
      showError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  /**
   * Process YouTube URL
   */
  const handleYouTubeUrl = async (url: string) => {
    if (!isTypeAllowed("youtube")) {
      showError(t("errors.youtubeNotAllowed"));
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const videoId = extractYouTubeId(url);
      if (!videoId) {
        throw new Error(t("errors.invalidYoutubeUrl"));
      }

      const embedUrl = `https://www.youtube.com/embed/${videoId}`;

      // Fetch metadata
      let title = videoId; // Fallback
      let source = undefined;

      try {
        const metadata = await apiGet<{ title?: string; author_name?: string }>(`/api/utils/metadata?url=${encodeURIComponent(embedUrl)}`);
        if (metadata.title) title = metadata.title;
        if (metadata.author_name && metadata.title) {
          source = `${metadata.author_name} | ${metadata.title}`;
        }
      } catch (metadataError) {
        console.warn("Failed to fetch YouTube metadata:", metadataError);
        // Continue with fallback title
      }

      setPreview({
        fileUrl: embedUrl,
        type: "youtube",
        title,
        source,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      });

      setUrlInput(""); // Clear input
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to process YouTube URL");
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Process direct media URL (download and upload)
   */
  const handleDirectMediaUrl = async (url: string) => {
    const mediaType = getMediaTypeFromUrl(url);
    if (!mediaType || !isTypeAllowed(mediaType)) {
      showError(t("errors.urlTypesNotAllowed", { types: allowedTypes.join(", ") }));
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const data = await apiPost<{ url: string; type: MediaType }>("/api/assets/download-upload", { url });

      // Auto-generate title from URL filename
      const title = getFilenameFromUrl(url);

      setPreview({
        fileUrl: data.url,
        type: data.type,
        title,
        thumbnailUrl: data.type === "image" ? data.url : undefined,
      });

      setUrlInput(""); // Clear input
    } catch (err) {
      const errorMessage = isClientFetchError(err) ? err.errorMessage : (err instanceof Error ? err.message : "Failed to download and upload media");
      showError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Handle URL input change
   */
  const handleUrlInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrlInput(value);

    // Don't auto-process while typing (wait for Enter or blur)
  };

  /**
   * Handle URL input blur or Enter key
   */
  const handleUrlInputSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (isYouTubeUrl(trimmed)) {
      handleYouTubeUrl(trimmed);
    } else if (isDirectMediaUrl(trimmed)) {
      handleDirectMediaUrl(trimmed);
    } else {
      showError(isImageOnly ? t("errors.invalidUrlImage") : t("errors.invalidUrlFull"));
    }
  };

  /**
   * Handle paste event in URL input
   */
  const handleInputPaste = (e: ReactClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Priority 1: Check if a file is being pasted
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleFileUpload(file);
          return;
        }
      }
    }

    // Priority 2: Let text paste normally, will be processed on blur/Enter
  };

  /**
   * Handle file selection via browse button
   */
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  /**
   * Handle drag events
   */
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  /**
   * Handle drop event
   */
  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  /**
   * Create poster in database
   */
  const createPoster = async (): Promise<Poster | null> => {
    if (!preview) return null;
    if (isPickerMode) return null;

    try {
      const data = await apiPost<{ poster: Poster }>("/api/assets/posters", {
        title: preview.title,
        description: "",
        source: preview.source || "",
        fileUrl: preview.fileUrl,
        type: preview.type,
        tags: [],
        isEnabled: true,
      });

      return data.poster;
    } catch (err) {
      const errorMessage = isClientFetchError(err) ? err.errorMessage : (err instanceof Error ? err.message : "Failed to create poster");
      showError(errorMessage);
      return null;
    }
  };

  /**
   * Handle "Add to Assets" action
   */
  const handleAddToAssets = async () => {
    if (isPickerMode) return;
    setProcessing(true);
    const poster = await createPoster();
    setProcessing(false);

    if (poster) {
      setPreview(null);
      onPosterAdded?.();
    }
  };

  /**
   * Handle "Display" action
   */
  const handleDisplay = async (mode: DisplayMode) => {
    if (isPickerMode) return;
    setProcessing(true);
    const poster = await createPoster();
    setProcessing(false);

    if (poster) {
      setPreview(null);
      onPosterDisplayed?.(poster, mode);
      onPosterAdded?.(); // Also refresh the grid
    }
  };

  /**
   * Handle "Use Media" action (picker mode)
   */
  const handleUseMedia = () => {
    if (!preview) return;
    onMediaSelected?.(preview);
    setPreview(null);
    setUrlInput("");
  };

  /**
   * Clear preview
   */
  const handleClearPreview = () => {
    setPreview(null);
    setUrlInput("");
    setError(null);
  };

  /**
   * Get type icon
   */
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-3 h-3" />;
      case "video":
        return <Video className="w-3 h-3" />;
      case "youtube":
        return <Youtube className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const fileAccept = [
    allowedTypes.includes("image") ? "image/*" : null,
    allowedTypes.includes("video") ? "video/*" : null,
  ]
    .filter(Boolean)
    .join(",");

  return (
    <div className="space-y-3 mb-4 pb-4 border-b">
      <h3 className="text-sm font-medium text-muted-foreground">{displayTitle}</h3>

      {/* Input Row */}
      <div className="flex gap-2">
        <div
          className={`
            flex-1 relative
            ${dragActive ? "ring-2 ring-primary" : ""}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <Input
            ref={urlInputRef}
            type="text"
            placeholder={isImageOnly ? t("placeholderImageOnly") : t("placeholderFull")}
            value={urlInput}
            onChange={handleUrlInputChange}
            onPaste={handleInputPaste}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleUrlInputSubmit();
              }
            }}
            onBlur={handleUrlInputSubmit}
            disabled={uploading || processing || !!preview}
            className={dragActive ? "border-primary" : ""}
          />
        </div>

        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || processing || !!preview}
        >
          <Upload className="w-4 h-4 mr-2" />
          {t("browseFiles")}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept={fileAccept || undefined}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Hint text */}
      {!preview && !uploading && !processing && (
        <p className="text-xs text-muted-foreground">
          💡 {isImageOnly ? t("hintImageOnly") : t("hintFull")}
        </p>
      )}

      {/* Loading state */}
      {(uploading || processing) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{uploading ? t("uploading") : t("processing")}</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {preview && (
        <div className="border rounded-lg p-3 space-y-3">
          <div className="flex gap-3">
            {/* Thumbnail */}
            <div className="w-24 h-24 rounded overflow-hidden bg-muted shrink-0">
              {preview.type === "youtube" && preview.thumbnailUrl ? (
                <img
                  src={preview.thumbnailUrl}
                  alt={preview.title}
                  className="w-full h-full object-cover"
                />
              ) : preview.type === "image" && preview.thumbnailUrl ? (
                <img
                  src={preview.thumbnailUrl}
                  alt={preview.title}
                  className="w-full h-full object-cover"
                />
              ) : preview.type === "video" ? (
                <div className="w-full h-full flex items-center justify-center bg-blue-500/20">
                  <Video className="w-8 h-8 text-blue-500" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  {getTypeIcon(preview.type)}
                </div>
              )}
            </div>

            {/* Title editor */}
            <div className="flex-1 space-y-2">
              {showTitleEditor && (
                <div>
                  <label className="text-xs text-muted-foreground">{t("titleLabel")}</label>
                  <Input
                    value={preview.title}
                    onChange={(e) =>
                      setPreview({ ...preview, title: e.target.value })
                    }
                    placeholder={t("enterTitle")}
                    className="h-8"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {getTypeIcon(preview.type)}
                  <span className="ml-1">{preview.type}</span>
                </Badge>
                {preview.source && (
                  <span className="text-xs text-muted-foreground truncate">
                    {preview.source}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {isPickerMode ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleUseMedia}
                disabled={processing}
              >
                {isImageOnly ? t("useImage") : t("useMedia")}
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAddToAssets}
                  disabled={!preview.title || processing}
                >
                  {t("addToAssets")}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisplay("left")}
                  disabled={!preview.title || processing}
                >
                  {t("displayLeft")}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisplay("right")}
                  disabled={!preview.title || processing}
                >
                  {t("displayRight")}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisplay("bigpicture")}
                  disabled={!preview.title || processing}
                >
                  {t("displayBig")}
                </Button>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearPreview}
              disabled={processing}
              className="ml-auto"
            >
              {t("clear")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
