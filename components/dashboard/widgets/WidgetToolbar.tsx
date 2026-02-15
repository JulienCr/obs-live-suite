"use client";

import { useState } from "react";
import { Plus, RotateCcw, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddWidgetDialog } from "./AddWidgetDialog";
import { Widget } from "@/lib/models/Widget";
import { useTranslations } from "next-intl";

interface WidgetToolbarProps {
  widgets: Widget[];
  isLocked: boolean;
  onAddWidget: (type: string, size: string) => void;
  onResetLayout: () => void;
  onToggleLock: () => void;
}

export function WidgetToolbar({
  widgets,
  isLocked,
  onAddWidget,
  onResetLayout,
  onToggleLock,
}: WidgetToolbarProps) {
  const t = useTranslations("dashboard.widgets");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleResetLayout = () => {
    if (confirm(t("resetConfirm"))) {
      onResetLayout();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">
            {isLocked
              ? t("lockedDescription")
              : t("unlockedDescription")
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isLocked ? "default" : "outline-solid"}
            size="sm"
            onClick={onToggleLock}
            title={isLocked ? t("unlockToEdit") : t("lockToPrevent")}
          >
            {isLocked ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                {t("unlock")}
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                {t("lock")}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetLayout}
            title={t("resetToDefault")}
            disabled={isLocked}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t("reset")}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            disabled={isLocked}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t("addWidget")}
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
