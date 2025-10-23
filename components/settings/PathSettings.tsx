"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, X, FolderOpen, Info, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface DataPaths {
  dataDir: string;
  databasePath: string;
  profilesDir: string;
  assetsDir: string;
  postersDir: string;
  avatarsDir: string;
  logsDir: string;
  backupsDir: string;
  quizDir: string;
}

/**
 * OBS plugin scan paths and data directory configuration
 */
export function PathSettings() {
  const [customPaths, setCustomPaths] = useState<string[]>([]);
  const [newPath, setNewPath] = useState("");
  const [dataPaths, setDataPaths] = useState<DataPaths | null>(null);
  const [loading, setLoading] = useState(true);

  const defaultPaths = [
    "C:\\Program Files\\obs-studio\\obs-plugins",
    "%APPDATA%\\obs-studio\\plugins",
  ];

  useEffect(() => {
    fetchDataPaths();
  }, []);

  const fetchDataPaths = async () => {
    try {
      const response = await fetch("/api/settings/paths");
      if (response.ok) {
        const paths = await response.json();
        setDataPaths(paths);
      }
    } catch (error) {
      console.error("Failed to fetch data paths:", error);
    } finally {
      setLoading(false);
    }
  };

  const openFolder = async (path: string) => {
    try {
      const response = await fetch("/api/settings/open-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      
      if (!response.ok) {
        console.error("Failed to open folder");
      }
    } catch (error) {
      console.error("Failed to open folder:", error);
    }
  };

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
        <h2 className="text-2xl font-semibold mb-2">Paths Configuration</h2>
        <p className="text-sm text-muted-foreground">
          View data directories and configure OBS plugin scan paths
        </p>
      </div>

      {/* Data Directory Paths */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Data Directory</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Current storage locations for application data
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading paths...</div>
        ) : dataPaths ? (
          <div className="space-y-2">
            {Object.entries(dataPaths).map(([key, path]) => {
              const labels: Record<string, string> = {
                dataDir: "Data Directory",
                databasePath: "Database (SQLite)",
                profilesDir: "Profiles",
                assetsDir: "Assets",
                postersDir: "Posters",
                avatarsDir: "Avatars",
                logsDir: "Logs",
                backupsDir: "Backups",
                quizDir: "Quiz Sessions",
              };

              return (
                <div
                  key={key}
                  className="flex items-center gap-2 p-3 border rounded hover:bg-accent/50 transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {labels[key]}
                    </div>
                    <div className="font-mono text-sm truncate" title={path}>
                      {path}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openFolder(path)}
                    className="flex-shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <Alert>
            <AlertDescription>Failed to load data paths</AlertDescription>
          </Alert>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-2">OBS Plugin Scan Paths</h3>
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

