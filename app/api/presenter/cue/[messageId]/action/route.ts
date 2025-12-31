import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/cue/${messageId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[API] Failed to perform action:", error);
    return NextResponse.json({ error: "Failed to perform action" }, { status: 500 });
  }
}
