import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * POST /api/actions/poster/show/[id]
 * Show a poster by ID (Stream Deck compatible)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const db = DatabaseService.getInstance();
    const poster = db.getPosterById(id) as any;

    if (!poster) {
      return NextResponse.json(
        { error: `Poster with ID ${id} not found` },
        { status: 404 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/overlays/poster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'show',
        payload: {
          imageUrl: poster.fileUrl,
          title: poster.title,
        },
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ 
      success: true,
      poster: {
        id: poster.id,
        title: poster.title,
        fileUrl: poster.fileUrl
      }
    });
  } catch (error) {
    console.error("Poster show API error:", error);
    return NextResponse.json(
      { error: "Failed to show poster" },
      { status: 500 }
    );
  }
}

