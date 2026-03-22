import { uploadFile } from "@/lib/utils/fileUpload";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/aac",
  "audio/flac",
  "audio/x-wav",
];

const LOG_CONTEXT = "[TitleRevealsAPI:UploadSound]";

/**
 * POST /api/assets/title-reveals/upload-sound
 * Upload a sound file for a title reveal
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const formData = await request.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return ApiResponses.badRequest("No file provided");
  }

  const result = await uploadFile(file, {
    subfolder: "title-sounds",
    allowedTypes: [...AUDIO_TYPES],
    maxSizeMB: 20,
  });

  return ApiResponses.ok(result);
}, LOG_CONTEXT);
