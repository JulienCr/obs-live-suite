"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  RefreshCw, 
  Package, 
  Download, 
  AlertCircle,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  Loader2
} from "lucide-react";

/**
 * Plugin data structure from database
 */
interface Plugin {
  id: string;
  name: string;
  kind: "plugin" | "script";
  localVersion: string | null;
  paths: string;
  registryId: string | null;
  latestVersion: string | null;
  releaseUrl: string | null;
  releaseNotes: string | null;
  updateStatus: "up_to_date" | "update_available" | "unknown" | "ignored";
  isIgnored: number;
  isWatched: number;
  lastChecked: string | null;
}

/**
 * PluginSettings component for managing OBS plugins
 */
export function PluginSettings() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [showBuiltIn, setShowBuiltIn] = useState(false);

  /**
   * Load plugins from database
   */
  const loadPlugins = async () => {
    try {
      const response = await fetch("/api/updater/plugins");
      if (!response.ok) throw new Error("Failed to load plugins");
      
      const data = await response.json();
      setPlugins(data.plugins || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plugins");
    }
  };

  /**
   * Scan for installed plugins
   */
  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      const response = await fetch("/api/updater/scan", { method: "POST" });
      if (!response.ok) throw new Error("Failed to scan plugins");
      
      const data = await response.json();
      setLastScan(new Date());
      
      // Reload the plugin list
      await loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan plugins");
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Check for plugin updates
   */
  const handleCheckUpdates = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const response = await fetch("/api/updater/check", { method: "POST" });
      if (!response.ok) throw new Error("Failed to check updates");
      
      // Reload the plugin list
      await loadPlugins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check updates");
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Get status badge for plugin
   */
  const getStatusBadge = (plugin: Plugin) => {
    switch (plugin.updateStatus) {
      case "update_available":
        return (
          <Badge variant="default" className="gap-1">
            <Download className="w-3 h-3" />
            Update Available
          </Badge>
        );
      case "up_to_date":
        return (
          <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
            <CheckCircle className="w-3 h-3" />
            Up to Date
          </Badge>
        );
      case "ignored":
        return (
          <Badge variant="outline" className="gap-1 text-gray-500">
            <AlertCircle className="w-3 h-3" />
            Ignored
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <HelpCircle className="w-3 h-3" />
            Unknown
          </Badge>
        );
    }
  };

  /**
   * Parse paths JSON
   */
  const getPaths = (pathsJson: string): string[] => {
    try {
      return JSON.parse(pathsJson);
    } catch {
      return [];
    }
  };

  // Filter plugins based on showBuiltIn toggle
  const filteredPlugins = showBuiltIn 
    ? plugins 
    : plugins.filter(p => !p.isIgnored);

  // Load plugins on mount
  useEffect(() => {
    loadPlugins();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">OBS Plugin Manager</h2>
        <p className="text-muted-foreground">
          Scan for installed OBS plugins and check for updates
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap items-center">
        <Button 
          onClick={handleScan} 
          disabled={isScanning || isChecking}
          className="gap-2"
        >
          {isScanning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning...
            </>
          ) : (
            <>
              <Package className="w-4 h-4" />
              Scan Plugins
            </>
          )}
        </Button>

        <Button 
          onClick={handleCheckUpdates} 
          disabled={isChecking || isScanning || plugins.length === 0}
          variant="outline"
          className="gap-2"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Check for Updates
            </>
          )}
        </Button>

        <Button 
          onClick={loadPlugins} 
          disabled={isChecking || isScanning}
          variant="ghost"
          size="icon"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <input
            type="checkbox"
            id="showBuiltIn"
            checked={showBuiltIn}
            onChange={(e) => setShowBuiltIn(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
          />
          <label htmlFor="showBuiltIn" className="text-sm cursor-pointer">
            Show built-in plugins
          </label>
        </div>
      </div>

      {/* Last scan info */}
      {lastScan && (
        <div className="text-sm text-muted-foreground">
          Last scan: {lastScan.toLocaleString()}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Plugin count */}
      <div className="text-sm font-medium">
        {filteredPlugins.length} plugin{filteredPlugins.length !== 1 ? "s" : ""} found
        {!showBuiltIn && plugins.length > filteredPlugins.length && (
          <span className="text-muted-foreground ml-2">
            ({plugins.length - filteredPlugins.length} built-in hidden)
          </span>
        )}
      </div>

      {/* Plugins list */}
      <ScrollArea className="h-[500px] border rounded-lg">
        {filteredPlugins.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
            <Package className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">No plugins found</p>
            <p className="text-sm">
              {plugins.length > 0 
                ? "All plugins are built-in. Enable 'Show built-in plugins' to see them."
                : "Click 'Scan Plugins' to discover installed plugins"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredPlugins.map((plugin) => {
              const paths = getPaths(plugin.paths);
              const hasUpdate = plugin.updateStatus === "update_available";

              return (
                <div 
                  key={plugin.id} 
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    hasUpdate ? "bg-blue-50/50 dark:bg-blue-950/10" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Plugin info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg truncate">
                          {plugin.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {plugin.kind}
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-muted-foreground">
                        {plugin.localVersion && (
                          <div>
                            <span className="font-medium">Local version:</span>{" "}
                            {plugin.localVersion}
                          </div>
                        )}
                        
                        {plugin.latestVersion && (
                          <div>
                            <span className="font-medium">Latest version:</span>{" "}
                            {plugin.latestVersion}
                          </div>
                        )}

                        {paths.length > 0 && (
                          <div>
                            <span className="font-medium">Path:</span>{" "}
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {paths[0]}
                            </code>
                          </div>
                        )}

                        {plugin.lastChecked && (
                          <div className="text-xs">
                            Last checked: {new Date(plugin.lastChecked).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status and actions */}
                    <div className="flex flex-col items-end gap-2">
                      {getStatusBadge(plugin)}
                      
                      {plugin.releaseUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => window.open(plugin.releaseUrl!, "_blank")}
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Release
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Release notes */}
                  {plugin.releaseNotes && hasUpdate && (
                    <div className="mt-3 p-3 bg-muted rounded text-sm">
                      <div className="font-medium mb-1">Release Notes:</div>
                      <div className="text-muted-foreground whitespace-pre-wrap">
                        {plugin.releaseNotes}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

