import { Card } from "@/components/ui/card";
import { ThemeManager } from "@/components/assets/ThemeManager";

export default function ThemesPage() {
  return (
    <Card className="p-4">
      <ThemeManager />
    </Card>
  );
}
