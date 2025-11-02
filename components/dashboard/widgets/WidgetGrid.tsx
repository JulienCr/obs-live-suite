"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Widget } from "@/lib/models/Widget";
import {
  loadLayout,
  saveLayout,
  updateWidget,
  removeWidget as removeWidgetFromLayout,
  reorderWidgets,
} from "@/lib/utils/widgetStorage";
import { WidgetCard } from "./WidgetCard";

export function WidgetGrid() {
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

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before dragging starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);

        // Update order property for all widgets
        return reordered.map((widget, index) => ({
          ...widget,
          order: index,
          updatedAt: new Date(),
        }));
      });
    }
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets((current) => removeWidgetFromLayout(current, id));
  };

  const handleResizeWidget = (id: string, size: string) => {
    setWidgets((current) =>
      updateWidget(current, id, {
        size: size as typeof Widget.prototype.size,
      })
    );
  };

  // Filter visible widgets and sort by order
  const visibleWidgets = widgets
    .filter((w) => w.isVisible)
    .sort((a, b) => a.order - b.order);

  if (!mounted) {
    // Prevent hydration mismatch
    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 text-center text-muted-foreground py-8">
          Loading widgets...
        </div>
      </div>
    );
  }

  if (visibleWidgets.length === 0) {
    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 text-center text-muted-foreground py-8">
          No widgets added. Click &quot;Add Widget&quot; to get started.
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={visibleWidgets.map((w) => w.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="grid grid-cols-12 gap-6">
          {visibleWidgets.map((widget) => (
            <WidgetCard
              key={widget.id}
              widget={widget}
              onRemove={handleRemoveWidget}
              onResize={handleResizeWidget}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
