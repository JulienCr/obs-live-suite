import { type IDockviewPanelProps } from "dockview-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Pause, RotateCcw, Plus, Settings } from "lucide-react";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { apiPost } from "@/lib/utils/ClientFetch";
import { useOverlayHideSync } from "@/hooks/useSyncWithOverlayState";

const config: PanelConfig = { id: "countdown", context: "dashboard" };

/**
 * Countdown panel for Dockview - displays countdown controls without Card wrapper
 */
export function CountdownPanel(_props: IDockviewPanelProps) {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [style, setStyle] = useState<"bold" | "corner" | "banner">("bold");
  const [format, setFormat] = useState<"mm:ss" | "hh:mm:ss" | "seconds">("mm:ss");
  const [position, setPosition] = useState({ x: 960, y: 540 });
  const [scale, setScale] = useState(1);
  const [color, setColor] = useState("#3b82f6");
  const [fontFamily, setFontFamily] = useState("Courier New, monospace");
  const [fontSize, setFontSize] = useState(80);
  const [fontWeight, setFontWeight] = useState(900);
  const [shadow, setShadow] = useState(true);

  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state with shared overlay state (handles external stop/reset)
  useOverlayHideSync("countdown", isRunning, () => setIsRunning(false));

  const positionPresets = [
    { name: "Top Left", x: 200, y: 150 },
    { name: "Top Center", x: 960, y: 150 },
    { name: "Top Right", x: 1720, y: 150 },
    { name: "Middle Left", x: 200, y: 540 },
    { name: "Center", x: 960, y: 540 },
    { name: "Middle Right", x: 1720, y: 540 },
    { name: "Bottom Left", x: 200, y: 930 },
    { name: "Bottom Center", x: 960, y: 930 },
    { name: "Bottom Right", x: 1720, y: 930 },
  ];

  const presets = [
    { label: "10:00", value: 600 },
    { label: "5:00", value: 300 },
    { label: "2:00", value: 120 },
    { label: "1:00", value: 60 },
  ];

  const handlePreset = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    setMinutes(mins);
    setSeconds(secs);
  };

  useEffect(() => {
    if (isRunning) {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      updateTimeoutRef.current = setTimeout(() => {
        const updatePayload = {
          style,
          format,
          position,
          size: { scale },
          theme: {
            color,
            font: {
              family: fontFamily,
              size: fontSize,
              weight: fontWeight,
            },
            shadow,
          },
        };
        sendCountdownUpdate(updatePayload);
      }, 100);
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, format, position, scale, color, fontFamily, fontSize, fontWeight, shadow]);

  const sendCountdownUpdate = async (updatePayload: Record<string, unknown>) => {
    try {
      await apiPost("/api/overlays/countdown", { action: "update", payload: updatePayload });
    } catch (error) {
      // Silently ignore "Invalid action" errors (400 status)
      console.error("Error updating countdown:", error);
    }
  };

  const handleStart = async () => {
    try {
      const totalSeconds = minutes * 60 + seconds;
      
      const payload = {
        seconds: totalSeconds,
        style,
        format,
        position,
        size: { scale },
        theme: {
          color,
          font: {
            family: fontFamily,
            size: fontSize,
            weight: fontWeight,
          },
          shadow,
        },
      };
      
      await apiPost("/api/actions/countdown/start", payload);
      setIsRunning(true);
    } catch (error) {
      console.error("Error starting countdown:", error);
    }
  };

  const handlePause = async () => {
    try {
      await apiPost("/api/overlays/countdown", { action: "pause" });
      setIsRunning(false);
    } catch (error) {
      console.error("Error pausing countdown:", error);
    }
  };

  const handleReset = async () => {
    try {
      await apiPost("/api/overlays/countdown", { action: "reset" });
      setIsRunning(false);
      setMinutes(5);
      setSeconds(0);
    } catch (error) {
      console.error("Error resetting countdown:", error);
    }
  };

  const handleAddTime = async (secondsToAdd: number) => {
    try {
      await apiPost("/api/overlays/countdown", {
        action: "add-time",
        payload: { seconds: secondsToAdd },
      });
    } catch (error) {
      console.error("Error adding time:", error);
    }
  };

  return (
    <BasePanelWrapper config={config}>
      <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.value}
              variant="outline"
              size="sm"
              onClick={() => handlePreset(preset.value)}
              disabled={isRunning}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minutes">Minutes</Label>
            <Input
              id="minutes"
              type="number"
              min="0"
              value={minutes}
              onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
              disabled={isRunning}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seconds">Seconds</Label>
            <Input
              id="seconds"
              type="number"
              min="0"
              max="59"
              value={seconds}
              onChange={(e) => setSeconds(parseInt(e.target.value) || 0)}
              disabled={isRunning}
            />
          </div>
        </div>

        <div className="flex gap-2">
          {!isRunning ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleStart}
              disabled={minutes === 0 && seconds === 0}
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePause}
              className="flex-1"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {isRunning && (
          <Button
            variant="default"
            size="sm"
            onClick={() => handleAddTime(30)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Ajouter 30 secondes
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full"
        >
          <Settings className="w-4 h-4 mr-2" />
          {showAdvanced ? "Hide" : "Show"} Advanced Options
        </Button>

        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={(value: "bold" | "corner" | "banner") => setStyle(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bold">Bold</SelectItem>
                    <SelectItem value="corner">Corner</SelectItem>
                    <SelectItem value="banner">Banner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={(value: "mm:ss" | "hh:mm:ss" | "seconds") => setFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm:ss">MM:SS</SelectItem>
                    <SelectItem value="hh:mm:ss">HH:MM:SS</SelectItem>
                    <SelectItem value="seconds">Seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Position Presets</Label>
              <div className="grid grid-cols-3 gap-2">
                {positionPresets.map((preset) => (
                  <Button
                    key={preset.name}
                    variant={position.x === preset.x && position.y === preset.y ? "default" : "outline-solid"}
                    size="sm"
                    onClick={() => setPosition({ x: preset.x, y: preset.y })}
                    className="text-xs"
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Position X</Label>
                <Input
                  type="number"
                  value={position.x}
                  onChange={(e) => setPosition(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Position Y</Label>
                <Input
                  type="number"
                  value={position.y}
                  onChange={(e) => setPosition(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Scale: {scale}x</Label>
              <Input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Font Size</Label>
                <Input
                  type="number"
                  min="12"
                  max="200"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value) || 80)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Font Family</Label>
              <Select value={fontFamily} onValueChange={setFontFamily}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Courier New, monospace">Courier New</SelectItem>
                  <SelectItem value="Arial, sans-serif">Arial</SelectItem>
                  <SelectItem value="Times New Roman, serif">Times New Roman</SelectItem>
                  <SelectItem value="Georgia, serif">Georgia</SelectItem>
                  <SelectItem value="Verdana, sans-serif">Verdana</SelectItem>
                  <SelectItem value="Impact, sans-serif">Impact</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Font Weight</Label>
                <Select value={fontWeight.toString()} onValueChange={(value) => setFontWeight(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300">Light (300)</SelectItem>
                    <SelectItem value="400">Normal (400)</SelectItem>
                    <SelectItem value="600">Semi-Bold (600)</SelectItem>
                    <SelectItem value="700">Bold (700)</SelectItem>
                    <SelectItem value="900">Black (900)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="shadow"
                  checked={shadow}
                  onCheckedChange={(checked) => setShadow(checked === true)}
                />
                <Label htmlFor="shadow">Text Shadow</Label>
              </div>
            </div>
          </div>
        )}
      </div>
    </BasePanelWrapper>
  );
}
