import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/utils/ProxyHelper";

/**
 * PUT /api/quiz/questions/[id]
 * Update a question (proxies to backend)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  return proxyToBackend(`/api/quiz/questions/${id}`, {
    method: "PUT",
    body,
    errorMessage: "Failed to update question",
  });
}

/**
 * DELETE /api/quiz/questions/[id]
 * Delete a question (proxies to backend)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(`/api/quiz/questions/${id}`, {
    method: "DELETE",
    errorMessage: "Failed to delete question",
  });
}

