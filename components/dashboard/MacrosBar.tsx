"use client";

import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

/**
 * MacrosBar - Quick access bar for macros
 */
export function MacrosBar() {
  const t = useTranslations("dashboard.macros");
  // TODO: Load from API
  const macros = [
    { id: "1", name: "Show Open", hotkey: "F1" },
    { id: "2", name: "Interview Lower", hotkey: "F2" },
    { id: "3", name: "End Card", hotkey: "F3" },
  ];

  const handleMacro = async (macroId: string) => {
    // TODO: Implement macro execution via API
    console.log("Execute macro:", macroId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {macros.length > 0 ? (
            macros.map((macro) => (
              <Button
                key={macro.id}
                variant="outline"
                size="sm"
                onClick={() => handleMacro(macro.id)}
              >
                {macro.name}
                {macro.hotkey && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {macro.hotkey}
                  </span>
                )}
              </Button>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">
              {t("noMacros")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

