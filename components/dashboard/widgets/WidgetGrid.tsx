"use client";

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
import { WidgetCard } from "./WidgetCard";

interface WidgetGridProps {
  widgets: Widget[];
  isLocked: boolean;
  onRemove: (id: string) => void;
  onResize: (id: string, size: string) => void;
  onChangeHeight: (id: string, height: string) => void;
  onReorder: (widgets: Widget[]) => void;
}

export function WidgetGrid({ widgets, isLocked, onRemove, onResize, onChangeHeight, onReorder }: WidgetGridProps) {
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
      const oldIndex = widgets.findIndex((item) => item.id === active.id);
      const newIndex = widgets.findIndex((item) => item.id === over.id);

      const reordered = arrayMove(widgets, oldIndex, newIndex);

      // Update order property for all widgets
      const updated = reordered.map((widget, index) => ({
        ...widget,
        order: index,
        updatedAt: new Date(),
      }));

      onReorder(updated);
    }
  };

  // Filter visible widgets and sort by order
  const visibleWidgets = widgets
    .filter((w) => w.isVisible)
    .sort((a, b) => a.order - b.order);

  if (visibleWidgets.length === 0) {
    return (
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 text-center text-muted-foreground py-8">
          No widgets added. Click &quot;Add Widget&quot; to get started.
        </div>
      </div>
    );
  }

  // If locked, don't use DndContext - just render widgets
  if (isLocked) {
    return (
      <div className="grid grid-cols-12 gap-6">
        {visibleWidgets.map((widget) => (
          <WidgetCard
            key={widget.id}
            widget={widget}
            isLocked={isLocked}
            onRemove={onRemove}
            onResize={onResize}
            onChangeHeight={onChangeHeight}
          />
        ))}
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
              isLocked={isLocked}
              onRemove={onRemove}
              onResize={onResize}
              onChangeHeight={onChangeHeight}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
