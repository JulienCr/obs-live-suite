"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet, apiPost, apiPut, isClientFetchError } from "@/lib/utils/ClientFetch";

export interface SaveResult {
  success: boolean;
  message: string;
}

export interface UseSettingsOptions<TGet, TState> {
  /** GET endpoint to load settings from */
  endpoint: string;

  /** Save endpoint (defaults to same as endpoint) */
  saveEndpoint?: string;

  /** HTTP method for saving: "POST" or "PUT" (default: "POST") */
  saveMethod?: "POST" | "PUT";

  /** Initial state before data loads */
  initialState: TState;

  /** Transform the API response into component state */
  fromResponse: (data: TGet) => TState;

  /** Transform component state into save payload (defaults to identity) */
  toPayload?: (state: TState) => unknown;

  /** Custom success message (optional) */
  successMessage?: string;

  /** Custom error message fallback (optional) */
  errorMessage?: string;

  /** Custom load error message (if set, load failures will show in saveResult) */
  loadErrorMessage?: string;
}

export interface UseSettingsReturn<TState> {
  /** Current settings data */
  data: TState;

  /** Update settings data */
  setData: React.Dispatch<React.SetStateAction<TState>>;

  /** Whether initial load is in progress */
  loading: boolean;

  /** Whether save is in progress */
  saving: boolean;

  /** Result of the last save operation */
  saveResult: SaveResult | null;

  /** Clear the save result */
  clearSaveResult: () => void;

  /** Save current settings */
  save: () => Promise<boolean>;

  /** Reload settings from server */
  reload: () => Promise<void>;
}

/**
 * Generic hook for settings components that follow the load/edit/save pattern.
 *
 * Eliminates the repeated useState + useEffect + handleSave boilerplate
 * found across ~10 settings components.
 *
 * @example
 * ```tsx
 * const { data, setData, loading, saving, saveResult, save } = useSettings({
 *   endpoint: "/api/settings/general",
 *   initialState: { displayMode: "left" },
 *   fromResponse: (res) => ({
 *     displayMode: res.settings?.defaultPosterDisplayMode || "left",
 *   }),
 * });
 * ```
 */
export function useSettings<TGet, TState>(
  options: UseSettingsOptions<TGet, TState>
): UseSettingsReturn<TState> {
  const {
    endpoint,
    saveEndpoint,
    saveMethod = "POST",
    initialState,
    fromResponse,
    toPayload,
    successMessage = "Settings saved successfully",
    errorMessage = "Failed to save settings",
    loadErrorMessage,
  } = options;

  const [data, setData] = useState<TState>(initialState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);

  // Use refs for callbacks and current data to avoid stale closures
  // and prevent infinite re-render loops from inline functions
  const dataRef = useRef(data);
  dataRef.current = data;

  const fromResponseRef = useRef(fromResponse);
  fromResponseRef.current = fromResponse;

  const toPayloadRef = useRef(toPayload);
  toPayloadRef.current = toPayload;

  const successMessageRef = useRef(successMessage);
  successMessageRef.current = successMessage;

  const errorMessageRef = useRef(errorMessage);
  errorMessageRef.current = errorMessage;

  const loadErrorMessageRef = useRef(loadErrorMessage);
  loadErrorMessageRef.current = loadErrorMessage;

  const reload = useCallback(async () => {
    try {
      const response = await apiGet<TGet>(endpoint);
      setData(fromResponseRef.current(response));
    } catch (error) {
      console.error(`Failed to load settings from ${endpoint}:`, error);
      if (loadErrorMessageRef.current) {
        setSaveResult({ success: false, message: loadErrorMessageRef.current });
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    setSaveResult(null);

    try {
      const currentToPayload = toPayloadRef.current;
      const payload = currentToPayload ? currentToPayload(dataRef.current) : dataRef.current;
      const target = saveEndpoint ?? endpoint;

      if (saveMethod === "PUT") {
        await apiPut(target, payload);
      } else {
        await apiPost(target, payload);
      }

      setSaveResult({ success: true, message: successMessageRef.current });
      return true;
    } catch (error) {
      const message = isClientFetchError(error)
        ? error.errorMessage
        : error instanceof Error
          ? error.message
          : errorMessageRef.current;

      setSaveResult({ success: false, message });
      return false;
    } finally {
      setSaving(false);
    }
  }, [endpoint, saveEndpoint, saveMethod]);

  const clearSaveResult = useCallback(() => setSaveResult(null), []);

  return {
    data,
    setData,
    loading,
    saving,
    saveResult,
    clearSaveResult,
    save,
    reload,
  };
}
