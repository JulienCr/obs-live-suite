/**
 * SettingsStore - Generic typed settings storage abstraction
 *
 * Provides a type-safe way to read/write settings groups from the database
 * with automatic type coercion, default values from Zod schemas, and
 * consistent error handling.
 *
 * @example
 * ```typescript
 * const obsStore = new SettingsStore(db, "obs", OBSSettingsSchema, logger, {
 *   // Custom mapping from schema fields to database keys
 *   keyMapping: { url: "websocket.url", password: "websocket.password" },
 *   // Optional fallback provider (e.g., environment variables)
 *   fallbackProvider: (key) => process.env[`OBS_${key.toUpperCase()}`],
 * });
 *
 * // Read all settings
 * const settings = obsStore.get();
 *
 * // Update settings (partial update)
 * obsStore.set({ url: "ws://localhost:4455" });
 *
 * // Check if a specific key has a value in database
 * const hasUrl = obsStore.has("url");
 *
 * // Clear all settings for this store
 * obsStore.clear();
 * ```
 */

import { z, ZodObject, ZodRawShape, ZodTypeAny } from "zod";
import type { DatabaseService } from "./DatabaseService";
import type { Logger } from "../utils/Logger";

/**
 * Configuration options for SettingsStore
 */
export interface SettingsStoreOptions<T extends ZodRawShape> {
  /**
   * Custom mapping from schema field names to database key suffixes.
   * If not provided, field names are used directly as key suffixes.
   *
   * @example
   * { url: "websocket.url" } maps schema field "url" to database key "obs.websocket.url"
   */
  keyMapping?: Partial<Record<keyof z.infer<ZodObject<T>>, string>>;

  /**
   * Optional fallback provider function called when a database value is null.
   * Useful for falling back to environment variables.
   *
   * @param key - The schema field name
   * @returns The fallback value as a string, or undefined if no fallback
   */
  fallbackProvider?: (key: string) => string | undefined;

  /**
   * Whether to log detailed debug information about value resolution.
   * @default false
   */
  debugLogging?: boolean;
}

/**
 * Type coercion functions for converting database string values to typed values
 */
const typeCoercers = {
  /**
   * Parse a string to a number, returning undefined if invalid
   */
  toNumber: (value: string | null): number | undefined => {
    if (value === null || value === undefined || value === "") return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  },

  /**
   * Parse a string to a boolean
   */
  toBoolean: (value: string | null): boolean | undefined => {
    if (value === null || value === undefined || value === "") return undefined;
    return value === "true";
  },

  /**
   * Parse a JSON string to an object/array.
   * Logs a warning if parsing fails to aid debugging data corruption.
   */
  toJson: <T>(value: string | null, context?: string): T | undefined => {
    if (value === null || value === undefined || value === "") return undefined;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.warn(
        `[SettingsStore] Failed to parse JSON${context ? ` for "${context}"` : ""}:`,
        error instanceof Error ? error.message : error,
        `(value preview: ${value.substring(0, 50)}${value.length > 50 ? "..." : ""})`
      );
      return undefined;
    }
  },
};

/**
 * Serialize typed values to strings for database storage
 */
const typeSerializers = {
  /**
   * Serialize a value to a string for database storage
   */
  toString: (value: unknown): string | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  },
};

/**
 * Get the expected type from a Zod schema field
 */
function getZodFieldType(schema: ZodTypeAny): "string" | "number" | "boolean" | "array" | "object" | "unknown" {
  // Unwrap optional/nullable/default wrappers
  let innerSchema = schema;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  while ((innerSchema as any)._def?.innerType) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    innerSchema = (innerSchema as any)._def.innerType;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typeName = (innerSchema as any)._def?.typeName;

  switch (typeName) {
    case "ZodString":
      return "string";
    case "ZodNumber":
      return "number";
    case "ZodBoolean":
      return "boolean";
    case "ZodArray":
      return "array";
    case "ZodObject":
      return "object";
    case "ZodEnum":
      return "string"; // Enums are stored as strings
    default:
      return "unknown";
  }
}

/**
 * SettingsStore provides typed access to a group of related settings.
 *
 * @template T - The Zod schema shape for the settings
 */
export class SettingsStore<T extends ZodRawShape> {
  private db: DatabaseService;
  private prefix: string;
  private schema: ZodObject<T>;
  private logger: Logger;
  private options: SettingsStoreOptions<T>;

  /**
   * Create a new SettingsStore instance.
   *
   * @param db - DatabaseService instance for reading/writing settings
   * @param prefix - Key prefix for all settings in this store (e.g., "obs", "streamerbot")
   * @param schema - Zod schema defining the settings structure with defaults
   * @param logger - Logger instance for debug/error logging
   * @param options - Optional configuration options
   */
  constructor(
    db: DatabaseService,
    prefix: string,
    schema: ZodObject<T>,
    logger: Logger,
    options: SettingsStoreOptions<T> = {}
  ) {
    this.db = db;
    this.prefix = prefix;
    this.schema = schema;
    this.logger = logger;
    this.options = options;
  }

  /**
   * Get the full database key for a schema field.
   *
   * @param field - The schema field name
   * @returns The full database key (e.g., "obs.websocket.url")
   */
  private getDbKey(field: string): string {
    const mapping = this.options.keyMapping?.[field as keyof z.infer<ZodObject<T>>];
    const suffix = mapping ?? field;
    return `${this.prefix}.${suffix}`;
  }

