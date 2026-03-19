"use client";

import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FontSizeCombobox } from "./FontSizeCombobox";
import { ShiftStepInput } from "./ShiftStepInput";
import type { TitleRevealLine } from "@/lib/queries/useTitleReveals";

interface TitleRevealLineEditorProps {
  line: TitleRevealLine;
  index: number;
  onChange: (index: number, line: TitleRevealLine) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export function TitleRevealLineEditor({
  line,
  index,
  onChange,
  onRemove,
  canRemove,
}: TitleRevealLineEditorProps) {
  const t = useTranslations("dashboard.titleReveal");

  const update = (patch: Partial<TitleRevealLine>) => {
    onChange(index, { ...line, ...patch });
  };

  return (
    <div className="rounded-md border border-input bg-muted/30 p-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            value={line.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder={t("textPlaceholder")}
            className="text-sm"
          />
        </div>
        {canRemove && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 shrink-0"
            onClick={() => onRemove(index)}
            title={t("removeLine")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">{t("fontSize")}</Label>
          <FontSizeCombobox
            value={line.fontSize}
            onChange={(v) => update({ fontSize: v })}
            className="text-xs h-8 w-full"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("alignment")}</Label>
          <div className="flex gap-0.5">
            {(["l", "c", "r"] as const).map((a) => (
              <Button
                key={a}
                variant={line.alignment === a ? "default" : "outline"}
                size="sm"
                className="h-8 flex-1 px-1 text-xs"
                onClick={() => update({ alignment: a })}
              >
                {a.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("offsetX")}</Label>
          <ShiftStepInput
            value={line.offsetX}
            onChange={(v) => update({ offsetX: v })}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">{t("offsetY")}</Label>
          <ShiftStepInput
            value={line.offsetY}
            onChange={(v) => update({ offsetY: v })}
          />
        </div>
      </div>
    </div>
  );
}
