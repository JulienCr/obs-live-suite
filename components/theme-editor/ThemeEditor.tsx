"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { X, Eye } from "lucide-react";
import { OverlayCanvas } from "@/components/assets/OverlayCanvas";
import { ColorsTab } from "./tabs/ColorsTab";
import { LowerThirdTab } from "./tabs/LowerThirdTab";
import { CountdownTab } from "./tabs/CountdownTab";
import { PositioningTab } from "./tabs/PositioningTab";
import { useThemeEditor } from "./ThemeEditorContext";

interface ThemeEditorProps {
  isCreating: boolean;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * Main theme editor with tabs and canvas
 */
export function ThemeEditor({ isCreating, onSave, onCancel }: ThemeEditorProps) {
  const {
    formData,
    updateName,
    updateLowerThirdLayout,
    updateCountdownLayout,
    updatePosterLayout,
    enableOBSPreview,
  } = useThemeEditor();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">
            {isCreating ? "Create Theme" : "Edit Theme"}
          </h2>
          {enableOBSPreview && (
            <Badge variant="secondary" className="text-xs">
              <Eye className="w-3 h-3 mr-1" />
              Live Preview
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={onSave}>Save Theme</Button>
        </div>
      </div>

      {/* Theme Name */}
      <Card className="p-4">
        <div className="space-y-2">
          <Label htmlFor="theme-name">Theme Name</Label>
          <Input
            id="theme-name"
            value={formData.name || ""}
            onChange={(e) => updateName(e.target.value)}
            placeholder="Enter theme name..."
          />
        </div>
      </Card>

      {/* Live Preview Canvas */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="text-sm font-semibold">Live Preview Canvas</div>
          <OverlayCanvas
            lowerThirdColors={formData.colors || { primary: "#3B82F6", accent: "#60A5FA", surface: "#1E293B", text: "#F8FAFC", success: "#10B981", warn: "#F59E0B" }}
            lowerThirdFont={formData.lowerThirdFont || { family: "Inter, sans-serif", size: 28, weight: 700 }}
            lowerThirdLayout={formData.lowerThirdLayout || { x: 60, y: 920, scale: 1 }}
            lowerThirdAnimation={formData.lowerThirdAnimation}
            onLowerThirdLayoutChange={updateLowerThirdLayout}
            countdownColors={formData.colors || { primary: "#3B82F6", accent: "#60A5FA", surface: "#1E293B", text: "#F8FAFC", success: "#10B981", warn: "#F59E0B" }}
            countdownFont={formData.countdownFont || { family: "Courier New, monospace", size: 80, weight: 900 }}
            countdownStyle={formData.countdownStyle || "bold"}
            countdownLayout={formData.countdownLayout || { x: 960, y: 540, scale: 1 }}
            onCountdownLayoutChange={updateCountdownLayout}
          />
        </div>
      </Card>

      {/* Tabbed Settings */}
      <Tabs defaultValue="colors" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="lower-third">Lower Third</TabsTrigger>
          <TabsTrigger value="countdown">Countdown</TabsTrigger>
          <TabsTrigger value="positioning">Positioning</TabsTrigger>
        </TabsList>

        <Card className="p-6">
          <TabsContent value="colors" className="mt-0">
            <ColorsTab />
          </TabsContent>

          <TabsContent value="lower-third" className="mt-0">
            <LowerThirdTab />
          </TabsContent>

          <TabsContent value="countdown" className="mt-0">
            <CountdownTab />
          </TabsContent>

          <TabsContent value="positioning" className="mt-0">
            <PositioningTab />
          </TabsContent>
        </Card>
      </Tabs>
    </div>
  );
}
