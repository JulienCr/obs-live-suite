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
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Profiles
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Manage show profiles with different themes, assets, and settings
          </p>
        </div>

        <Card className="p-4">
          <ProfileManager />
        </Card>
      </div>
    </div>
  );
}

