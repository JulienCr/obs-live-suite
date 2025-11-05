import { z } from "zod";

/**
 * Widget size enum
 */
export const WidgetSize = {
  SMALL: "small",
  MEDIUM: "medium",
  LARGE: "large",
} as const;

export type WidgetSizeType = typeof WidgetSize[keyof typeof WidgetSize];

/**
 * Widget height enum
 */
export const WidgetHeight = {
  AUTO: "auto",
  COMPACT: "compact",
  NORMAL: "normal",
  TALL: "tall",
} as const;

export type WidgetHeightType = typeof WidgetHeight[keyof typeof WidgetHeight];

/**
 * Widget grid size configuration
 */
export const widgetGridSizeSchema = z.object({
  cols: z.number().int().min(1).max(12),
  minCols: z.number().int().min(1).max(12).optional(),
  maxCols: z.number().int().min(1).max(12).optional(),
});

export type WidgetGridSize = z.infer<typeof widgetGridSizeSchema>;

/**
 * Widget schema for validation
 */
export const widgetSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  size: z.enum([WidgetSize.SMALL, WidgetSize.MEDIUM, WidgetSize.LARGE]).default(WidgetSize.MEDIUM),
  height: z.enum([WidgetHeight.AUTO, WidgetHeight.COMPACT, WidgetHeight.NORMAL, WidgetHeight.TALL]).default(WidgetHeight.AUTO),
  order: z.number().int().min(0).default(0),
  isVisible: z.boolean().default(true),
  settings: z.record(z.unknown()).optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

/**
 * Widget type inferred from schema
 */
export type Widget = z.infer<typeof widgetSchema>;

/**
 * Create widget input schema (without generated fields)
 */
export const createWidgetSchema = widgetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateWidgetInput = z.infer<typeof createWidgetSchema>;

/**
 * Update widget input schema (all fields optional except id)
 */
export const updateWidgetSchema = widgetSchema.partial().required({ id: true });

export type UpdateWidgetInput = z.infer<typeof updateWidgetSchema>;

/**
 * Widget class with business logic
 */
export class WidgetModel {
  private data: Widget;

  constructor(data: Widget) {
    this.data = widgetSchema.parse(data);
  }

  /**
   * Get widget ID
   */
  getId(): string {
    return this.data.id;
  }

  /**
   * Get widget type
   */
  getType(): string {
    return this.data.type;
  }

  /**
   * Get widget size
   */
  getSize(): WidgetSizeType {
    return this.data.size;
  }

  /**
   * Get widget height
   */
  getHeight(): WidgetHeightType {
    return this.data.height;
  }

  /**
   * Get widget order
   */
  getOrder(): number {
    return this.data.order;
  }

  /**
   * Check if widget is visible
   */
  isVisibleWidget(): boolean {
    return this.data.isVisible;
  }

  /**
   * Get widget settings
   */
  getSettings(): Record<string, unknown> | undefined {
    return this.data.settings;
  }

  /**
   * Resize widget
   */
  resize(size: WidgetSizeType): void {
    this.data.size = size;
    this.data.updatedAt = new Date();
  }

  /**
   * Set widget height
   */
  setHeight(height: WidgetHeightType): void {
    this.data.height = height;
    this.data.updatedAt = new Date();
  }

  /**
   * Reorder widget
   */
  reorder(order: number): void {
    this.data.order = order;
    this.data.updatedAt = new Date();
  }

  /**
   * Show widget
   */
  show(): void {
    this.data.isVisible = true;
    this.data.updatedAt = new Date();
  }

  /**
   * Hide widget
   */
  hide(): void {
    this.data.isVisible = false;
    this.data.updatedAt = new Date();
  }

  /**
   * Update widget settings
   */
  updateSettings(settings: Record<string, unknown>): void {
    this.data.settings = { ...this.data.settings, ...settings };
    this.data.updatedAt = new Date();
  }

  /**
   * Update widget data
   */
  update(updates: Partial<Omit<Widget, "id" | "createdAt">>): void {
    this.data = {
      ...this.data,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * Convert to plain object
   */
  toJSON(): Widget {
    return { ...this.data };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: unknown): WidgetModel {
    const parsed = widgetSchema.parse(data);
    return new WidgetModel(parsed);
  }
}
