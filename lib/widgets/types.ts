import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { WidgetGridSize, WidgetSizeType } from "@/lib/models/Widget";

/**
 * Widget component props
 */
export interface WidgetComponentProps {
  /**
   * Current size of the widget (for responsive behavior)
   */
  size?: WidgetSizeType;

  /**
   * Additional className for styling
   */
  className?: string;

  /**
   * Widget-specific settings
   */
  settings?: Record<string, unknown>;
}

/**
 * Widget metadata for registry
 */
export interface WidgetMetadata {
  /**
   * Unique identifier for the widget type
   */
  type: string;

  /**
   * Display name
   */
  name: string;

  /**
   * Description shown in add widget dialog
   */
  description: string;

  /**
   * Icon for the widget
   */
  icon: LucideIcon;

  /**
   * Default size when added
   */
  defaultSize: WidgetSizeType;

  /**
   * Grid size configuration for each size variant
   */
  gridSizes: {
    small: WidgetGridSize;
    medium: WidgetGridSize;
    large: WidgetGridSize;
  };

  /**
   * Whether multiple instances are allowed
   */
  allowMultiple?: boolean;

  /**
   * Default settings for the widget
   */
  defaultSettings?: Record<string, unknown>;

  /**
   * React component for the widget
   */
  component: React.ComponentType<WidgetComponentProps>;

  /**
   * Optional preview component for add widget dialog
   */
  preview?: ReactNode;
}

/**
 * Widget registry type
 */
export type WidgetRegistry = Map<string, WidgetMetadata>;
