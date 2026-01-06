"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, RefreshCw, Trash2 } from "lucide-react";
import { apiGet, apiPost, apiDelete, isClientFetchError } from "@/lib/utils/ClientFetch";

type LLMProvider = "ollama" | "openai" | "anthropic";

interface LLMSettings {
  llm_provider: LLMProvider;
  
  // Ollama
  ollama_url?: string;
  ollama_model?: string;
  
  // OpenAI
  openai_api_key?: string;
  openai_model?: string;
  
  // Anthropic
  anthropic_api_key?: string;
  anthropic_model?: string;
}

/**
 * LLMSettings - Configuration for AI summarization providers
 */
export function OllamaSettings() {
  const [settings, setSettings] = useState<LLMSettings>({
    llm_provider: "ollama",
    ollama_url: "http://localhost:11434",
    ollama_model: "mistral:latest",
    openai_model: "gpt-5-mini",
    anthropic_model: "claude-3-5-sonnet-20241022",
  });

  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Load current settings from database
  useEffect(() => {
    loadSettings();
  }, []);

  // Load available models when provider changes
  useEffect(() => {
    if (settings.llm_provider) {
      loadAvailableModels();
    }
  }, [settings.llm_provider]);

  const loadSettings = async () => {
    try {
      const data = await apiGet<{ settings: Partial<LLMSettings> }>("/api/settings/integrations");
      setSettings(prev => ({
        ...prev,
        ...data.settings,
      }));
    } catch (error) {
      console.error("Failed to load settings:", error);
      if (isClientFetchError(error)) {
        toast.error(error.errorMessage);
      } else {
        toast.error("Failed to load settings");
      }
    }
  };

  const loadAvailableModels = async () => {
    setIsLoadingModels(true);
    try {
      const data = await apiGet<{ models?: string[] }>("/api/llm/models");
      setAvailableModels(data.models || []);
    } catch (error) {
      console.error("Failed to load models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const data = await apiPost<{ success: boolean; provider?: string; error?: string }>(
        "/api/llm/test",
        settings
      );

      setTestResult({
        success: data.success,
        message: data.success
          ? `Connected to ${data.provider}`
          : `${data.error || "Connection failed"}`,
      });

      if (data.success) {
        toast.success(`Connected to ${data.provider}`);
      } else {
        toast.error(data.error || "Connection failed");
      }
    } catch (error) {
      const message = isClientFetchError(error) ? error.errorMessage :
        (error instanceof Error ? error.message : "Connection failed");
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiPost("/api/settings/integrations", settings);
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      if (isClientFetchError(error)) {
        toast.error(error.errorMessage);
      } else {
        toast.error(error instanceof Error ? error.message : "Failed to save settings");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm("Clear all Wikipedia cache? This cannot be undone.")) {
      return;
    }

    setIsClearingCache(true);
    try {
      await apiDelete("/api/wikipedia/cache");
      toast.success("Cache cleared successfully");
    } catch (error) {
      console.error("Failed to clear cache:", error);
      if (isClientFetchError(error)) {
        toast.error(error.errorMessage);
      } else {
        toast.error("Failed to clear cache");
      }
    } finally {
      setIsClearingCache(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI Summarization</h2>
        <p className="text-muted-foreground">
          Configure your AI provider for Wikipedia summarization
        </p>
      </div>

      {/* Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Provider</CardTitle>
          <CardDescription>
            Choose your AI model provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">LLM Provider</Label>
            <Select
              value={settings.llm_provider}
              onValueChange={(value: LLMProvider) =>
                setSettings({ ...settings, llm_provider: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Provider-specific settings */}
      <Tabs value={settings.llm_provider} className="w-full">
        <TabsList className="hidden" />
        
        {/* Ollama Settings */}
        <TabsContent value="ollama" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ollama Configuration</CardTitle>
              <CardDescription>
                Local Ollama server settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ollama_url">Server URL</Label>
                <Input
                  id="ollama_url"
                  value={settings.ollama_url}
                  onChange={(e) =>
                    setSettings({ ...settings, ollama_url: e.target.value })
                  }
                  placeholder="http://localhost:11434"
                />
                <p className="text-sm text-muted-foreground">
                  Make sure Ollama is running: <code>ollama serve</code>
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ollama_model">Model</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadAvailableModels}
                    disabled={isLoadingModels}
                  >
                    {isLoadingModels ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Select
                  value={settings.ollama_model}
                  onValueChange={(value) =>
                    setSettings({ ...settings, ollama_model: value })
                  }
                  disabled={isLoadingModels}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.length > 0 ? (
                      availableModels.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-models" disabled>
                        No models found - run `ollama pull mistral`
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Install models: <code>ollama pull mistral</code>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OpenAI Settings */}
        <TabsContent value="openai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>OpenAI Configuration</CardTitle>
              <CardDescription>
                OpenAI API settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai_api_key">API Key</Label>
                <Input
                  id="openai_api_key"
                  type="password"
                  value={settings.openai_api_key || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, openai_api_key: e.target.value })
                  }
                  placeholder="sk-..."
                />
                <p className="text-sm text-muted-foreground">
                  Get your API key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai_model">Model</Label>
                <Select
                  value={settings.openai_model}
                  onValueChange={(value) =>
                    setSettings({ ...settings, openai_model: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5-mini">
                      GPT-5 Mini — Rapide & économique ⭐
                    </SelectItem>
                    <SelectItem value="gpt-5.2">
                      GPT-5.2 — Équilibré
                    </SelectItem>
                    <SelectItem value="gpt-4o-mini">
                      GPT-4o Mini — Previous gen
                    </SelectItem>
                    <SelectItem value="gpt-4o">
                      GPT-4o — Previous gen (high quality)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  GPT-5 models: latest generation from OpenAI (Dec 2024).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anthropic Settings */}
        <TabsContent value="anthropic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Anthropic Configuration</CardTitle>
              <CardDescription>
                Anthropic (Claude) API settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="anthropic_api_key">API Key</Label>
                <Input
                  id="anthropic_api_key"
                  type="password"
                  value={settings.anthropic_api_key || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, anthropic_api_key: e.target.value })
                  }
                  placeholder="sk-ant-..."
                />
                <p className="text-sm text-muted-foreground">
                  Get your API key from{" "}
                  <a
                    href="https://console.anthropic.com/settings/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="anthropic_model">Model</Label>
                <Select
                  value={settings.anthropic_model}
                  onValueChange={(value) =>
                    setSettings({ ...settings, anthropic_model: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-3-5-haiku-20241022">
                      Claude 3.5 Haiku — Rapide & économique ⭐
                    </SelectItem>
                    <SelectItem value="claude-3-5-sonnet-20241022">
                      Claude 3.5 Sonnet — Équilibré (recommandé)
                    </SelectItem>
                    <SelectItem value="claude-3-opus-20240229">
                      Claude 3 Opus — Meilleure qualité
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Sonnet 3.5 : excellent rapport qualité/prix pour résumés.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test & Save */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            onClick={handleTest}
            disabled={isTesting || isSaving}
            variant="outline"
          >
            {isTesting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              "Test Connection"
            )}
          </Button>

          {testResult && (
            <div className="flex items-center gap-2 px-3 py-2 rounded border">
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">{testResult.message}</span>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={isSaving || isTesting}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>

      {/* Cache Management */}
      <Card>
        <CardHeader>
          <CardTitle>Cache Management</CardTitle>
          <CardDescription>
            Manage Wikipedia summary cache
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Clear all cached Wikipedia summaries to force new lookups
            </p>
            <Button
              variant="destructive"
              onClick={handleClearCache}
              disabled={isClearingCache}
            >
              {isClearingCache ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Cache
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
