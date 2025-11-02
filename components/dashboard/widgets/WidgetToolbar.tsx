"use client";

import { useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddWidgetDialog } from "./AddWidgetDialog";
import { Widget } from "@/lib/models/Widget";

interface WidgetToolbarProps {
  widgets: Widget[];
  onAddWidget: (type: string, size: string) => void;
  onResetLayout: () => void;
}

export function WidgetToolbar({
  widgets,
  onAddWidget,
  onResetLayout,
}: WidgetToolbarProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleResetLayout = () => {
    if (
      confirm(
        "Are you sure you want to reset the dashboard to its default layout? This will remove all custom widgets and settings."
      )
    ) {
      onResetLayout();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Dashboard Widgets</h2>
          <p className="text-sm text-muted-foreground">
            Customize your dashboard by adding, removing, and arranging widgets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
            title="Reset to default layout"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
        </div>
      </div>

      <AddWidgetDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAddWidget={onAddWidget}
        existingWidgets={widgets}
      />
    </>
  );
}
