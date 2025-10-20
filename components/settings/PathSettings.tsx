"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, X, FolderOpen, Info } from "lucide-react";

/**
 * OBS plugin scan paths configuration
 */
export function PathSettings() {
  const [customPaths, setCustomPaths] = useState<string[]>([]);
  const [newPath, setNewPath] = useState("");

  const defaultPaths = [
    "C:\\Program Files\\obs-studio\\obs-plugins",
    "%APPDATA%\\obs-studio\\plugins",
  ];

  const addPath = () => {
    if (newPath && !customPaths.includes(newPath)) {
      setCustomPaths([...customPaths, newPath]);
      setNewPath("");
    }
  };

  const removePath = (path: string) => {
    setCustomPaths(customPaths.filter((p) => p !== path));
  };

  const handleSave = () => {
    // In a real app, this would save to backend/database
    alert(
      "Custom paths would be saved here.\n\n" +
        "Paths:\n" +
        customPaths.join("\n")
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">OBS Plugin Scan Paths</h2>
        <p className="text-sm text-muted-foreground">
          Configure where to scan for OBS plugins and scripts
        </p>
      </div>

      {/* Default Paths */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Info className="w-4 h-4" />
          Default Scan Paths
        </Label>
        <div className="space-y-2">
          {defaultPaths.map((path, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
            >
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 font-mono">{path}</span>
              <Badge variant="outline" className="text-xs">
                Default
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Paths */}
      <div className="space-y-2">
        <Label>Custom Scan Paths</Label>
        <div className="space-y-2">
          {customPaths.map((path, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 p-2 border rounded"
            >
              <FolderOpen className="w-4 h-4 text-muted-foreground" />
              <span className="flex-1 font-mono text-sm">{path}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removePath(path)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {customPaths.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              No custom paths added
            </div>
          )}
        </div>
      </div>

      {/* Add New Path */}
      <div className="space-y-2">
        <Label htmlFor="new-path">Add Custom Path</Label>
        <div className="flex gap-2">
          <Input
            id="new-path"
            type="text"
            placeholder="C:\Custom\OBS\Plugins"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPath()}
          />
          <Button onClick={addPath} disabled={!newPath}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={customPaths.length === 0}>
        Save Custom Paths
      </Button>

      {/* Help */}
      <Alert>
        <AlertDescription className="text-sm">
          <strong>About Plugin Scanning:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Default paths are always scanned</li>
            <li>Add custom paths for plugins in non-standard locations</li>
            <li>Supports both plugins and LUA scripts</li>
            <li>Environment variables like %APPDATA% are supported</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}

