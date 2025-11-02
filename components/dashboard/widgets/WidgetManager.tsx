"use client";

import { useState, useEffect } from "react";
import { Widget } from "@/lib/models/Widget";
import {
  loadLayout,
  saveLayout,
  addWidget as addWidgetToLayout,
  resetLayout,
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
      <WidgetGrid />
    </div>
  );
}
