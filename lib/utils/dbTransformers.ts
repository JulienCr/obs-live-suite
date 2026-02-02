/**
 * SQLite database type transformation utilities.
 * Handles conversion between JavaScript types and SQLite storage formats.
 */

/**
 * Convert SQLite integer (0/1) to boolean
 */
export function sqliteToBoolean(value: number | undefined | null): boolean {
  return value === 1;
}

/**
 * Convert boolean to SQLite integer (0/1)
 */
export function booleanToSqlite(value: boolean | undefined | null): number {
  return value ? 1 : 0;
}

/**
 * Convert SQLite ISO string to Date
 */
export function sqliteToDate(value: string | undefined | null): Date {
  if (!value) {
    return new Date();
  }
  return new Date(value);
}

/**
 * Convert Date to SQLite ISO string
 */
export function dateToSqlite(value: Date | undefined | null): string {
  if (!value) {
    return new Date().toISOString();
  }
  return value.toISOString();
}

/**
 * Convert SQLite Unix timestamp (milliseconds) to Date
 */
export function sqliteTimestampToDate(value: number | undefined | null): Date {
  if (!value) {
    return new Date();
  }
  return new Date(value);
}

/**
 * Convert Date to SQLite Unix timestamp (milliseconds)
 */
export function dateToSqliteTimestamp(value: Date | undefined | null): number {
  if (!value) {
    return Date.now();
  }
  return value.getTime();
}

/**
 * Transform a raw SQLite row by converting date strings and boolean integers.
 * This is a generic transformer that handles common column patterns.
 *
 * @param row - The raw database row
 * @param dateColumns - List of column names that contain ISO date strings
 * @param booleanColumns - List of column names that contain 0/1 integers
 * @returns The transformed row with proper JavaScript types
 */
export function transformRow<
  TRaw extends Record<string, unknown>,
  TResult extends Record<string, unknown>
>(
  row: TRaw,
  dateColumns: (keyof TRaw)[],
  booleanColumns: (keyof TRaw)[]
): TResult {
  const result = { ...row } as unknown as Record<string, unknown>;

  for (const col of dateColumns) {
    const value = row[col];
    if (typeof value === "string") {
      result[col as string] = sqliteToDate(value);
    } else if (typeof value === "number") {
      result[col as string] = sqliteTimestampToDate(value);
    }
  }

  for (const col of booleanColumns) {
    const value = row[col];
    if (typeof value === "number") {
      result[col as string] = sqliteToBoolean(value);
    }
  }

  return result as TResult;
}

/**
 * Standard date columns found in most tables
 */
export const STANDARD_DATE_COLUMNS = ["createdAt", "updatedAt"] as const;

/**
 * Prepare a value for insertion/update by converting types as needed
 */
export function prepareValue(value: unknown): unknown {
  if (value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value);
  }
  return value;
}

/**
 * Prepare an object for database insertion by converting all values
 */
export function prepareForInsert<T extends Record<string, unknown>>(
  obj: T
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = prepareValue(value);
  }
  return result;
}
