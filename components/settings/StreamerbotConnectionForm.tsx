"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  type StreamerbotConnectionSettings,
  DEFAULT_STREAMERBOT_CONNECTION,
} from "@/lib/models/StreamerbotChat";

export interface StreamerbotConnectionFormProps {
  value?: StreamerbotConnectionSettings;
  onChange: (value: StreamerbotConnectionSettings | undefined) => void;
  disabled?: boolean;
}

/**
 * Form component for configuring Streamer.bot WebSocket connection
 */
export function StreamerbotConnectionForm({
  value,
  onChange,
  disabled = false,
}: StreamerbotConnectionFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Use default values when value is undefined
  const settings = value ?? DEFAULT_STREAMERBOT_CONNECTION;

  const handleChange = <K extends keyof StreamerbotConnectionSettings>(
    key: K,
    newValue: StreamerbotConnectionSettings[K]
  ) => {
    onChange({
      ...settings,
      [key]: newValue,
    });
  };

  const handleClear = () => {
    onChange(undefined);
    setTestResult(null);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const wsUrl = `${settings.scheme}://${settings.host}:${settings.port}${settings.endpoint}`;

      // Create a test WebSocket connection
      const ws = new WebSocket(wsUrl);

      const timeout = setTimeout(() => {
        ws.close();
        setTestResult({
          success: false,
          message: "Connection timeout (5s)",
        });
        setTesting(false);
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        setTestResult({
          success: true,
          message: `Connected to ${settings.host}:${settings.port}`,
        });
        setTesting(false);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        setTestResult({
          success: false,
          message: `Failed to connect to ${settings.host}:${settings.port}`,
        });
        setTesting(false);
      };
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : "Connection failed",
      });
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Streamer.bot Connection</span>
        </div>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={disabled}
          >
            <XCircle className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Host */}
        <div className="space-y-2">
          <Label htmlFor="sb-host" className="text-xs">
            Host
          </Label>
          <Input
            id="sb-host"
            value={settings.host}
            onChange={(e) => handleChange("host", e.target.value)}
            placeholder="127.0.0.1"
            disabled={disabled}
            className="h-9"
          />
        </div>

        {/* Port */}
        <div className="space-y-2">
          <Label htmlFor="sb-port" className="text-xs">
            Port
          </Label>
          <Input
            id="sb-port"
            type="number"
            value={settings.port}
            onChange={(e) => handleChange("port", parseInt(e.target.value) || 8080)}
            placeholder="8080"
            min={1}
            max={65535}
            disabled={disabled}
            className="h-9"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Endpoint */}
        <div className="space-y-2">
          <Label htmlFor="sb-endpoint" className="text-xs">
            Endpoint
          </Label>
          <Input
            id="sb-endpoint"
            value={settings.endpoint}
            onChange={(e) => handleChange("endpoint", e.target.value)}
            placeholder="/"
            disabled={disabled}
            className="h-9"
          />
        </div>

        {/* Scheme */}
        <div className="space-y-2">
          <Label htmlFor="sb-scheme" className="text-xs">
            Protocol
          </Label>
          <Select
            value={settings.scheme}
            onValueChange={(value: "ws" | "wss") => handleChange("scheme", value)}
            disabled={disabled}
          >
            <SelectTrigger id="sb-scheme" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ws">ws:// (Default)</SelectItem>
              <SelectItem value="wss">wss:// (Secure)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="sb-password" className="text-xs">
          Password (optional)
        </Label>
        <div className="relative">
          <Input
            id="sb-password"
            type={showPassword ? "text" : "password"}
            value={settings.password || ""}
            onChange={(e) => handleChange("password", e.target.value || undefined)}
            placeholder="Leave empty if auth is disabled"
            disabled={disabled}
            className="h-9 pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-9 w-9"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {settings.password && (
          <Alert variant="default" className="py-2">
            <AlertTriangle className="h-3 w-3" />
            <AlertDescription className="text-xs">
              Password will be stored in the database. Use with caution.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="sb-autoConnect" className="text-xs cursor-pointer">
            Auto-connect when panel opens
          </Label>
          <Switch
            id="sb-autoConnect"
            checked={settings.autoConnect}
            onCheckedChange={(checked) => handleChange("autoConnect", checked)}
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="sb-autoReconnect" className="text-xs cursor-pointer">
            Auto-reconnect on disconnect
          </Label>
          <Switch
            id="sb-autoReconnect"
            checked={settings.autoReconnect}
            onCheckedChange={(checked) => handleChange("autoReconnect", checked)}
            disabled={disabled}
          />
        </div>
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={testConnection}
          disabled={disabled || testing}
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 mr-2" />
              Test Connection
            </>
          )}
        </Button>

        {testResult && (
          <div
            className={`flex items-center gap-1 text-xs ${
              testResult.success ? "text-green-600" : "text-destructive"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            {testResult.message}
          </div>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground">
        Configure the connection to your local Streamer.bot WebSocket server.
        Default port is usually 8080. Enable authentication in Streamer.bot settings
        if you want to use a password.
      </p>
    </div>
  );
}
