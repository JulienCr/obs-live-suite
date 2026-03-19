import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[WordHarvestAPI:Use]";

export const POST = withErrorHandler<{ wordId: string }>(async (_request, { params }) => {
  const { wordId } = await params;
  return proxyToBackend(`/api/word-harvest/use/${wordId}`, {
    method: "POST",
    errorMessage: "Failed to mark word as used",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);
