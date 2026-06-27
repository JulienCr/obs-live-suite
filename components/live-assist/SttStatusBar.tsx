"use client";
import { useTranslations } from "next-intl";
import { useLiveAssistStore } from "@/lib/stores/liveAssistStore";

export function SttStatusBar() {
  const t = useTranslations("dashboard.liveAssist");
  const status = useLiveAssistStore((s) => s.status);
  return (
    // Layout (padding/border) is owned by the panel header row so the status can
    // sit alongside the quick-toggle controls.
    <div className="flex items-center gap-2 text-xs">
      <span>{status.connected ? "🟢" : "🔴"}</span>
      <span>{status.connected ? (status.device ?? t("connected")) : t("disconnected")}</span>
    </div>
  );
}