  /**
   * Get all settings, merged with defaults from the schema.
   *
   * @returns The complete settings object with all fields populated
   */
  get(): z.infer<ZodObject<T>> {
    const result: Record<string, unknown> = {};
    const shape = this.schema.shape;

    for (const [field, fieldSchema] of Object.entries(shape)) {
      const dbKey = this.getDbKey(field);
      let dbValue = this.db.getSetting(dbKey);
      let source = "database";

      // Try fallback provider if database value is null
      if (dbValue === null && this.options.fallbackProvider) {
        const fallbackValue = this.options.fallbackProvider(field);
        if (fallbackValue !== undefined) {
          dbValue = fallbackValue;
          source = "fallback";
        }
      }

      // Coerce the value based on the field type
      const fieldType = getZodFieldType(fieldSchema as ZodTypeAny);
      let coercedValue: unknown;

      if (dbValue !== null) {
        switch (fieldType) {
          case "number":
            coercedValue = typeCoercers.toNumber(dbValue);
            break;
          case "boolean":
            coercedValue = typeCoercers.toBoolean(dbValue);
            break;
          case "array":
          case "object":
            coercedValue = typeCoercers.toJson(dbValue, `${this.prefix}.${field}`);
            break;
          default:
            coercedValue = dbValue;
        }
      }

      if (this.options.debugLogging && coercedValue !== undefined) {
        this.logger.debug(
          `Setting ${field} loaded from ${source}: ${typeof coercedValue === "object" ? JSON.stringify(coercedValue) : coercedValue}`
        );
      }

      // Only set if we have a value; Zod defaults will fill in missing fields
      if (coercedValue !== undefined) {
        result[field] = coercedValue;
      }
    }

    // Parse through Zod to apply defaults and validate
    try {
      return this.schema.parse(result);
    } catch (error) {
      // Extract which fields failed for better debugging
      const zodError = error as z.ZodError;
      const failedFields = zodError.errors?.map((e) => e.path.join(".")) || [];
      this.logger.error(
        `Settings validation failed for "${this.prefix}". ` +
        `Failed fields: [${failedFields.join(", ")}]. Using schema defaults.`,
        { zodErrors: zodError.errors, rawValues: result }
      );
      // Return schema defaults on validation failure
      return this.schema.parse({});
    }
  }

  /**
   * Get a single setting value.
   *
   * @param field - The field name to get
   * @returns The field value (with defaults applied)
   */
  getField<K extends keyof z.infer<ZodObject<T>>>(field: K): z.infer<ZodObject<T>>[K] {
    return this.get()[field];
  }

  /**
   * Update settings (partial update supported).
   *
   * @param settings - Partial settings object with fields to update
   */
  set(settings: Partial<z.infer<ZodObject<T>>>): void {
    const shape = this.schema.shape;

    for (const [field, value] of Object.entries(settings)) {
      if (!(field in shape)) {
        this.logger.warn(`Unknown setting field: ${field}`);
        continue;
      }

      const dbKey = this.getDbKey(field);

      if (value === null || value === undefined) {
        // Delete the setting (will fall back to default/fallback on next read)
        this.db.deleteSetting(dbKey);
      } else if (value === "") {
        // Empty string explicitly clears the setting
        this.db.deleteSetting(dbKey);
      } else {
        const serialized = typeSerializers.toString(value);
        if (serialized !== null) {
          this.db.setSetting(dbKey, serialized);
        }
      }
    }

    this.logger.info(`${this.prefix} settings saved`);
  }

  /**
   * Set a single setting value.
   *
   * @param field - The field name to set
   * @param value - The value to set (null/undefined to delete)
   */
  setField<K extends keyof z.infer<ZodObject<T>>>(
    field: K,
    value: z.infer<ZodObject<T>>[K] | null | undefined
  ): void {
    this.set({ [field]: value } as Partial<z.infer<ZodObject<T>>>);
  }

  /**
   * Check if a specific field has a value stored in the database.
   *
   * @param field - The field name to check
   * @returns true if the field has a stored value
   */
  has<K extends keyof z.infer<ZodObject<T>>>(field: K): boolean {
    const dbKey = this.getDbKey(field as string);
    return this.db.getSetting(dbKey) !== null;
  }

  /**
   * Clear all settings for this store from the database.
   * After clearing, get() will return schema defaults.
   */
  clear(): void {
    const shape = this.schema.shape;

    for (const field of Object.keys(shape)) {
      const dbKey = this.getDbKey(field);
      this.db.deleteSetting(dbKey);
    }

    this.logger.info(`${this.prefix} settings cleared`);
  }

  /**
   * Get the list of all database keys managed by this store.
   *
   * @returns Array of database key names
   */
  getKeys(): string[] {
    const shape = this.schema.shape;
    return Object.keys(shape).map((field) => this.getDbKey(field));
  }
}

/**
 * Factory function to create a SettingsStore with common patterns.
 *
 * @param db - DatabaseService instance
 * @param prefix - Key prefix
 * @param schema - Zod schema
 * @param logger - Logger instance
 * @param options - Store options
 * @returns A configured SettingsStore instance
 */
export function createSettingsStore<T extends ZodRawShape>(
  db: DatabaseService,
  prefix: string,
  schema: ZodObject<T>,
  logger: Logger,
  options?: SettingsStoreOptions<T>
): SettingsStore<T> {
  return new SettingsStore(db, prefix, schema, logger, options);
}
