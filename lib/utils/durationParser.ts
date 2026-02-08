/**
 * Parse and format duration strings for video timestamps and YouTube API durations.
 *
 * Supports two formats:
 * 1. HH:MM:SS - Standard video timestamp format
 * 2. ISO 8601 - YouTube API duration format (e.g., "PT6H5M15S")
 *
 * @module durationParser
 */

/**
 * Parse a duration string in HH:MM:SS format to total seconds.
 *
 * Handles various formats:
 * - Full format: "1:30:45" (1 hour, 30 minutes, 45 seconds)
 * - No hours: "5:30" (5 minutes, 30 seconds)
 * - Padded: "01:05:03"
 * - Single digit: "0:0:5"
 *
 * Validation:
 * - Seconds and minutes must be 0-59
 * - Hours can be any non-negative integer
 * - All parts must be numeric
 *
 * @param input - Duration string in HH:MM:SS or MM:SS format
 * @returns Total seconds, or null if format is invalid
 *
 * @example
 * // Full timestamp
 * parseDurationString("1:30:45"); // 5445
 *
 * @example
 * // Minutes and seconds only
 * parseDurationString("5:30"); // 330
 *
 * @example
 * // Invalid format
 * parseDurationString("1:75:00"); // null (seconds out of range)
 * parseDurationString("abc"); // null (not numeric)
 */
export function parseDurationString(input: string): number | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  if (trimmed === '') {
    return null;
  }

  // Split by colons
  const parts = trimmed.split(':');

  // Must have 2 or 3 parts (MM:SS or HH:MM:SS)
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }

  // Parse all parts as integers
  const numbers = parts.map(part => {
    // Check if part contains only digits (reject decimals, letters, etc.)
    if (!/^\d+$/.test(part.trim())) {
      return null;
    }
    const num = parseInt(part, 10);
    return isNaN(num) ? null : num;
  });

  // Check if any part failed to parse
  if (numbers.includes(null)) {
    return null;
  }

  let hours: number, minutes: number, seconds: number;

  if (parts.length === 3) {
    // HH:MM:SS
    [hours, minutes, seconds] = numbers as number[];
  } else {
    // MM:SS
    hours = 0;
    [minutes, seconds] = numbers as number[];
  }

  // Validate ranges
  if (hours < 0 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    return null;
  }

  // Calculate total seconds
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format total seconds into HH:MM:SS duration string.
 *
 * Always returns zero-padded format:
 * - Hours: no padding (can be any length)
 * - Minutes: 2 digits (00-59)
 * - Seconds: 2 digits (00-59)
 *
 * @param seconds - Total seconds (must be non-negative)
 * @returns Formatted duration string in HH:MM:SS format
 * @throws {Error} If seconds is negative
 *
 * @example
 * // Standard duration
 * formatDurationString(5445); // "1:30:45"
 *
 * @example
 * // Zero duration
 * formatDurationString(0); // "0:00:00"
 *
 * @example
 * // Long duration
 * formatDurationString(360000); // "100:00:00"
 *
 * @example
 * // Short duration (less than 1 hour)
 * formatDurationString(330); // "0:05:30"
 */
export function formatDurationString(seconds: number): string {
  if (!Number.isFinite(seconds)) {
    throw new Error('Duration must be a finite number');
  }

  if (seconds < 0) {
    throw new Error('Duration cannot be negative');
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const mm = minutes.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');

  return `${hours}:${mm}:${ss}`;
}

/**
 * Parse ISO 8601 duration format used by YouTube API.
 *
 * YouTube returns video durations in ISO 8601 format (e.g., "PT6H5M15S").
 * This format uses:
 * - P: Period designator (always present)
 * - T: Time designator (always present for time durations)
 * - H: Hours
 * - M: Minutes
 * - S: Seconds
 *
 * Examples from YouTube API:
 * - "PT15S" = 15 seconds
 * - "PT5M30S" = 5 minutes 30 seconds
 * - "PT1H23M45S" = 1 hour 23 minutes 45 seconds
 * - "PT10M" = 10 minutes (seconds omitted)
 * - "PT1H" = 1 hour (minutes and seconds omitted)
 *
 * @param isoDuration - ISO 8601 duration string from YouTube API
 * @returns Total seconds
 * @throws {Error} If format is invalid or not a time duration
 *
 * @example
 * // Full duration with hours, minutes, seconds
 * parseISO8601Duration("PT1H23M45S"); // 5025
 *
 * @example
 * // Duration with only minutes and seconds
 * parseISO8601Duration("PT5M30S"); // 330
 *
 * @example
 * // Duration with only seconds
 * parseISO8601Duration("PT15S"); // 15
 *
 * @example
 * // Duration with only hours
 * parseISO8601Duration("PT2H"); // 7200
 */
export function parseISO8601Duration(isoDuration: string): number {
  if (!isoDuration || typeof isoDuration !== 'string') {
    throw new Error('ISO 8601 duration must be a non-empty string');
  }

  const trimmed = isoDuration.trim();

  // Must start with PT (Period, Time)
  if (!trimmed.startsWith('PT')) {
    throw new Error('Invalid ISO 8601 duration format: must start with "PT"');
  }

  // Remove PT prefix
  const durationPart = trimmed.slice(2);

  if (durationPart === '') {
    throw new Error('Invalid ISO 8601 duration format: no duration specified');
  }

  // Parse hours, minutes, seconds using regex
  const hoursMatch = durationPart.match(/(\d+)H/);
  const minutesMatch = durationPart.match(/(\d+)M/);
  const secondsMatch = durationPart.match(/(\d+)S/);

  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;

  // Validate that at least one component was found
  if (!hoursMatch && !minutesMatch && !secondsMatch) {
    throw new Error('Invalid ISO 8601 duration format: no valid time components');
  }

  // Calculate total seconds
  return hours * 3600 + minutes * 60 + seconds;
}
