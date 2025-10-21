"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { PosterManager } from "@/components/assets/PosterManager";
import { GuestManager } from "@/components/assets/GuestManager";
import { ThemeManager } from "@/components/assets/ThemeManager";
import { Image, Users, Palette } from "lucide-react";

/**
 * Assets library page with tabbed interface
 */
export default function AssetsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">Assets Library</h1>
          <p className="text-muted-foreground text-xs mt-1">
            Manage posters, guests, and themes for your live shows
          </p>
        </div>

        <Tabs defaultValue="posters" className="space-y-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posters" className="flex items-center gap-1.5 text-xs">
              <Image className="w-3.5 h-3.5" />
              Posters
            </TabsTrigger>
            <TabsTrigger value="guests" className="flex items-center gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5" />
              Guests
            </TabsTrigger>
            <TabsTrigger value="themes" className="flex items-center gap-1.5 text-xs">
              <Palette className="w-3.5 h-3.5" />
              Themes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posters">
            <Card className="p-4">
              <PosterManager />
            </Card>
          </TabsContent>

          <TabsContent value="guests">
            <Card className="p-4">
              <GuestManager />
            </Card>
          </TabsContent>

          <TabsContent value="themes">
            <Card className="p-4">
              <ThemeManager />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

