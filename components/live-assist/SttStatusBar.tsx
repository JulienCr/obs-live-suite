"use client";
import { useTranslations } from "next-intl";
import { useLiveAssistStore } from "@/lib/stores/liveAssistStore";

export function SttStatusBar() {
  const t = useTranslations("dashboard.liveAssist");
  const status = useLiveAssistStore((s) => s.status);
  return (
    <div className="flex items-center gap-2 text-xs px-3 py-2 border-b">
      <span>{status.connected ? "🟢" : "🔴"}</span>
      <span>{status.connected ? (status.device ?? t("connected")) : t("disconnected")}</span>
    </div>
  );
}
