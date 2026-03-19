import { uploadFile } from "@/lib/utils/fileUpload";
import { IMAGE_TYPES } from "@/lib/filetypes";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TitleRevealsAPI:UploadLogo]";

/**
 * POST /api/assets/title-reveals/upload-logo
 * Upload a logo image for a title reveal
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return ApiResponses.badRequest("No file provided");
  }

  const result = await uploadFile(file, {
    subfolder: "title-logos",
    allowedTypes: [...IMAGE_TYPES],
    maxSizeMB: 10,
  });

  return ApiResponses.ok(result);
}, LOG_CONTEXT);
