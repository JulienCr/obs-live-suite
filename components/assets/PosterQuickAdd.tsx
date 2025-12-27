"use client";

import { useState, useRef, ChangeEvent, DragEvent, ClipboardEvent as ReactClipboardEvent } from "react";
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
  title = "Quick Add Media",
  showTitleEditor = true,
}: PosterQuickAddProps) {
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
      showError(`Only ${allowedTypes.join(", ")} uploads are allowed here.`);
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
      showError("YouTube links are not allowed here.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const videoId = extractYouTubeId(url);
      if (!videoId) {
        throw new Error("Invalid YouTube URL. Use youtube.com/watch?v=... or youtu.be/...");
      }

      const embedUrl = `https://www.youtube.com/embed/${videoId}`;

      // Fetch metadata
      let title = videoId; // Fallback
      let source = undefined;

      try {
        const metadataRes = await fetch(`/api/utils/metadata?url=${encodeURIComponent(embedUrl)}`);
        if (metadataRes.ok) {
          const metadata = await metadataRes.json();
          if (metadata.title) title = metadata.title;
          if (metadata.author_name && metadata.title) {
            source = `${metadata.author_name} | ${metadata.title}`;
          }
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
      showError(`Only ${allowedTypes.join(", ")} URLs are allowed here.`);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/assets/download-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to download media");
      }

      const data = await res.json();

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
      showError(err instanceof Error ? err.message : "Failed to download and upload media");
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
      showError(
        allowedTypes.length === 1 && allowedTypes[0] === "image"
          ? "Invalid URL. Paste a direct link to an image file."
          : "Invalid URL. Paste a YouTube URL or a direct link to an image/video file."
      );
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
      const res = await fetch("/api/assets/posters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: preview.title,
          description: "",
          source: preview.source || "",
          fileUrl: preview.fileUrl,
          type: preview.type,
          tags: [],
          isEnabled: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create poster");
      }

      const data = await res.json();
      return data.poster;
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create poster");
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
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>

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
            placeholder={
              allowedTypes.length === 1 && allowedTypes[0] === "image"
                ? "Paste image URL, or Ctrl+V a file..."
                : "Paste YouTube URL, image/video URL, or Ctrl+V a file..."
            }
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
          Browse Files
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
          💡 {allowedTypes.length === 1 && allowedTypes[0] === "image"
            ? "Paste an image URL, or Ctrl+V a file from your clipboard"
            : "Paste YouTube URL, image/video URL, or Ctrl+V a file from your clipboard"}
        </p>
      )}

      {/* Loading state */}
      {(uploading || processing) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{uploading ? "Uploading..." : "Processing..."}</span>
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
            <div className="w-24 h-24 rounded overflow-hidden bg-muted flex-shrink-0">
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
                  <label className="text-xs text-muted-foreground">Title</label>
                  <Input
                    value={preview.title}
                    onChange={(e) =>
                      setPreview({ ...preview, title: e.target.value })
                    }
                    placeholder="Enter title"
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
                {allowedTypes.length === 1 && allowedTypes[0] === "image" ? "Use Image" : "Use Media"}
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAddToAssets}
                  disabled={!preview.title || processing}
                >
                  Add to Assets
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisplay("left")}
                  disabled={!preview.title || processing}
                >
                  Display Left
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisplay("right")}
                  disabled={!preview.title || processing}
                >
                  Display Right
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisplay("bigpicture")}
                  disabled={!preview.title || processing}
                >
                  Display Big
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
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
