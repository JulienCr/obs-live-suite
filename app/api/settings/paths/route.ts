import { PathManager } from "@/lib/config/PathManager";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[PathsSettingsAPI]";

/**
 * GET /api/settings/paths
 * Get current data directory and database paths
 */
export const GET = withSimpleErrorHandler(async () => {
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

  return ApiResponses.ok(paths);
}, LOG_CONTEXT);
