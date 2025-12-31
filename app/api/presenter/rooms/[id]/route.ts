import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await fetch(`${BACKEND_URL}/api/rooms/${id}`);
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[API] Failed to fetch room:", error);
    return NextResponse.json({ error: "Failed to fetch room" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/rooms/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[API] Failed to update room:", error);
    return NextResponse.json({ error: "Failed to update room" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const response = await fetch(`${BACKEND_URL}/api/rooms/${id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[API] Failed to delete room:", error);
    return NextResponse.json({ error: "Failed to delete room" }, { status: 500 });
  }
}
