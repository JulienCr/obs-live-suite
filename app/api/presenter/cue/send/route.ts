import { NextRequest } from "next/server";
import { createPostProxy } from "@/lib/utils/ProxyHelper";

const proxyPost = createPostProxy("/api/cue/send", "Failed to send cue");

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyPost(body);
}
