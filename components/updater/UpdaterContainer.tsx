"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ExternalLink, Eye, EyeOff } from "lucide-react";

interface Plugin {
  id: string;
  name: string;
  kind: string;
  localVersion?: string;
  latestVersion?: string;
  updateStatus: string;
  releaseUrl?: string;
  isIgnored: boolean;
  isWatched: boolean;
}

/**
 * UpdaterContainer - Plugin updater interface
 */
export function UpdaterContainer() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadPlugins();
  }, []);

  const loadPlugins = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/updater/plugins");
      if (response.ok) {
        const data = await response.json();
        setPlugins(data.plugins || []);
      }
    } catch (error) {
      console.error("Failed to load plugins:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const response = await fetch("/api/updater/scan", { method: "POST" });
      if (response.ok) {
        await loadPlugins();
      }
    } catch (error) {
      console.error("Failed to scan plugins:", error);
    } finally {
      setScanning(false);
    }
  };

  const handleCheckUpdates = async () => {
    setLoading(true);
    try {
      await fetch("/api/updater/check", { method: "POST" });
      await loadPlugins();
    } catch (error) {
      console.error("Failed to check updates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIgnore = async (pluginId: string) => {
    try {
      await fetch(`/api/updater/plugins/${pluginId}/ignore`, { method: "POST" });
      await loadPlugins();
    } catch (error) {
      console.error("Failed to toggle ignore:", error);
    }
  };

  const handleToggleWatch = async (pluginId: string) => {
    try {
      await fetch(`/api/updater/plugins/${pluginId}/watch`, { method: "POST" });
      await loadPlugins();
    } catch (error) {
      console.error("Failed to toggle watch:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">OBS Extensions Updater</h1>
          <div className="flex gap-2">
            <Button onClick={handleScan} disabled={scanning}>
              <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
              Scan Plugins
            </Button>
            <Button variant="outline" onClick={handleCheckUpdates} disabled={loading}>
              Check Updates
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Installed Plugins & Scripts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : plugins.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No plugins found. Click "Scan Plugins" to search.
              </div>
            ) : (
              <div className="space-y-3">
                {plugins.map((plugin) => (
                  <div
                    key={plugin.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{plugin.name}</h3>
                        <Badge variant="outline">{plugin.kind}</Badge>
                        {plugin.updateStatus === "update_available" && (
                          <Badge variant="default">Update Available</Badge>
                        )}
                        {plugin.isWatched && (
                          <Badge variant="secondary">Watched</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Local: {plugin.localVersion || "Unknown"} 
                        {plugin.latestVersion && ` | Latest: ${plugin.latestVersion}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {plugin.releaseUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(plugin.releaseUrl, "_blank")}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Visit Release
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleWatch(plugin.id)}
                      >
                        {plugin.isWatched ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleIgnore(plugin.id)}
                      >
                        {plugin.isIgnored ? "Unignore" : "Ignore"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

