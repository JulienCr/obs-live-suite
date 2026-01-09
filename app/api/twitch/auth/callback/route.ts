import { NextRequest, NextResponse } from "next/server";
import { TwitchOAuthManager } from "@/lib/services/twitch/TwitchOAuthManager";
import { TwitchOAuthCallbackSchema } from "@/lib/models/TwitchAuth";
import { routing } from "@/i18n/routing";
import { BACKEND_URL } from "@/lib/config/urls";

const LOG_CONTEXT = "[TwitchAuth:Callback]";

/**
 * GET /api/twitch/auth/callback
 * Handles the OAuth callback from Twitch after user authorization.
 * Exchanges the authorization code for access tokens.
 *
 * Query params (from Twitch):
 * - code: Authorization code to exchange for tokens
 * - state: State parameter for CSRF verification
 * - error: Error code if authorization failed
 * - error_description: Human-readable error description
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const params = TwitchOAuthCallbackSchema.safeParse({
      code: searchParams.get("code") || undefined,
      state: searchParams.get("state") || undefined,
      error: searchParams.get("error") || undefined,
      error_description: searchParams.get("error_description") || undefined,
    });

    if (!params.success) {
      console.error(`${LOG_CONTEXT} Invalid callback parameters:`, params.error);
      return redirectWithError(request, "Invalid callback parameters");
    }

    const { code, state, error, error_description } = params.data;

    // Handle Twitch authorization errors
    if (error) {
      console.error(`${LOG_CONTEXT} Twitch authorization error:`, error, error_description);
      return redirectWithError(request, error_description || error);
    }

    // Validate required parameters
    if (!code || !state) {
      console.error(`${LOG_CONTEXT} Missing code or state parameter`);
      return redirectWithError(request, "Missing authorization code or state");
    }

    // Handle the OAuth callback
    const oauthManager = TwitchOAuthManager.getInstance();
    await oauthManager.handleCallback(code, state);

    console.log(`${LOG_CONTEXT} OAuth callback successful`);

    // Notify backend to reload tokens from database
    // This ensures the backend Express process picks up the new tokens
    try {
      await fetch(`${BACKEND_URL}/api/twitch/auth/reload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      console.log(`${LOG_CONTEXT} Backend notified to reload tokens`);
    } catch (backendError) {
      // Don't fail the callback if backend notification fails
      console.warn(`${LOG_CONTEXT} Failed to notify backend:`, backendError);
    }

    // Redirect to settings page with success indicator
    return redirectWithSuccess(request);
  } catch (error) {
    console.error(`${LOG_CONTEXT} OAuth callback failed:`, error);

    const message = error instanceof Error ? error.message : "OAuth callback failed";
    return redirectWithError(request, message);
  }
}

/**
 * Get locale from request or use default
 */
function getLocale(request: NextRequest): string {
  // Try to get locale from cookies (set by next-intl)
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (localeCookie && routing.locales.includes(localeCookie as typeof routing.locales[number])) {
    return localeCookie;
  }

  // Fall back to default locale
  return routing.defaultLocale;
}

/**
 * Get the base URL for redirects
 */
function getBaseUrl(): string {
  // Use NEXT_PUBLIC_APP_URL if set (preferred for custom hostnames like edison)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    // Ensure it has a protocol
    if (appUrl.startsWith("http://") || appUrl.startsWith("https://")) {
      return appUrl;
    }
    return `https://${appUrl}`;
  }

  // Default fallback
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  return `${protocol}://localhost:3000`;
}

/**
 * Redirect to settings page with success indicator
 */
function redirectWithSuccess(request: NextRequest): NextResponse {
  const locale = getLocale(request);
  const baseUrl = getBaseUrl();
  const url = new URL(`/${locale}/settings/twitch`, baseUrl);
  url.searchParams.set("twitch_connected", "true");

  return NextResponse.redirect(url);
}

/**
 * Redirect to settings page with error indicator
 */
function redirectWithError(request: NextRequest, error: string): NextResponse {
  const locale = getLocale(request);
  const baseUrl = getBaseUrl();
  const url = new URL(`/${locale}/settings/twitch`, baseUrl);
  url.searchParams.set("twitch_error", error);

  return NextResponse.redirect(url);
}
