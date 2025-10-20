"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, RotateCcw, Plus } from "lucide-react";

/**
 * CountdownCard - Control card for countdown timer
 */
export function CountdownCard() {
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

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

  const handleStart = async () => {
    try {
      const totalSeconds = minutes * 60 + seconds;
      
      const response = await fetch("/api/actions/countdown/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: totalSeconds }),
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Countdown
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
      </CardContent>
    </Card>
  );
}

