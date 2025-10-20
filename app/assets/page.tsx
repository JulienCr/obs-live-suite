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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Assets Library</h1>
          <p className="text-muted-foreground mt-2">
            Manage posters, guests, and themes for your live shows
          </p>
        </div>

        <Tabs defaultValue="posters" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posters" className="flex items-center gap-2">
              <Image className="w-4 h-4" />
              Posters
            </TabsTrigger>
            <TabsTrigger value="guests" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Guests
            </TabsTrigger>
            <TabsTrigger value="themes" className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Themes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posters">
            <Card className="p-6">
              <PosterManager />
            </Card>
          </TabsContent>

          <TabsContent value="guests">
            <Card className="p-6">
              <GuestManager />
            </Card>
          </TabsContent>

          <TabsContent value="themes">
            <Card className="p-6">
              <ThemeManager />
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

