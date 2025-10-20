"use client";

import { Card } from "@/components/ui/card";
import { ProfileManager } from "@/components/profiles/ProfileManager";
import { Folder } from "lucide-react";

/**
 * Profiles page for managing show profiles
 */
export default function ProfilesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Folder className="w-8 h-8" />
            Profiles
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage show profiles with different themes, assets, and settings
          </p>
        </div>

        <Card className="p-6">
          <ProfileManager />
        </Card>
      </div>
    </div>
  );
}

