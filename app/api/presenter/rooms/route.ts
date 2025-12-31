import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/rooms`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[API] Failed to fetch rooms:", error);
    return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[API] Failed to create room:", error);
    return NextResponse.json({ error: "Failed to create room" }, { status: 500 });
  }
}
