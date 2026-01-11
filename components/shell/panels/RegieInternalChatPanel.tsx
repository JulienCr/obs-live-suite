"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { type IDockviewPanelProps } from "dockview-react";
import { Send, Pin, AlertCircle, Info, AlertTriangle, Clock, FileText, Megaphone, Tv, Wrench } from "lucide-react";
import { PanelColorMenu } from "../PanelColorMenu";
import { Button } from "@/components/ui/button";
import { CueType, CueSeverity, CueFrom } from "@/lib/models/Cue";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/utils/ClientFetch";

const cueTypeOptions = [
  { value: CueType.CUE, labelKey: "cueTypes.cue", icon: AlertCircle },
  { value: CueType.NOTE, labelKey: "cueTypes.note", icon: FileText },
  { value: CueType.COUNTDOWN, labelKey: "cueTypes.timer", icon: Clock },
];

const severityOptions = [
  { value: CueSeverity.INFO, labelKey: "severity.info", icon: Info, color: "blue" },
  { value: CueSeverity.WARN, labelKey: "severity.warn", icon: AlertTriangle, color: "yellow" },
  { value: CueSeverity.URGENT, labelKey: "severity.urgent", icon: AlertCircle, color: "red" },
];

const quickTemplates = [
  { labelKey: "templates.ad", icon: Tv, severity: CueSeverity.WARN, bodyKey: "templates.adBody" },
  { labelKey: "templates.tech", icon: Wrench, severity: CueSeverity.URGENT, bodyKey: "templates.techBody" },
  { labelKey: "templates.wrap", icon: Megaphone, severity: CueSeverity.INFO, bodyKey: "templates.wrapBody" },
];

function RegieInternalChatContent() {
  const t = useTranslations("regieChat");
  const [cueType, setCueType] = useState<CueType>(CueType.CUE);
  const [severity, setSeverity] = useState<CueSeverity>(CueSeverity.INFO);
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = async () => {
    if (!body.trim() && cueType !== CueType.COUNTDOWN) return;

    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        type: cueType,
        from: CueFrom.CONTROL,
        body: body.trim() || undefined,
        pinned,
      };

      if (cueType === CueType.CUE) {
        payload.severity = severity;
      }

      if (cueType === CueType.COUNTDOWN) {
        payload.countdownPayload = {
          mode: "duration",
          durationSec: countdownSeconds,
        };
      }

      await apiPost("/api/presenter/cue/send", payload);
      setBody("");
      setPinned(false);
      textareaRef.current?.focus();
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickTemplate = (template: typeof quickTemplates[0]) => {
    setCueType(CueType.CUE);
    setSeverity(template.severity);
    setBody(t(template.bodyKey));
    textareaRef.current?.focus();
  };

  return (
    <div className="p-3 h-full flex flex-col gap-3">
      {/* Type Toggle Group */}
      <div className="flex gap-1">
        {cueTypeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = cueType === option.value;
          return (
            <Button
              key={option.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setCueType(option.value)}
            >
              <Icon className="h-4 w-4 mr-1" />
              {t(option.labelKey)}
            </Button>
          );
        })}
      </div>

      {/* Severity Toggle Group (only for CUE type) */}
      {cueType === CueType.CUE && (
        <div className="flex gap-1">
          {severityOptions.map((option) => {
            const Icon = option.icon;
            const isActive = severity === option.value;
            return (
              <Button
                key={option.value}
                variant="outline"
                size="sm"
                className={cn(
                  "flex-1 transition-colors",
                  isActive && option.color === "blue" && "bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400",
                  isActive && option.color === "yellow" && "bg-yellow-500/20 border-yellow-500 text-yellow-600 dark:text-yellow-400",
                  isActive && option.color === "red" && "bg-red-500/20 border-red-500 text-red-600 dark:text-red-400"
                )}
                onClick={() => setSeverity(option.value)}
              >
                <Icon className="h-4 w-4 mr-1" />
                {t(option.labelKey)}
              </Button>
            );
          })}
        </div>
      )}

      {/* Countdown Duration (only for COUNTDOWN type) */}
      {cueType === CueType.COUNTDOWN && (
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">{t("duration")}:</span>
          <div className="flex gap-1">
            {[30, 60, 120, 300].map((secs) => (
              <Button
                key={secs}
                variant={countdownSeconds === secs ? "default" : "outline"}
                size="sm"
                onClick={() => setCountdownSeconds(secs)}
              >
                {secs < 60 ? `${secs}s` : `${secs / 60}m`}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Message Textarea */}
      <textarea
        ref={textareaRef}
        placeholder={t("placeholder")}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        className="flex-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
      />

      {/* Actions Row: Pin + Templates + Send */}
      <div className="flex gap-2 items-center">
        {/* Pin Toggle */}
        <Button
          variant={pinned ? "default" : "outline"}
          size="sm"
          onClick={() => setPinned(!pinned)}
          className={cn(pinned && "bg-primary")}
        >
          <Pin className="h-4 w-4" />
        </Button>

        {/* Quick Templates */}
        <div className="flex gap-1 flex-1">
          {quickTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <Button
                key={template.labelKey}
                variant="ghost"
                size="sm"
                onClick={() => handleQuickTemplate(template)}
                title={t(template.bodyKey)}
              >
                <Icon className="h-4 w-4 mr-1" />
                {t(template.labelKey)}
              </Button>
            );
          })}
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSend}
          disabled={sending || (!body.trim() && cueType !== CueType.COUNTDOWN)}
          className="px-6"
        >
          <Send className="h-4 w-4 mr-1" />
          {sending ? "..." : t("send")}
        </Button>
      </div>
    </div>
  );
}

export function RegieInternalChatPanel(props: IDockviewPanelProps) {
  return (
    <PanelColorMenu panelId="regieInternalChat">
      <div data-panel-id="regieInternalChat" style={{ height: "100%", overflow: "hidden" }}>
        <RegieInternalChatContent />
      </div>
    </PanelColorMenu>
  );
}
