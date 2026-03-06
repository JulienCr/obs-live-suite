import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { createAiModel } from "@/lib/services/ai/AiProviderFactory";
import { getAiTools } from "@/lib/services/ai/AiToolBridge";
import { SYSTEM_PROMPT } from "@/lib/services/ai/systemPrompt";
import { AI_CHAT } from "@/lib/config/Constants";
import { Logger } from "@/lib/utils/Logger";

const logger = new Logger("AiChatAPI");

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const model = createAiModel();
    const { aiTools } = await getAiTools();

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
      tools: aiTools,
      stopWhen: stepCountIs(AI_CHAT.MAX_STEPS),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    logger.error(`AI chat error: ${message}`);

    if (
      message.includes("not configured") ||
      message.includes("API key")
    ) {
      return Response.json(
        {
          error:
            "LLM provider is not configured. Please configure it in Settings > AI.",
        },
        { status: 422 }
      );
    }

    return Response.json(
      { error: `AI chat error: ${message}` },
      { status: 500 }
    );
  }
}
