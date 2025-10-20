import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to ensure server is initialized
 */
export function middleware(request: NextRequest) {
  // Initialize server on first API request
  if (request.nextUrl.pathname.startsWith("/api") && 
      !request.nextUrl.pathname.includes("/api/init")) {
    // Server init will happen in API routes via singleton pattern
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};

