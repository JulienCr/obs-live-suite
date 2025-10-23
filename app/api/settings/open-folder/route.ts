import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { platform } from "os";

const execAsync = promisify(exec);

/**
 * POST /api/settings/open-folder
 * Open file explorer at a given path
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { path } = body;
    
    if (!path) {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 }
      );
    }

    const currentPlatform = platform();
    let command: string;

    switch (currentPlatform) {
      case "win32":
        // Windows: use explorer
        command = `explorer "${path}"`;
        break;
      case "darwin":
        // macOS: use open
        command = `open "${path}"`;
        break;
      case "linux":
        // Linux: use xdg-open
        command = `xdg-open "${path}"`;
        break;
      default:
        return NextResponse.json(
          { error: `Unsupported platform: ${currentPlatform}` },
          { status: 400 }
        );
    }

    await execAsync(command);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to open folder:", error);
    return NextResponse.json(
      { error: "Failed to open folder" },
      { status: 500 }
    );
  }
}
