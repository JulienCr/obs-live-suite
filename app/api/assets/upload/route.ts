import { uploadFile } from "@/lib/utils/fileUpload";
import { IMAGE_TYPES, VIDEO_TYPES } from "@/lib/filetypes";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[AssetsAPI:Upload]";

/**
 * POST /api/assets/upload
 * Upload a poster file (image or video)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return ApiResponses.badRequest("No file provided");
  }

  const result = await uploadFile(file, {
    subfolder: "posters",
    allowedTypes: [...IMAGE_TYPES, ...VIDEO_TYPES],
    maxSizeMB: 1024,
  });

  return ApiResponses.ok(result);
}, LOG_CONTEXT);

