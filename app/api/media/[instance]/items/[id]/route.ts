import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * PATCH /api/media/:instance/items/:id
 * Update media item (proxies to backend)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ instance: string; id: string }> }
) {
  try {
    const { instance, id } = await params;
    const body = await request.json();
    console.log(`[Media Proxy] Updating item ${id} in instance ${instance}`);

    const response = await fetch(`${BACKEND_URL}/api/media/${instance}/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Media Proxy] Backend error:`, response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Media update item API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to update media item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media/:instance/items/:id
 * Delete media item (proxies to backend)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ instance: string; id: string }> }
) {
  try {
    const { instance, id } = await params;
    console.log(`[Media Proxy] Deleting item ${id} from instance ${instance}`);

    const response = await fetch(`${BACKEND_URL}/api/media/${instance}/items/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Media Proxy] Backend error:`, response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Media delete item API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to delete media item" },
      { status: 500 }
    );
  }
}
