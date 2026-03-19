import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[WordHarvestAPI:Approve]";

export const POST = withErrorHandler<{ wordId: string }>(async (_request, { params }) => {
  const { wordId } = await params;
  return proxyToBackend(`/api/word-harvest/approve/${wordId}`, {
    method: "POST",
    errorMessage: "Failed to approve word",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);
