"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Maximize2, Minimize2, Square } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Widget, WidgetSize } from "@/lib/models/Widget";
import { getWidget } from "@/lib/widgets/registry";

interface WidgetCardProps {
  widget: Widget;
  onRemove: (id: string) => void;
  onResize: (id: string, size: string) => void;
}

export function WidgetCard({ widget, onRemove, onResize }: WidgetCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const metadata = getWidget(widget.type);

  if (!metadata) {
    console.warn(`Widget type "${widget.type}" not found in registry`);
    return null;
  }

  const Component = metadata.component;

  // Determine grid column span based on size
  const colSpanClass = {
    [WidgetSize.SMALL]: "col-span-12 md:col-span-6 lg:col-span-4",
    [WidgetSize.MEDIUM]: "col-span-12 lg:col-span-6",
    [WidgetSize.LARGE]: "col-span-12",
  }[widget.size];

  // Size options for the widget
  const sizeOptions = [
    { value: WidgetSize.SMALL, icon: Minimize2, label: "Small" },
    { value: WidgetSize.MEDIUM, icon: Square, label: "Medium" },
    { value: WidgetSize.LARGE, icon: Maximize2, label: "Large" },
  ];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        colSpanClass,
        "relative transition-opacity",
        isDragging && "opacity-50 z-50"
      )}
    >
      <Card className="relative h-full group">
        {/* Widget controls overlay */}
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Size controls */}
          <div className="flex items-center gap-0.5 bg-background/95 backdrop-blur-sm border rounded-md p-0.5">
            {sizeOptions.map((option) => (
              <Button
                key={option.value}
                variant={widget.size === option.value ? "default" : "ghost"}
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onResize(widget.id, option.value)}
                title={option.label}
              >
                <option.icon className="h-3 w-3" />
              </Button>
            ))}
          </div>

          {/* Drag handle */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 cursor-grab active:cursor-grabbing bg-background/95 backdrop-blur-sm border"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </Button>

          {/* Remove button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground bg-background/95 backdrop-blur-sm border"
            onClick={() => onRemove(widget.id)}
            title="Remove widget"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Widget content */}
        <Component
          size={widget.size}
          settings={widget.settings}
          className="h-full"
        />
      </Card>
    </div>
  );
}
