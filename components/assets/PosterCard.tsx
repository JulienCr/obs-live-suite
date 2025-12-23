"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Power, PowerOff, Trash2, Play, Image as ImageIcon } from "lucide-react";

interface Poster {
  id: string;
  title: string;
  fileUrl: string;
  type: "image" | "video" | "youtube";
  tags: string[];
  isEnabled?: boolean;
  createdAt?: string;
}

interface PosterCardProps {
  poster: Poster;
  variant?: "enabled" | "disabled";
  onEdit?: (poster: Poster) => void;
  onToggleEnabled?: (poster: Poster) => void;
  onDelete?: (poster: Poster) => void;
  isSelected?: boolean;
  onToggleSelection?: (id: string) => void;
  isBulkDeleting?: boolean;
  showSelectionCheckbox?: boolean;
}

/**
 * Reusable poster card component with optimized media preview
 */
export function PosterCard({
  poster,
  variant = "enabled",
  onEdit,
  onToggleEnabled,
  onDelete,
  isSelected = false,
  onToggleSelection,
  isBulkDeleting = false,
  showSelectionCheckbox = false,
}: PosterCardProps) {
  const isEnabled = variant === "enabled";
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Lazy load images using IntersectionObserver
  useEffect(() => {
    if (poster.type !== "image" || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.onload = () => setIsLoaded(true);
            }
          }
        });
      },
      { rootMargin: "50px" }
    );

    observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, [poster.type]);

  const handleVideoHover = (play: boolean) => {
    if (videoRef.current) {
      if (play) {
        videoRef.current.play().catch(() => {
          // Ignore play errors
        });
        setIsVideoPlaying(true);
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
        setIsVideoPlaying(false);
      }
    }
  };

  // Extract YouTube video ID for thumbnail
  const getYouTubeThumbnail = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([^?&]+)/)?.[1];
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  };

  const visibleTags = poster.tags.slice(0, 3);
  const remainingTagsCount = poster.tags.length - 3;

  return (
    <div
      className={`group relative border rounded-lg overflow-hidden hover:shadow-lg transition-all ${
        !isEnabled ? "opacity-60" : ""
      }`}
    >
      {/* Selection checkbox - top left */}
      {showSelectionCheckbox && onToggleSelection && (
        <div
          className={`absolute top-2 left-2 z-10 ${
            isSelected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          } transition-opacity`}
        >
          <div className="bg-background/90 backdrop-blur-sm rounded-md p-1 shadow-md">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(poster.id)}
              onClick={(e) => e.stopPropagation()}
              disabled={isBulkDeleting}
            />
          </div>
        </div>
      )}

      {/* Media Preview */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {poster.type === "image" ? (
          <>
            <img
              ref={imgRef}
              data-src={poster.fileUrl}
              alt={poster.title}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
            {!isLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground animate-pulse" />
              </div>
            )}
          </>
        ) : poster.type === "youtube" ? (
          <div className="relative w-full h-full">
            <img
              src={getYouTubeThumbnail(poster.fileUrl) || poster.fileUrl}
              alt={poster.title}
              className="w-full h-full object-cover"
              onLoad={() => setIsLoaded(true)}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="w-12 h-12 text-white" />
            </div>
          </div>
        ) : (
          <div
            onMouseEnter={() => handleVideoHover(true)}
            onMouseLeave={() => handleVideoHover(false)}
            className="relative w-full h-full cursor-pointer"
          >
            <video
              ref={videoRef}
              src={poster.fileUrl}
              className="w-full h-full object-cover"
              muted
              loop
              playsInline
              preload="metadata"
            />
            {!isVideoPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
        )}

        {/* Type Badge Overlay */}
        <Badge
          variant="secondary"
          className="absolute top-2 right-2 text-xs backdrop-blur-sm bg-background/80"
        >
          {poster.type}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Title and Status */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm truncate flex-1" title={poster.title}>
            {poster.title}
          </h3>
          <Badge variant={isEnabled ? "default" : "secondary"} className="text-xs shrink-0">
            {isEnabled ? "Active" : "Disabled"}
          </Badge>
        </div>

        {/* Tags */}
        {poster.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleTags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {remainingTagsCount > 0 && (
              <Badge variant="outline" className="text-xs">
                +{remainingTagsCount}
              </Badge>
            )}
          </div>
        )}

        {/* Actions - Show on hover */}
        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(poster)}
              title="Edit"
              className="flex-1 h-8 text-xs"
            >
              <Edit className="w-3 h-3 mr-1" />
              Edit
            </Button>
          )}
          
          {onToggleEnabled && (
            <Button
              variant={isEnabled ? "outline" : "default"}
              size="sm"
              onClick={() => onToggleEnabled(poster)}
              title={isEnabled ? "Disable" : "Enable"}
              className="flex-1 h-8 text-xs"
            >
              {isEnabled ? (
                <>
                  <PowerOff className="w-3 h-3 mr-1" />
                  Disable
                </>
              ) : (
                <>
                  <Power className="w-3 h-3 mr-1" />
                  Enable
                </>
              )}
            </Button>
          )}
          
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onDelete(poster)}
              title="Delete"
              className="h-8 px-2"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

