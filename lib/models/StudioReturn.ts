import { z } from "zod";

/**
 * Monitor information reported by the Tauri app.
 * Not persisted to DB — refreshed each time the Tauri app starts or polls.
 */
export interface MonitorInfo {
  index: number;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  isPrimary: boolean;
}

/**
 * Studio Return overlay settings schema
 */
export const StudioReturnSettingsSchema = z.object({
  monitorIndex: z.number().default(0),
  displayDuration: z.number().default(10),
  fontSize: z.number().default(80),
  enabled: z.boolean().default(true),
});

export type StudioReturnSettings = z.infer<typeof StudioReturnSettingsSchema>;

export const DEFAULT_STUDIO_RETURN_SETTINGS: StudioReturnSettings = {
  monitorIndex: 0,
  displayDuration: 10,
  fontSize: 80,
  enabled: true,
};
