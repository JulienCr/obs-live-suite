import { NextResponse } from "next/server";
import { downloadRemoteToUpload, DownloadError } from "@/lib/utils/downloadToLocal";

/**
 * POST /api/assets/download-upload
 * Downloads a file from an external URL and uploads it to local storage
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    const result = await downloadRemoteToUpload(url);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Download-upload error:", error);

    // DownloadError carries the exact HTTP status to return
    // (400 for bad url/type/size, 408 for timeout)
    if (error instanceof DownloadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download and upload file" },
      { status: 500 }
    );
  }
}
