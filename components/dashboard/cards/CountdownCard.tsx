"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Pause, RotateCcw, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface CountdownCardProps {
  size?: string;
  className?: string;
  settings?: Record<string, unknown>;
}

/**
 * CountdownCard - Control card for countdown timer
 */
export function CountdownCard({ size, className, settings }: CountdownCardProps = {}) {
  const t = useTranslations("dashboard.countdown");
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Customization options
  const [style, setStyle] = useState<"bold" | "corner" | "banner">("bold");
  const [format, setFormat] = useState<"mm:ss" | "hh:mm:ss" | "seconds">("mm:ss");
  const [position, setPosition] = useState({ x: 960, y: 540 });
  const [scale, setScale] = useState(1);
  const [color, setColor] = useState("#3b82f6");
  const [fontFamily, setFontFamily] = useState("Courier New, monospace");
  const [fontSize, setFontSize] = useState(80);
  const [fontWeight, setFontWeight] = useState(900);
  const [shadow, setShadow] = useState(true);

  // Throttling for updates
  const updateTimeoutRef = useRef<NodeJS.Timeout>();

  // Position presets for 1920x1080 resolution (arranged logically: top row, middle row, bottom row)
  const positionPresets = [
    { nameKey: "topLeft" as const, x: 200, y: 150 },
    { nameKey: "topCenter" as const, x: 960, y: 150 },
    { nameKey: "topRight" as const, x: 1720, y: 150 },
    { nameKey: "middleLeft" as const, x: 200, y: 540 },
    { nameKey: "center" as const, x: 960, y: 540 },
    { nameKey: "middleRight" as const, x: 1720, y: 540 },
    { nameKey: "bottomLeft" as const, x: 200, y: 930 },
    { nameKey: "bottomCenter" as const, x: 960, y: 930 },
    { nameKey: "bottomRight" as const, x: 1720, y: 930 },
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

  const handlePositionPreset = (preset: { nameKey: string; x: number; y: number }) => {
    setPosition({ x: preset.x, y: preset.y });
  };

  // Watch for changes in settings and update countdown in real-time (throttled)
  useEffect(() => {
    if (isRunning) {
      // Clear previous timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Throttle updates to prevent too many rapid calls
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
      }, 100); // 100ms throttle
    }

    // Cleanup timeout on unmount
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style, format, position, scale, color, fontFamily, fontSize, fontWeight, shadow]);

  const sendCountdownUpdate = async (updatePayload: Record<string, unknown>) => {
    try {
      console.log("[Frontend] Sending countdown update:", updatePayload);
      const response = await fetch("/api/overlays/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", payload: updatePayload }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // If backend doesn't support "update" action yet, silently ignore
        if (response.status === 400 && errorData.error === "Invalid action") {
          console.warn("[Frontend] Backend doesn't support 'update' action yet. Please restart the backend server to enable real-time updates.");
          return;
        }
        
        console.error("[Frontend] Update failed:", response.status, errorData);
        throw new Error(`Failed to update countdown: ${response.status} ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      console.log("[Frontend] Update successful:", result);
    } catch (error) {
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
      
      const response = await fetch("/api/actions/countdown/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to start countdown");
      }

      setIsRunning(true);
    } catch (error) {
      console.error("Error starting countdown:", error);
    }
  };

  const handlePause = async () => {
    try {
      const response = await fetch("/api/overlays/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      });

      if (!response.ok) {
        throw new Error("Failed to pause countdown");
      }

      setIsRunning(false);
    } catch (error) {
      console.error("Error pausing countdown:", error);
    }
  };

  const handleReset = async () => {
    try {
      const response = await fetch("/api/overlays/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });

      if (!response.ok) {
        throw new Error("Failed to reset countdown");
      }

      setIsRunning(false);
      setMinutes(5);
      setSeconds(0);
    } catch (error) {
      console.error("Error resetting countdown:", error);
    }
  };

  const handleAddTime = async (secondsToAdd: number) => {
    try {
      const response = await fetch("/api/overlays/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "add-time", 
          payload: { seconds: secondsToAdd } 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add time");
      }
    } catch (error) {
      console.error("Error adding time:", error);
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {t("title")}
          <div
            className={`w-3 h-3 rounded-full ${
              isRunning ? "bg-green-500 animate-pulse" : "bg-gray-300"
            }`}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <Label htmlFor="minutes">{t("minutes")}</Label>
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
            <Label htmlFor="seconds">{t("seconds")}</Label>
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
              {t("start")}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePause}
              className="flex-1"
            >
              <Pause className="w-4 h-4 mr-2" />
              {t("pause")}
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
            onClick={() => handleAddTime(60)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("add1Min")}
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full"
        >
          <Settings className="w-4 h-4 mr-2" />
          {t("advancedSettings")}
        </Button>

        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("style")}</Label>
                <Select value={style} onValueChange={(value: "bold" | "corner" | "banner") => setStyle(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bold">{t("styles.bold")}</SelectItem>
                    <SelectItem value="corner">{t("styles.corner")}</SelectItem>
                    <SelectItem value="banner">{t("styles.banner")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("format")}</Label>
                <Select value={format} onValueChange={(value: "mm:ss" | "hh:mm:ss" | "seconds") => setFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mm:ss">{t("formats.mmss")}</SelectItem>
                    <SelectItem value="hh:mm:ss">{t("formats.hhmmss")}</SelectItem>
                    <SelectItem value="seconds">{t("formats.seconds")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("presets")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {positionPresets.map((preset) => (
                  <Button
                    key={preset.nameKey}
                    variant={position.x === preset.x && position.y === preset.y ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePositionPreset(preset)}
                    className="text-xs"
                  >
                    {t(`positionPresets.${preset.nameKey}`)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("positionX")}</Label>
                <Input
                  type="number"
                  value={position.x}
                  onChange={(e) => setPosition(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("positionY")}</Label>
                <Input
                  type="number"
                  value={position.y}
                  onChange={(e) => setPosition(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("scale")}: {scale}x</Label>
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
                <Label>{t("color")}</Label>
                <Input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("fontSize")}</Label>
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
              <Label>{t("font")}</Label>
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
                <Label>{t("fontWeight")}</Label>
                <Select value={fontWeight.toString()} onValueChange={(value) => setFontWeight(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300">{t("weights.light")}</SelectItem>
                    <SelectItem value="400">{t("weights.normal")}</SelectItem>
                    <SelectItem value="600">{t("weights.semiBold")}</SelectItem>
                    <SelectItem value="700">{t("weights.bold")}</SelectItem>
                    <SelectItem value="900">{t("weights.black")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="shadow"
                  checked={shadow}
                  onCheckedChange={setShadow}
                />
                <Label htmlFor="shadow">{t("shadow")}</Label>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

