"use client";

import { useState, useEffect } from "react";
import { Widget } from "@/lib/models/Widget";
import {
  loadLayout,
  saveLayout,
  addWidget as addWidgetToLayout,
  resetLayout,
  removeWidget as removeWidgetFromLayout,
  updateWidget as updateWidgetInLayout,
} from "@/lib/utils/widgetStorage";
import { WidgetGrid } from "./WidgetGrid";
import { WidgetToolbar } from "./WidgetToolbar";

export function WidgetManager() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [mounted, setMounted] = useState(false);

  // Load layout on mount
  useEffect(() => {
    const layout = loadLayout();
    setWidgets(layout);
    setMounted(true);
  }, []);

  // Save layout whenever widgets change
  useEffect(() => {
    if (mounted) {
      saveLayout(widgets);
    }
  }, [widgets, mounted]);

  const handleAddWidget = (type: string, size: string) => {
    setWidgets((current) => addWidgetToLayout(current, type, size));
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets((current) => removeWidgetFromLayout(current, id));
  };

  const handleResizeWidget = (id: string, size: string) => {
    setWidgets((current) =>
      updateWidgetInLayout(current, id, {
        size: size as typeof Widget.prototype.size,
      })
    );
  };

  const handleChangeHeight = (id: string, height: string) => {
    setWidgets((current) =>
      updateWidgetInLayout(current, id, {
        height: height as typeof Widget.prototype.height,
      })
    );
  };

  const handleReorderWidgets = (reorderedWidgets: Widget[]) => {
    setWidgets(reorderedWidgets);
  };

  const handleResetLayout = () => {
    const defaultLayout = resetLayout();
    setWidgets(defaultLayout);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div>
      <WidgetToolbar
        widgets={widgets}
        onAddWidget={handleAddWidget}
        onResetLayout={handleResetLayout}
      />
      <WidgetGrid
        widgets={widgets}
        onRemove={handleRemoveWidget}
        onResize={handleResizeWidget}
        onChangeHeight={handleChangeHeight}
        onReorder={handleReorderWidgets}
      />
    </div>
  );
}
