import { v4 as uuidv4 } from "uuid";
import { Widget, WidgetSize, WidgetHeight } from "@/lib/models/Widget";

const STORAGE_KEY = "obs-live-suite-widget-layout";
const STORAGE_VERSION = 1;

interface StoredLayout {
  version: number;
  widgets: Widget[];
  updatedAt: string;
}

/**
 * Get default widget layout
 */
export function getDefaultLayout(): Widget[] {
  const now = new Date();

  return [
    {
      id: uuidv4(),
      type: "guests",
      size: WidgetSize.SMALL,
      height: WidgetHeight.AUTO,
      order: 0,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      type: "countdown",
      size: WidgetSize.MEDIUM,
      height: WidgetHeight.AUTO,
      order: 1,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      type: "poster",
      size: WidgetSize.SMALL,
      height: WidgetHeight.AUTO,
      order: 2,
      isVisible: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

/**
 * Load widget layout from localStorage
 */
export function loadLayout(): Widget[] {
  if (typeof window === "undefined") {
    return getDefaultLayout();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return getDefaultLayout();
    }

    const parsed: StoredLayout = JSON.parse(stored);

    // Check version compatibility
    if (parsed.version !== STORAGE_VERSION) {
      console.warn("Widget layout version mismatch, using default layout");
      return getDefaultLayout();
    }

    // Parse dates
    const widgets = parsed.widgets.map((widget) => ({
      ...widget,
      createdAt: new Date(widget.createdAt),
      updatedAt: new Date(widget.updatedAt),
    }));

    // Validate that we have at least some widgets
    if (widgets.length === 0) {
      return getDefaultLayout();
    }

    return widgets;
  } catch (error) {
    console.error("Failed to load widget layout:", error);
    return getDefaultLayout();
  }
}

/**
 * Save widget layout to localStorage
 */
export function saveLayout(widgets: Widget[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const layout: StoredLayout = {
      version: STORAGE_VERSION,
      widgets,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch (error) {
    console.error("Failed to save widget layout:", error);
  }
}

/**
 * Reset layout to default
 */
export function resetLayout(): Widget[] {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  return getDefaultLayout();
}

/**
 * Add a widget to the layout
 */
export function addWidget(
  widgets: Widget[],
  type: string,
  size: string = WidgetSize.MEDIUM,
  settings?: Record<string, unknown>
): Widget[] {
  const now = new Date();
  const maxOrder = widgets.reduce((max, w) => Math.max(max, w.order), -1);

  const newWidget: Widget = {
    id: uuidv4(),
    type,
    size: size as Widget["size"],
    height: WidgetHeight.AUTO,
    order: maxOrder + 1,
    isVisible: true,
    settings,
    createdAt: now,
    updatedAt: now,
  };

  return [...widgets, newWidget];
}

/**
 * Remove a widget from the layout
 */
export function removeWidget(widgets: Widget[], id: string): Widget[] {
  return widgets.filter((w) => w.id !== id);
}

/**
 * Update a widget in the layout
 */
export function updateWidget(
  widgets: Widget[],
  id: string,
  updates: Partial<Omit<Widget, "id" | "createdAt">>
): Widget[] {
  return widgets.map((widget) => {
    if (widget.id === id) {
      return {
        ...widget,
        ...updates,
        updatedAt: new Date(),
      };
    }
    return widget;
  });
}

/**
 * Reorder widgets after drag-and-drop
 */
export function reorderWidgets(widgets: Widget[], fromIndex: number, toIndex: number): Widget[] {
  const result = Array.from(widgets);
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);

  // Update order property to match new positions
  return result.map((widget, index) => ({
    ...widget,
    order: index,
    updatedAt: new Date(),
  }));
}
