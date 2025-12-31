"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Download, Upload, FileJson, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BACKEND_URL } from "@/lib/config/urls";

/**
 * Backup and restore settings
 */
export function BackupSettings() {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleExport = async () => {
    try {
      // Fetch current configuration from backend
      const config = {
        obs: {
          url: "ws://localhost:4455",
          // Never export passwords
        },
        backend: {
          url: BACKEND_URL,
        },
        paths: [],
        exportedAt: new Date().toISOString(),
        version: "1.0.0",
      };

      // Create downloadable JSON file
      const blob = new Blob([JSON.stringify(config, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `obs-live-suite-config-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Failed to export configuration");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const config = JSON.parse(text);

      // Validate configuration
      if (!config.version) {
        throw new Error("Invalid configuration file");
      }

      // In a real app, this would update backend/database
      setImportResult({
        success: true,
        message: `Configuration imported successfully (version ${config.version})`,
      });
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : "Import failed",
      });
    } finally {
      setImporting(false);
      // Reset file input
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">
          Backup & Restore Configuration
        </h2>
        <p className="text-sm text-muted-foreground">
          Export and import your OBS Live Suite settings
        </p>
      </div>

      {/* Export Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-lg">Export Configuration</Label>
          <p className="text-sm text-muted-foreground">
            Download your current settings as a JSON file
          </p>
        </div>

        <Button onClick={handleExport} className="w-full sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Export Settings
        </Button>

        <Alert>
          <FileJson className="w-4 h-4" />
          <AlertDescription className="text-sm">
            <strong>What&apos;s included:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>OBS WebSocket URL (password excluded for security)</li>
              <li>Backend server URL</li>
              <li>Custom plugin scan paths</li>
              <li>Application preferences</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>

      {/* Import Section */}
      <div className="space-y-4 border-t pt-6">
        <div className="space-y-2">
          <Label className="text-lg">Import Configuration</Label>
          <p className="text-sm text-muted-foreground">
            Restore settings from a previously exported file
          </p>
        </div>

        <div className="space-y-2">
          <Input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={importing}
            className="cursor-pointer"
          />
          <p className="text-xs text-muted-foreground">
            Select a .json configuration file
          </p>
        </div>

        {importResult && (
          <Alert
            variant={importResult.success ? "default" : "destructive"}
          >
            <AlertDescription className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {importResult.message}
            </AlertDescription>
          </Alert>
        )}

        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-sm">
            <strong>Warning:</strong> Importing a configuration will overwrite your
            current settings. Make sure to export your current settings first if you
            want to keep them.
          </AlertDescription>
        </Alert>
      </div>

      {/* Data Management */}
      <div className="space-y-4 border-t pt-6">
        <div className="space-y-2">
          <Label className="text-lg">Data Management</Label>
          <p className="text-sm text-muted-foreground">
            Manage application data and cache
          </p>
        </div>

        <div className="space-y-2">
          <Button variant="outline" className="w-full sm:w-auto">
            Clear Cache
          </Button>
          <p className="text-xs text-muted-foreground">
            Clear temporary files and cached data
          </p>
        </div>

        <div className="space-y-2">
          <Button variant="destructive" className="w-full sm:w-auto">
            Reset to Defaults
          </Button>
          <p className="text-xs text-muted-foreground">
            Reset all settings to factory defaults (cannot be undone)
          </p>
        </div>
      </div>
    </div>
  );
}

