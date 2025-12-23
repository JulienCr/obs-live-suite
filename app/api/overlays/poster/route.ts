import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { enrichPosterPayload } from "@/lib/utils/themeEnrichment";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * POST /api/overlays/poster
 * Control poster overlay (proxies to backend)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    // Enrich poster payloads with theme data before proxying to backend
    let enrichedBody = body;
    if (action === 'show' && payload) {
      const db = DatabaseService.getInstance();
      enrichedBody = {
        ...body,
        payload: enrichPosterPayload(payload, db),
      };
    }

    // Proxy to backend
    const response = await fetch(`${BACKEND_URL}/api/overlays/poster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Next.js Poster API] Backend error:", data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Poster API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to control poster" },
      { status: 500 }
    );
  }
}

