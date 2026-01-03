"use client";

import { useState, useRef, DragEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ImageCropper } from "./ImageCropper";
import { Upload, Loader2, X } from "lucide-react";

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
          className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-semibold overflow-hidden flex-shrink-0 border-2"
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
            className="flex-shrink-0"
            title={t("removeAvatar")}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        </div>
      </div>
    </>
  );
}

