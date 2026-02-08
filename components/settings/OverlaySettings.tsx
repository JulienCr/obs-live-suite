"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { CheckCircle2, Loader2, Timer, MessageSquare } from "lucide-react";
import { useSettings } from "@/lib/hooks/useSettings";

interface OverlaySettingsData {
  lowerThirdDuration: number;
  chatHighlightDuration: number;
  chatHighlightAutoHide: boolean;
}

interface OverlaySettingsResponse {
  settings?: OverlaySettingsData;
}

const INITIAL_STATE: OverlaySettingsData = {
  lowerThirdDuration: 8,
  chatHighlightDuration: 10,
  chatHighlightAutoHide: true,
};

/**
 * Overlay settings for configuring auto-hide timeouts
 */
export function OverlaySettings() {
  const { data: settings, setData: setSettings, loading, saving, saveResult, save } = useSettings<
    OverlaySettingsResponse,
    OverlaySettingsData
  >({
    endpoint: "/api/settings/overlay",
    initialState: INITIAL_STATE,
    fromResponse: (res) => res.settings ?? INITIAL_STATE,
    successMessage: "Settings saved successfully!",
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Overlay Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure auto-hide timeouts for overlays
        </p>
      </div>

      {/* Lower Third Duration */}
      <div className="space-y-4 p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4" />
          <Label className="text-base font-medium">Lower Third</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Duration before the lower third overlay automatically hides.
        </p>
        <div className="flex items-center gap-4">
          <Slider
            value={[settings.lowerThirdDuration]}
            onValueChange={(value) =>
              setSettings((prev) => ({ ...prev, lowerThirdDuration: value[0] }))
            }
            min={1}
            max={60}
            step={1}
            className="flex-1"
          />
          <span className="w-16 text-right font-mono">{settings.lowerThirdDuration}s</span>
        </div>
      </div>

      {/* Chat Highlight Duration */}
      <div className="space-y-4 p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          <Label className="text-base font-medium">Chat Highlight (Twitch)</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Settings for the chat highlight overlay that displays Twitch messages.
        </p>

        {/* Auto-hide toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-hide">Auto-hide</Label>
            <p className="text-xs text-muted-foreground">
              Automatically hide chat messages after the specified duration
            </p>
          </div>
          <Switch
            id="auto-hide"
            checked={settings.chatHighlightAutoHide}
            onCheckedChange={(checked) =>
              setSettings((prev) => ({ ...prev, chatHighlightAutoHide: checked }))
            }
          />
        </div>

        {/* Duration slider - disabled when auto-hide is off */}
        <div className={`flex items-center gap-4 ${!settings.chatHighlightAutoHide ? "opacity-50" : ""}`}>
          <Slider
            value={[settings.chatHighlightDuration]}
            onValueChange={(value) =>
              setSettings((prev) => ({ ...prev, chatHighlightDuration: value[0] }))
            }
            min={1}
            max={60}
            step={1}
            className="flex-1"
            disabled={!settings.chatHighlightAutoHide}
          />
          <span className="w-16 text-right font-mono">
            {settings.chatHighlightAutoHide ? `${settings.chatHighlightDuration}s` : "--"}
          </span>
        </div>

        {!settings.chatHighlightAutoHide && (
          <Alert>
            <AlertDescription className="text-sm">
              Auto-hide is disabled. Chat messages will stay visible until manually hidden.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Save Result */}
      {saveResult && (
        <Alert variant={saveResult.success ? "default" : "destructive"}>
          <AlertDescription className="flex items-center gap-2">
            {saveResult.success && <CheckCircle2 className="w-4 h-4" />}
            {saveResult.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Save Button */}
      <Button onClick={save} disabled={saving}>
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Settings"
        )}
      </Button>
    </div>
  );
}
