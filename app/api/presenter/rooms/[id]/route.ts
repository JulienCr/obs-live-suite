import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/utils/ProxyHelper";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(`/api/rooms/${id}`, {
    errorMessage: "Failed to fetch room",
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  return proxyToBackend(`/api/rooms/${id}`, {
    method: "PUT",
    body,
    errorMessage: "Failed to update room",
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(`/api/rooms/${id}`, {
    method: "DELETE",
    errorMessage: "Failed to delete room",
  });
}
