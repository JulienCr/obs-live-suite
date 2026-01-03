import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/utils/ProxyHelper";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId } = await params;
  const body = await request.json();
  return proxyToBackend(`/api/cue/${messageId}/action`, {
    method: "POST",
    body,
    errorMessage: "Failed to perform action",
  });
}
