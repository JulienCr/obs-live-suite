"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { OBSSettings } from "@/components/settings/OBSSettings";
import { BackendSettings } from "@/components/settings/BackendSettings";
import { PathSettings } from "@/components/settings/PathSettings";
import { BackupSettings } from "@/components/settings/BackupSettings";
import { PluginSettings } from "@/components/settings/PluginSettings";
import { Settings, Server, FolderOpen, Download, Package, SlidersHorizontal } from "lucide-react";

/**
 * Settings page with tabbed interface
 */
export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Configure OBS Live Suite connections and preferences
          </p>
        </div>

        <Tabs defaultValue="general" className="space-y-3">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general" className="flex items-center gap-1.5 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              General
            </TabsTrigger>
            <TabsTrigger value="obs" className="flex items-center gap-1.5 text-xs">
              <Server className="w-3.5 h-3.5" />
              OBS
            </TabsTrigger>
            <TabsTrigger value="backend" className="flex items-center gap-1.5 text-xs">
              <Server className="w-3.5 h-3.5" />
              Backend
            </TabsTrigger>
            <TabsTrigger value="paths" className="flex items-center gap-1.5 text-xs">
              <FolderOpen className="w-3.5 h-3.5" />
              Paths
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" />
              Backup
            </TabsTrigger>
            <TabsTrigger value="plugins" className="flex items-center gap-1.5 text-xs">
              <Package className="w-3.5 h-3.5" />
              Plugins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="p-4">
              <GeneralSettings />
            </Card>
          </TabsContent>

          <TabsContent value="obs">
            <Card className="p-4">
              <OBSSettings />
            </Card>
          </TabsContent>

          <TabsContent value="backend">
            <Card className="p-4">
              <BackendSettings />
            </Card>
          </TabsContent>

          <TabsContent value="paths">
            <Card className="p-4">
              <PathSettings />
            </Card>
          </TabsContent>

          <TabsContent value="backup">
            <Card className="p-4">
              <BackupSettings />
            </Card>
          </TabsContent>

          <TabsContent value="plugins">
            <Card className="p-4">
              <PluginSettings />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

