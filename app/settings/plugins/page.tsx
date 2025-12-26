import { Card } from "@/components/ui/card";
import { PluginSettings } from "@/components/settings/PluginSettings";

export default function PluginSettingsPage() {
  return (
    <Card className="p-4">
      <PluginSettings />
    </Card>
  );
}
