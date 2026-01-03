import { createGetProxy } from "@/lib/utils/ProxyHelper";

/**
 * GET /api/quiz/state
 * Get current quiz state (proxies to backend)
 */
export const GET = createGetProxy("/api/quiz/state", "Failed to fetch quiz state");

