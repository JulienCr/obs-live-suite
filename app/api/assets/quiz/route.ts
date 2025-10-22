import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/utils/fileUpload";

/**
 * POST /api/assets/quiz
 * Upload a quiz image asset (no posters usage)
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const result = await uploadFile(file, {
      subfolder: "quiz",
      allowedTypes: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ],
      maxSizeMB: 25,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Quiz upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload file" },
      { status: 500 }
    );
  }
}


