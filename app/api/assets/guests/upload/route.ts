import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/utils/fileUpload";
import { IMAGE_TYPES } from "@/lib/filetypes";

/**
 * POST /api/assets/guests/upload
 * Upload an avatar image for a guest
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
      subfolder: "guests",
      allowedTypes: [...IMAGE_TYPES],
      maxSizeMB: 5,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload avatar" },
      { status: 500 }
    );
  }
}

