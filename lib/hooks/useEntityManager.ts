"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiGet, apiDelete } from "@/lib/utils/ClientFetch";

/**
 * Configuration options for useEntityManager.
 *
 * @template T - The entity type being managed
 */
export interface UseEntityManagerOptions<T> {
  /** GET endpoint for listing entities (e.g., "/api/assets/posters") */
  endpoint: string;

  /**
   * Extract the items array from the API response.
   * The API may return `{ posters: [...] }` or `{ profiles: [...] }` etc.
   *
   * @example
   * ```ts
   * extractItems: (data) => data.posters || []
   * ```
   */
  extractItems: (data: unknown) => T[];

  /** Entity name used in error logging (e.g., "posters", "profiles") */
  entityName: string;

  /**
   * Extract the ID from an entity for building delete URLs.
   * @default (item) => (item as any).id
   */
  getId?: (item: T) => string;

  /**
   * Build the DELETE endpoint for a given entity ID.
   * @default `${endpoint}/${id}`
   */
  deleteEndpoint?: (id: string) => string;

  /**
   * Whether to fetch the list on mount.
   * @default true
   */
  fetchOnMount?: boolean;
}

/**
 * Return type for useEntityManager.
 *
 * @template T - The entity type being managed
 */
export interface UseEntityManagerReturn<T> {
  /** The current list of entities */
  items: T[];

  /** Update items directly (for optimistic updates or external mutations) */
  setItems: React.Dispatch<React.SetStateAction<T[]>>;

  /** Whether the initial fetch is in progress */
  loading: boolean;

  /** Refresh the entity list from the server */
  refresh: () => Promise<void>;

  /**
   * Delete an entity by ID.
   * Returns true if deletion succeeded, false otherwise.
   * Does NOT prompt for confirmation -- callers should handle that.
   */
  deleteItem: (id: string) => Promise<boolean>;
}

/**
 * Generic hook for managing entity lists with fetch/refresh/delete.
 *
 * Encapsulates the common pattern shared by manager components:
 * - Fetch a list from an API endpoint on mount
 * - Provide loading state
 * - Refresh after mutations
 * - Delete with error handling
 *
 * Rendering, forms, filtering, and entity-specific operations remain
 * in each component. This hook handles DATA lifecycle only.
 *
 * @example
 * ```tsx
 * const { items: posters, loading, refresh, deleteItem } = useEntityManager<Poster>({
 *   endpoint: "/api/assets/posters",
 *   extractItems: (data) => (data as { posters: Poster[] }).posters || [],
 *   entityName: "posters",
 * });
 * ```
 */
export function useEntityManager<T>(
  options: UseEntityManagerOptions<T>
): UseEntityManagerReturn<T> {
  const {
    endpoint,
    extractItems,
    entityName,
    getId = (item: T) => (item as Record<string, unknown>).id as string,
    deleteEndpoint,
    fetchOnMount = true,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  // Store extractItems in a ref to avoid stale closures
  // and prevent re-fetching when inline functions change identity
  const extractItemsRef = useRef(extractItems);
  extractItemsRef.current = extractItems;

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet<unknown>(endpoint);
      setItems(extractItemsRef.current(data));
    } catch (error) {
      console.error(`Failed to fetch ${entityName}:`, error);
    } finally {
      setLoading(false);
    }
  }, [endpoint, entityName]);

  useEffect(() => {
    if (fetchOnMount) {
      refresh();
    } else {
      setLoading(false);
    }
  }, [refresh, fetchOnMount]);

  const deleteItem = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const url = deleteEndpoint
          ? deleteEndpoint(id)
          : `${endpoint}/${id}`;
        await apiDelete<{ success: boolean }>(url);
        await refresh();
        return true;
      } catch (error) {
        console.error(`Failed to delete ${entityName}:`, error);
        return false;
      }
    },
    [endpoint, deleteEndpoint, entityName, refresh]
  );

  return {
    items,
    setItems,
    loading,
    refresh,
    deleteItem,
  };
}
