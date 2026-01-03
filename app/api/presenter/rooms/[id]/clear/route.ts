import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/utils/ProxyHelper";

/**
 * DELETE /api/presenter/rooms/[id]/clear
 * Clear all messages from a room
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(`/api/cue/${id}/clear`, {
    method: "DELETE",
    errorMessage: "Failed to clear messages",
  });
}
