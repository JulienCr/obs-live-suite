import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/utils/fileUpload";

/**
 * POST /api/assets/upload
 * Upload a poster file (image or video)
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const result = await uploadFile(file, {
      subfolder: "posters",
      allowedTypes: [
        "image/jpeg",
        "image/jpg",   // Accept both jpg and jpeg
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/webm",
        "video/quicktime",
      ],
      maxSizeMB: 50,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file" },
      { status: 500 }
    );
  }
}

