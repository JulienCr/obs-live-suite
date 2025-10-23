import { NextResponse } from "next/server";
import { PathManager } from "@/lib/config/PathManager";

/**
 * GET /api/settings/paths
 * Get current data directory and database paths
 */
export async function GET() {
  try {
    const pathManager = PathManager.getInstance();
    
    const paths = {
      dataDir: pathManager.getDataDir(),
      databasePath: pathManager.getDatabasePath(),
      profilesDir: pathManager.getProfilesDir(),
      assetsDir: pathManager.getAssetsDir(),
      postersDir: pathManager.getPostersDir(),
      avatarsDir: pathManager.getAvatarsDir(),
      logsDir: pathManager.getLogsDir(),
      backupsDir: pathManager.getBackupsDir(),
      quizDir: pathManager.getQuizDir(),
    };
    
    return NextResponse.json(paths);
  } catch (error) {
    console.error("Failed to get paths:", error);
    return NextResponse.json(
      { error: "Failed to get paths" },
      { status: 500 }
    );
  }
}
