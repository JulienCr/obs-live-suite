"use client";

import { useState } from "react";
import { type IDockviewPanelProps } from "dockview-react";
import { Send, Pin, AlertCircle, Info, AlertTriangle, Clock, FileText } from "lucide-react";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CueType, CueSeverity, CueFrom } from "@/lib/models/Cue";
import { apiPost } from "@/lib/utils/ClientFetch";

const cueTypeOptions = [
  { value: CueType.CUE, label: "Cue", icon: AlertCircle },
  { value: CueType.NOTE, label: "Note", icon: FileText },
  { value: CueType.COUNTDOWN, label: "Countdown", icon: Clock },
  { value: CueType.CONTEXT, label: "Context", icon: FileText },
];

const severityOptions = [
  { value: CueSeverity.INFO, label: "Info", icon: Info },
  { value: CueSeverity.WARN, label: "Warning", icon: AlertTriangle },
  { value: CueSeverity.URGENT, label: "Urgent", icon: AlertCircle },
];

function CueComposerContent() {
  const [cueType, setCueType] = useState<CueType>(CueType.CUE);
  const [severity, setSeverity] = useState<CueSeverity>(CueSeverity.INFO);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!body.trim() && cueType !== CueType.COUNTDOWN) return;

    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        type: cueType,
        from: CueFrom.CONTROL,
        title: title.trim() || undefined,
        body: body.trim() || undefined,
        pinned,
      };

      // Add severity for cue type
      if (cueType === CueType.CUE) {
        payload.severity = severity;
      }

      // Add countdown payload
      if (cueType === CueType.COUNTDOWN) {
        payload.countdownPayload = {
          mode: "duration",
          durationSec: countdownSeconds,
        };
      }

      await apiPost("/api/presenter/cue/send", payload);
      // Clear form
      setTitle("");
      setBody("");
      setPinned(false);
    } catch (error) {
      console.error("Failed to send cue:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-3">
        {/* Type Selector */}
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={cueType} onValueChange={(v) => setCueType(v as CueType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cueTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    <option.icon className="h-4 w-4" />
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Severity Selector (only for cue type) */}
        {cueType === CueType.CUE && (
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as CueSeverity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {severityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Countdown Duration (only for countdown type) */}
        {cueType === CueType.COUNTDOWN && (
          <div className="space-y-2">
            <Label>Duration (seconds)</Label>
            <Input
              type="number"
              value={countdownSeconds}
              onChange={(e) => setCountdownSeconds(parseInt(e.target.value) || 60)}
              min={1}
            />
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <Label>Title (optional)</Label>
          <Input
            placeholder="Enter a title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Label>Message</Label>
          <textarea
            placeholder="Enter the message..."
            value={body}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
            rows={3}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Pin Toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="pin-toggle"
            checked={pinned}
            onCheckedChange={(checked) => setPinned(checked === true)}
          />
          <Label htmlFor="pin-toggle" className="flex items-center gap-2 cursor-pointer">
            <Pin className="h-4 w-4" />
            Pin message
          </Label>
        </div>

        {/* Quick Templates */}
        <div className="space-y-2">
          <Label>Quick Templates</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCueType(CueType.CUE);
                setSeverity(CueSeverity.WARN);
                setBody("Ad break in 30 seconds");
              }}
            >
              Ad Warning
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCueType(CueType.CUE);
                setSeverity(CueSeverity.URGENT);
                setBody("Technical issue - please stand by");
              }}
            >
              Tech Issue
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCueType(CueType.CUE);
                setSeverity(CueSeverity.INFO);
                setBody("Wrap up current topic");
              }}
            >
              Wrap Up
            </Button>
          </div>
        </div>
      </div>

      {/* Send Button */}
      <Button
        className="w-full"
        onClick={handleSend}
        disabled={sending || (!body.trim() && cueType !== CueType.COUNTDOWN)}
      >
        <Send className="h-4 w-4 mr-2" />
        {sending ? "Sending..." : "Send Cue"}
      </Button>
    </div>
  );
}

const config: PanelConfig = { id: "cueComposer", context: "dashboard", padding: 0 };

export function CueComposerPanel(props: IDockviewPanelProps) {
  return (
    <BasePanelWrapper config={config}>
      <CueComposerContent />
    </BasePanelWrapper>
  );
}
