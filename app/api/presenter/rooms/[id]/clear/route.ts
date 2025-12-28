import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";

/**
 * DELETE /api/presenter/rooms/[id]/clear
 * Clear all messages from a room
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const response = await fetch(`${BACKEND_URL}/api/cue/${id}/clear`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Clear messages proxy error:", error);
    return NextResponse.json(
      { error: "Failed to clear messages" },
      { status: 500 }
    );
  }
}
