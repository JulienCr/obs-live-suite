"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Palette } from "lucide-react";

/**
 * Theme management component
 */
export function ThemeManager() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Themes</h2>
        <p className="text-sm text-muted-foreground">
          Customize colors, fonts, and styles for your overlays
        </p>
      </div>

      <Alert>
        <Palette className="w-4 h-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Theme management coming soon!</p>
            <p className="text-sm">
              This feature will allow you to customize:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Color schemes for lower thirds and overlays</li>
              <li>Font selections and sizes</li>
              <li>Animation styles and timings</li>
              <li>Global and per-profile themes</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

