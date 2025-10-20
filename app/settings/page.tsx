"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { OBSSettings } from "@/components/settings/OBSSettings";
import { BackendSettings } from "@/components/settings/BackendSettings";
import { PathSettings } from "@/components/settings/PathSettings";
import { BackupSettings } from "@/components/settings/BackupSettings";
import { PluginSettings } from "@/components/settings/PluginSettings";
import { Settings, Server, FolderOpen, Download, Package } from "lucide-react";

/**
 * Settings page with tabbed interface
 */
export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure OBS Live Suite connections and preferences
          </p>
        </div>

        <Tabs defaultValue="obs" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="obs" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              OBS
            </TabsTrigger>
            <TabsTrigger value="backend" className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              Backend
            </TabsTrigger>
            <TabsTrigger value="paths" className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Paths
            </TabsTrigger>
            <TabsTrigger value="backup" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Backup
            </TabsTrigger>
            <TabsTrigger value="plugins" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Plugins
            </TabsTrigger>
          </TabsList>

          <TabsContent value="obs">
            <Card className="p-6">
              <OBSSettings />
            </Card>
          </TabsContent>

          <TabsContent value="backend">
            <Card className="p-6">
              <BackendSettings />
            </Card>
          </TabsContent>

          <TabsContent value="paths">
            <Card className="p-6">
              <PathSettings />
            </Card>
          </TabsContent>

          <TabsContent value="backup">
            <Card className="p-6">
              <BackupSettings />
            </Card>
          </TabsContent>

          <TabsContent value="plugins">
            <Card className="p-6">
              <PluginSettings />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

