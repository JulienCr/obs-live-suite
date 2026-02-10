import { z } from "zod";

export const textPresetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required").max(100),
  body: z.string().min(1, "Body is required").max(2000),
  side: z.enum(["left", "right", "center"]).default("left"),
  imageUrl: z.string().nullable().default(null),
  imageAlt: z.string().max(200).nullable().default(null),
  isEnabled: z.boolean().default(true),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type TextPreset = z.infer<typeof textPresetSchema>;

export const createTextPresetSchema = textPresetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTextPresetInput = z.infer<typeof createTextPresetSchema>;

export const updateTextPresetSchema = textPresetSchema.partial().required({ id: true });

export type UpdateTextPresetInput = z.infer<typeof updateTextPresetSchema>;
