import { Card } from "@/components/ui/card";
import { BackendSettings } from "@/components/settings/BackendSettings";

export default function BackendSettingsPage() {
  return (
    <Card className="p-4">
      <BackendSettings />
    </Card>
  );
}
