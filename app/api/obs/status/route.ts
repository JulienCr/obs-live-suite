import { createGetProxy } from "@/lib/utils/ProxyHelper";

/**
 * GET /api/obs/status
 * Get current OBS status (proxies to backend)
 */
export const GET = createGetProxy("/api/obs/status", "Failed to get OBS status");

