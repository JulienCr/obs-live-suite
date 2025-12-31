"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  type ChatUIPreferences,
  type HighlightRule,
  chatUIPreferencesSchema,
  DEFAULT_CHAT_UI_PREFERENCES,
} from "@/lib/models/StreamerbotChat";

const STORAGE_KEY = "streamerbot-chat-preferences";

export interface UseStreamerbotChatSettingsReturn {
  preferences: ChatUIPreferences;
  updatePreferences: (updates: Partial<ChatUIPreferences>) => void;
  resetPreferences: () => void;
  // Highlight rule helpers
  addHighlightRule: (rule: Omit<HighlightRule, "id">) => void;
  updateHighlightRule: (id: string, updates: Partial<Omit<HighlightRule, "id">>) => void;
  removeHighlightRule: (id: string) => void;
  toggleHighlightRule: (id: string) => void;
  // Loading state
  isLoaded: boolean;
}

/**
 * Load preferences from localStorage
 */
function loadPreferences(): ChatUIPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_CHAT_UI_PREFERENCES;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_CHAT_UI_PREFERENCES;
    }

    const parsed = JSON.parse(stored);
    // Validate and merge with defaults
    const result = chatUIPreferencesSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }

    console.warn("[ChatSettings] Invalid stored preferences, using defaults");
    return DEFAULT_CHAT_UI_PREFERENCES;
  } catch (error) {
    console.error("[ChatSettings] Error loading preferences:", error);
    return DEFAULT_CHAT_UI_PREFERENCES;
  }
}

/**
 * Save preferences to localStorage
 */
function savePreferences(preferences: ChatUIPreferences): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error("[ChatSettings] Error saving preferences:", error);
  }
}

/**
 * React hook for managing Streamer.bot chat UI preferences in localStorage
 */
export function useStreamerbotChatSettings(): UseStreamerbotChatSettingsReturn {
  const [preferences, setPreferences] = useState<ChatUIPreferences>(DEFAULT_CHAT_UI_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const loaded = loadPreferences();
    setPreferences(loaded);
    setIsLoaded(true);
  }, []);

  // Save preferences when they change
  useEffect(() => {
    if (isLoaded) {
      savePreferences(preferences);
    }
  }, [preferences, isLoaded]);

  /**
   * Update preferences with partial values
   */
  const updatePreferences = useCallback((updates: Partial<ChatUIPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  /**
   * Reset preferences to defaults
   */
  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_CHAT_UI_PREFERENCES);
  }, []);

  /**
   * Add a new highlight rule
   */
  const addHighlightRule = useCallback((rule: Omit<HighlightRule, "id">) => {
    setPreferences((prev) => ({
      ...prev,
      highlightRules: [
        ...prev.highlightRules,
        {
          ...rule,
          id: uuidv4(),
        },
      ],
    }));
  }, []);

  /**
   * Update an existing highlight rule
   */
  const updateHighlightRule = useCallback(
    (id: string, updates: Partial<Omit<HighlightRule, "id">>) => {
      setPreferences((prev) => ({
        ...prev,
        highlightRules: prev.highlightRules.map((rule) =>
          rule.id === id ? { ...rule, ...updates } : rule
        ),
      }));
    },
    []
  );

  /**
   * Remove a highlight rule
   */
  const removeHighlightRule = useCallback((id: string) => {
    setPreferences((prev) => ({
      ...prev,
      highlightRules: prev.highlightRules.filter((rule) => rule.id !== id),
    }));
  }, []);

  /**
   * Toggle a highlight rule's enabled state
   */
  const toggleHighlightRule = useCallback((id: string) => {
    setPreferences((prev) => ({
      ...prev,
      highlightRules: prev.highlightRules.map((rule) =>
        rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
      ),
    }));
  }, []);

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    addHighlightRule,
    updateHighlightRule,
    removeHighlightRule,
    toggleHighlightRule,
    isLoaded,
  };
}
