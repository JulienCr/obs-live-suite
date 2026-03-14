"use client";

import { useState, useRef, DragEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageCropper } from "./ImageCropper";
import { Upload, Loader2, X, Instagram } from "lucide-react";
import { extractInstagramUsername } from "@/lib/utils/urlDetection";

interface AvatarUploaderProps {
  currentAvatar?: string;
  onUpload: (url: string) => void;
  accentColor?: string;
}

/**
 * Avatar uploader with cropping and preview for guest avatars
 */
export function AvatarUploader({ currentAvatar, onUpload, accentColor = "#3b82f6" }: AvatarUploaderProps) {
  const t = useTranslations("assets.avatar");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(currentAvatar);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [instagramInput, setInstagramInput] = useState("");
  const [instagramLoading, setInstagramLoading] = useState(false);
  const [instagramError, setInstagramError] = useState<string | null>(null);
  const [showInstagram, setShowInstagram] = useState(false);

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
    // Validate it's an image
    if (!file.type.startsWith("image/")) {
      alert(t("pleaseUploadImage"));
      return;
    }

    // Load image for cropping
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setUploading(true);
    setImageToCrop(null);

    try {
      const formData = new FormData();
      formData.append("file", croppedBlob, "avatar.jpg");

      console.log("[AvatarUploader] Uploading cropped avatar...");
      const res = await fetch("/api/assets/guests/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || t("uploadFailed"));
      }

      const data = await res.json();
      console.log("[AvatarUploader] Upload successful, URL:", data.url);
      setPreviewUrl(data.url);
      onUpload(data.url);
    } catch (error) {
      console.error("[AvatarUploader] Upload failed:", error);
      alert(error instanceof Error ? error.message : t("uploadFailed"));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(undefined);
    onUpload("");
  };

  const handleInstagramFetch = async () => {
    const username = extractInstagramUsername(instagramInput.trim());
    if (!username) {
      setInstagramError(t("instagramFetchFailed"));
      return;
    }

    setInstagramLoading(true);
    setInstagramError(null);

    try {
      const res = await fetch("/api/assets/instagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, type: "profile" }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || t("instagramFetchFailed"));
      }

      const data = await res.json();

      // Feed into existing crop flow
      setImageToCrop(data.url);
      setInstagramInput("");
      setShowInstagram(false);
    } catch (err) {
      setInstagramError(err instanceof Error ? err.message : t("instagramFetchFailed"));
    } finally {
      setInstagramLoading(false);
    }
  };

  return (
    <>
      {imageToCrop && (
        <ImageCropper
          image={imageToCrop}
          onCropComplete={handleCropComplete}
          onCancel={() => setImageToCrop(null)}
        />
      )}
      
      <div className="space-y-2">
        <div className="flex items-center gap-4">
        {/* Avatar Preview */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold overflow-hidden shrink-0 border-2"
          style={{ backgroundColor: accentColor, borderColor: accentColor }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={t("avatarPreview")}
              className="w-full h-full object-cover"
            />
          ) : (
            <Upload className="w-8 h-8" />
          )}
        </div>

        {/* Upload Area */}
        <div className="flex-1">
          <div
            className={`
              border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
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
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t("uploading")}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium mb-1">
                  {previewUrl ? t("changeAvatar") : t("uploadAvatar")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("dropOrBrowse")}
                </p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Remove Button */}
        {previewUrl && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleRemove}
            className="shrink-0"
            title={t("removeAvatar")}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        </div>
        {/* Instagram Import */}
        <div className="mt-2">
          {!showInstagram ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInstagram(true)}
              className="text-xs text-muted-foreground gap-1"
            >
              <Instagram className="w-3 h-3" />
              {t("importInstagram")}
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Instagram className="w-4 h-4 text-muted-foreground shrink-0" />
              <Input
                type="text"
                placeholder={t("instagramPlaceholder")}
                value={instagramInput}
                onChange={(e) => {
                  setInstagramInput(e.target.value);
                  setInstagramError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInstagramFetch();
                  if (e.key === "Escape") {
                    setShowInstagram(false);
                    setInstagramInput("");
                    setInstagramError(null);
                  }
                }}
                disabled={instagramLoading}
                className="h-7 text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleInstagramFetch}
                disabled={instagramLoading || !instagramInput.trim()}
                className="h-7 text-xs shrink-0"
              >
                {instagramLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  t("importInstagram")
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowInstagram(false);
                  setInstagramInput("");
                  setInstagramError(null);
                }}
                className="h-7 text-xs shrink-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
          {instagramError && (
            <p className="text-xs text-destructive mt-1">{instagramError}</p>
          )}
        </div>
      </div>
    </>
  );
}

