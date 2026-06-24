import { z } from "zod";
import { withSimpleErrorHandler, ApiResponses } from "@/lib/utils/ApiResponses";
import { SettingsService } from "@/lib/services/SettingsService";
import { LiveAssistSettingsSchema } from "@/lib/models/LiveAssist";

export const GET = withSimpleErrorHandler(async () => {
  const svc = SettingsService.getInstance();
  return ApiResponses.ok({ settings: svc.getLiveAssistSettings(), devices: svc.getSttDevices() });
}, "[LiveAssistSettingsAPI]");

export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const settings = LiveAssistSettingsSchema.parse(body.settings ?? body);
  SettingsService.getInstance().saveLiveAssistSettings(settings);
  return ApiResponses.ok({ success: true });
}, "[LiveAssistSettingsAPI]");
