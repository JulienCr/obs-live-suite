import { uploadFile } from "@/lib/utils/fileUpload";
import { IMAGE_TYPES } from "@/lib/filetypes";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[AssetsAPI:GuestUpload]";

/**
 * POST /api/assets/guests/upload
 * Upload an avatar image for a guest
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return ApiResponses.badRequest("No file provided");
  }

  const result = await uploadFile(file, {
    subfolder: "guests",
    allowedTypes: [...IMAGE_TYPES],
    maxSizeMB: 5,
  });

  return ApiResponses.ok(result);
}, LOG_CONTEXT);

