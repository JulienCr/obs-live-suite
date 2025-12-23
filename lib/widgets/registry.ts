import { Users, Clock, Image, MessageSquare, Video } from "lucide-react";
import { WidgetMetadata, WidgetRegistry } from "./types";
import { WidgetSize } from "@/lib/models/Widget";
import { GuestsCard } from "@/components/dashboard/cards/GuestsCard";
import { CountdownCard } from "@/components/dashboard/cards/CountdownCard";
import { PosterCard } from "@/components/dashboard/cards/PosterCard";
import { LowerThirdCard } from "@/components/dashboard/cards/LowerThirdCard";
import { MediaCard } from "@/components/dashboard/cards/MediaCard";

/**
 * Central widget registry
 */
const widgetRegistry: WidgetRegistry = new Map<string, WidgetMetadata>();

/**
 * Register a widget type
 */
export function registerWidget(metadata: WidgetMetadata): void {
  widgetRegistry.set(metadata.type, metadata);
}

/**
 * Get widget metadata by type
 */
export function getWidget(type: string): WidgetMetadata | undefined {
  return widgetRegistry.get(type);
}

/**
 * Get all registered widgets
 */
export function getAllWidgets(): WidgetMetadata[] {
  return Array.from(widgetRegistry.values());
}

/**
 * Check if a widget type exists
 */
export function hasWidget(type: string): boolean {
  return widgetRegistry.has(type);
}

/**
 * Unregister a widget type
 */
export function unregisterWidget(type: string): boolean {
  return widgetRegistry.delete(type);
}

// Register built-in widgets

registerWidget({
  type: "guests",
  name: "Guests",
  description: "Manage and display guest lower thirds",
  icon: Users,
  defaultSize: WidgetSize.SMALL,
  gridSizes: {
    small: { cols: 4, minCols: 4, maxCols: 6 },
    medium: { cols: 6, minCols: 4, maxCols: 8 },
    large: { cols: 12, minCols: 8, maxCols: 12 },
  },
  allowMultiple: false,
  component: GuestsCard,
});

registerWidget({
  type: "countdown",
  name: "Countdown",
  description: "Countdown timer for live events",
  icon: Clock,
  defaultSize: WidgetSize.MEDIUM,
  gridSizes: {
    small: { cols: 4, minCols: 4, maxCols: 6 },
    medium: { cols: 6, minCols: 4, maxCols: 8 },
    large: { cols: 12, minCols: 8, maxCols: 12 },
  },
  allowMultiple: false,
  component: CountdownCard,
});

registerWidget({
  type: "poster",
  name: "Poster",
  description: "Display and manage poster gallery",
  icon: Image,
  defaultSize: WidgetSize.SMALL,
  gridSizes: {
    small: { cols: 4, minCols: 4, maxCols: 6 },
    medium: { cols: 6, minCols: 4, maxCols: 8 },
    large: { cols: 12, minCols: 8, maxCols: 12 },
  },
  allowMultiple: false,
  component: PosterCard,
});

registerWidget({
  type: "lowerthird",
  name: "Lower Third",
  description: "Control lower third overlays",
  icon: MessageSquare,
  defaultSize: WidgetSize.MEDIUM,
  gridSizes: {
    small: { cols: 4, minCols: 4, maxCols: 6 },
    medium: { cols: 6, minCols: 4, maxCols: 8 },
    large: { cols: 12, minCols: 8, maxCols: 12 },
  },
  allowMultiple: false,
  component: LowerThirdCard,
});

registerWidget({
  type: "media",
  name: "Media Overlay",
  description: "Fullscreen media player with YouTube, MP4, and images",
  icon: Video,
  defaultSize: WidgetSize.MEDIUM,
  gridSizes: {
    small: { cols: 4, minCols: 4, maxCols: 6 },
    medium: { cols: 6, minCols: 4, maxCols: 8 },
    large: { cols: 12, minCols: 8, maxCols: 12 },
  },
  allowMultiple: false,
  component: MediaCard,
});
