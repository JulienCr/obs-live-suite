import { NextRequest } from "next/server";
import { createGetProxy, createPostProxy } from "@/lib/utils/ProxyHelper";

export const GET = createGetProxy("/api/rooms", "Failed to fetch rooms");

const proxyPost = createPostProxy("/api/rooms", "Failed to create room");

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyPost(body);
}
