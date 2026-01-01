"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAllWidgets } from "@/lib/widgets/registry";
import { Widget } from "@/lib/models/Widget";
import { cn } from "@/lib/utils/cn";
import { useTranslations } from "next-intl";

interface AddWidgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddWidget: (type: string, size: string) => void;
  existingWidgets: Widget[];
}

export function AddWidgetDialog({
  open,
  onOpenChange,
  onAddWidget,
  existingWidgets,
}: AddWidgetDialogProps) {
  const t = useTranslations("dashboard.widgets");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const allWidgets = getAllWidgets();

  const handleAddWidget = () => {
    if (selectedType) {
      const metadata = allWidgets.find((w) => w.type === selectedType);
      if (metadata) {
        onAddWidget(selectedType, metadata.defaultSize);
        setSelectedType(null);
        onOpenChange(false);
      }
    }
  };

  // Filter out widgets that don't allow multiple instances if they already exist
  const availableWidgets = allWidgets.filter((metadata) => {
    if (metadata.allowMultiple) {
      return true;
    }
    return !existingWidgets.some((w) => w.type === metadata.type);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("addWidgetDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("addWidgetDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          {availableWidgets.length === 0 ? (
            <div className="col-span-2 text-center text-muted-foreground py-8">
              {t("addWidgetDialog.allAdded")}
            </div>
          ) : (
            availableWidgets.map((metadata) => {
              const Icon = metadata.icon;
              const isSelected = selectedType === metadata.type;

              return (
                <Card
                  key={metadata.type}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary",
                    isSelected && "border-primary bg-primary/5"
                  )}
                  onClick={() => setSelectedType(metadata.type)}
                >
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base">
                          {metadata.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {metadata.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedType(null);
              onOpenChange(false);
            }}
          >
            {t("addWidgetDialog.cancel")}
          </Button>
          <Button onClick={handleAddWidget} disabled={!selectedType}>
            {t("addWidget")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
