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

const LOCK_STORAGE_KEY = "obs-live-suite-dashboard-locked";

export function WidgetManager() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Load layout and lock state on mount
  useEffect(() => {
    const layout = loadLayout();
    setWidgets(layout);

    // Load lock state from localStorage
    const savedLockState = localStorage.getItem(LOCK_STORAGE_KEY);
    if (savedLockState !== null) {
      setIsLocked(savedLockState === "true");
    }

    setMounted(true);
  }, []);

  // Save layout whenever widgets change
  useEffect(() => {
    if (mounted) {
      saveLayout(widgets);
    }
  }, [widgets, mounted]);

  // Save lock state whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(LOCK_STORAGE_KEY, String(isLocked));
    }
  }, [isLocked, mounted]);

  const handleAddWidget = (type: string, size: string) => {
    setWidgets((current) => addWidgetToLayout(current, type, size));
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets((current) => removeWidgetFromLayout(current, id));
  };

  const handleResizeWidget = (id: string, size: string) => {
    setWidgets((current) =>
      updateWidgetInLayout(current, id, {
        size: size as Widget["size"],
      })
    );
  };

  const handleChangeHeight = (id: string, height: string) => {
    setWidgets((current) =>
      updateWidgetInLayout(current, id, {
        height: height as Widget["height"],
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

  const handleToggleLock = () => {
    setIsLocked((prev) => !prev);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div>
      <WidgetToolbar
        widgets={widgets}
        isLocked={isLocked}
        onAddWidget={handleAddWidget}
        onResetLayout={handleResetLayout}
        onToggleLock={handleToggleLock}
      />
      <WidgetGrid
        widgets={widgets}
        isLocked={isLocked}
        onRemove={handleRemoveWidget}
        onResize={handleResizeWidget}
        onChangeHeight={handleChangeHeight}
        onReorder={handleReorderWidgets}
      />
    </div>
  );
}
