import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[WordHarvestAPI:Unuse]";

export const POST = withErrorHandler<{ wordId: string }>(async (_request, { params }) => {
  const { wordId } = await params;
  return proxyToBackend(`/api/word-harvest/unuse/${wordId}`, {
    method: "POST",
    errorMessage: "Failed to unmark word",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);
