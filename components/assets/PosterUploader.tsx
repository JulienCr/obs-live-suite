"use client";

import { useState, useRef, DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Link2, Loader2 } from "lucide-react";

interface PosterUploaderProps {
  onUpload: (url: string, type: "image" | "video" | "youtube") => void;
  onCancel: () => void;
}

/**
 * Poster uploader with file upload, drag-drop, and YouTube support
 */
export function PosterUploader({ onUpload, onCancel }: PosterUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [mode, setMode] = useState<"file" | "youtube">("file");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await res.json();
      onUpload(data.url, data.type);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleYouTubeSubmit = () => {
    if (!youtubeUrl) return;

    // Extract YouTube video ID
    let videoId = "";

    // Helper to extract ID from URL object
    const getIdFromUrl = (urlObj: URL) => {
      if (urlObj.hostname.includes("youtube.com")) {
        return urlObj.searchParams.get("v") || "";
      } else if (urlObj.hostname === "youtu.be") {
        return urlObj.pathname.slice(1);
      }
      return "";
    };

    try {
      // Try parsing as is
      const url = new URL(youtubeUrl);
      videoId = getIdFromUrl(url);
    } catch {
      // Try parsing with https:// prefix
      try {
        const url = new URL(`https://${youtubeUrl}`);
        videoId = getIdFromUrl(url);
      } catch {
        // Not a URL, treat as just the ID
        videoId = youtubeUrl;
      }
    }

    if (!videoId) {
      alert("Invalid YouTube URL");
      return;
    }

    // Return YouTube embed URL
    onUpload(`https://www.youtube.com/embed/${videoId}`, "youtube");
  };

  return (
    <Alert>
      <AlertDescription>
        <div className="space-y-4 mt-2">
          {/* Mode Selector */}
          <div className="flex gap-2">
            <Button
              variant={mode === "file" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("file")}
            >
              <Upload className="w-3 h-3 mr-2" />
              Upload File
            </Button>
            <Button
              variant={mode === "youtube" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("youtube")}
            >
              <Link2 className="w-3 h-3 mr-2" />
              YouTube Video
            </Button>
          </div>

          {/* File Upload Mode */}
          {mode === "file" && (
            <>
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors
                  ${dragActive ? "border-primary bg-primary/5" : "border-muted"}
                  ${uploading ? "opacity-50 pointer-events-none" : ""}
                `}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-2">
                      Drag and drop a file here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supported: JPG, PNG, GIF, WebP, MP4, WebM, MOV
                    </p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}

          {/* YouTube Mode */}
          {mode === "youtube" && (
            <div className="space-y-2">
              <Label htmlFor="youtubeUrl">YouTube Video URL</Label>
              <Input
                id="youtubeUrl"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-muted-foreground">
                Paste a YouTube video URL or video ID
              </p>
              <Button onClick={handleYouTubeSubmit} disabled={!youtubeUrl}>
                Add YouTube Video
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

