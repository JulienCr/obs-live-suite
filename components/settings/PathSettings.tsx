"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, X, FolderOpen, Info, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useSettings } from "@/lib/hooks/useSettings";
import { apiPost, isClientFetchError } from "@/lib/utils/ClientFetch";

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
  const t = useTranslations("settings.paths");
  const tCommon = useTranslations("common");

  const { data: dataPaths, loading } = useSettings<DataPaths, DataPaths | null>({
    endpoint: "/api/settings/paths",
    initialState: null,
    fromResponse: (data) => data,
  });

  const [customPaths, setCustomPaths] = useState<string[]>([]);
  const [newPath, setNewPath] = useState("");

  const defaultPaths = [
    "C:\\Program Files\\obs-studio\\obs-plugins",
    "%APPDATA%\\obs-studio\\plugins",
  ];

  const openFolder = async (path: string) => {
    try {
      await apiPost("/api/settings/open-folder", { path });
    } catch (error) {
      if (isClientFetchError(error)) {
        console.error("Failed to open folder:", error.errorMessage);
      } else {
        console.error("Failed to open folder:", error);
      }
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
        <h2 className="text-2xl font-semibold mb-2">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Data Directory Paths */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">{t("dataDirectory")}</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {t("dataDirectoryDescription")}
          </p>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">{tCommon("loading")}</div>
        ) : dataPaths ? (
          <div className="space-y-2">
            {Object.entries(dataPaths).map(([key, path]) => {
              const labelKeys: Record<string, string> = {
                dataDir: "labels.dataDir",
                databasePath: "labels.database",
                profilesDir: "labels.profiles",
                assetsDir: "labels.assets",
                postersDir: "labels.posters",
                avatarsDir: "labels.avatars",
                logsDir: "labels.logs",
                backupsDir: "labels.backups",
                quizDir: "labels.quiz",
              };

              return (
                <div
                  key={key}
                  className="flex items-center gap-2 p-3 border rounded hover:bg-accent/50 transition-colors"
                >
                  <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      {t(labelKeys[key])}
                    </div>
                    <div className="font-mono text-sm truncate" title={path}>
                      {path}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openFolder(path)}
                    className="shrink-0"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <Alert>
            <AlertDescription>{t("failedToLoad")}</AlertDescription>
          </Alert>
        )}
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-semibold mb-2">{t("obsPluginPaths")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("obsPluginPathsDescription")}
        </p>
      </div>

      {/* Default Paths */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Info className="w-4 h-4" />
          {t("defaultScanPaths")}
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
                {t("default")}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Paths */}
      <div className="space-y-2">
        <Label>{t("customScanPaths")}</Label>
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
              {t("noCustomPaths")}
            </div>
          )}
        </div>
      </div>

      {/* Add New Path */}
      <div className="space-y-2">
        <Label htmlFor="new-path">{t("addCustomPath")}</Label>
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
            {tCommon("add")}
          </Button>
        </div>
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={customPaths.length === 0}>
        {t("saveCustomPaths")}
      </Button>

      {/* Help */}
      <Alert>
        <AlertDescription className="text-sm">
          <strong>{t("aboutPluginScanning")}:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>{t("helpDefaultPaths")}</li>
            <li>{t("helpCustomPaths")}</li>
            <li>{t("helpPluginsScripts")}</li>
            <li>{t("helpEnvVariables")}</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
