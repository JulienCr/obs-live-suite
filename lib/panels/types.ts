import type { IDockviewPanelProps } from "dockview-react";

/**
 * Panel context type - determines which wrapper features are enabled
 */
export type PanelContext = "dashboard" | "presenter" | "settings" | "overlay";

/**
 * Configuration for a panel definition
 */
export interface PanelConfig {
  /** Unique panel identifier */
  id: string;

  /** Panel context determines available features */
  context: PanelContext;

  /** WebSocket channels this panel subscribes to (optional) */
  channels?: string[];

  /** Overlay type for sync (if panel controls an overlay) */
  overlayType?: "lowerThird" | "countdown" | "poster" | "chatHighlight";

  /** Whether panel supports color customization (default: true for dashboard) */
  colorMenuEnabled?: boolean;

  /** Default padding (default: "1rem" for dashboard, "0" for others) */
  padding?: string | number;

  /** Whether to enable overflow scrolling (default: true) */
  scrollable?: boolean;
}

/**
 * Props for BasePanelWrapper
 */
export interface BasePanelWrapperProps {
  /** Panel configuration */
  config: PanelConfig;

  /** Panel content */
  children: React.ReactNode;

  /** Dockview props (passed through for dashboard panels) */
  dockviewProps?: IDockviewPanelProps;

  /** Override padding */
  padding?: string | number;

  /** Additional CSS classes */
  className?: string;

  /** Custom style overrides */
  style?: React.CSSProperties;
}
