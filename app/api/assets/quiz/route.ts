import { uploadFile } from "@/lib/utils/fileUpload";
import { IMAGE_TYPES } from "@/lib/filetypes";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[AssetsAPI:Quiz]";

/**
 * POST /api/assets/quiz
 * Upload a quiz image asset (no posters usage)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return ApiResponses.badRequest("No file provided");
  }

  const result = await uploadFile(file, {
    subfolder: "quiz",
    allowedTypes: [...IMAGE_TYPES],
    maxSizeMB: 25,
  });

  return ApiResponses.ok(result);
}, LOG_CONTEXT);


