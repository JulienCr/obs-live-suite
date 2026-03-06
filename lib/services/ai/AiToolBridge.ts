import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { tool, jsonSchema } from "ai";
import { Logger } from "@/lib/utils/Logger";
import { AI_CHAT } from "@/lib/config/Constants";
import type { ToolSet } from "ai";

const logger = new Logger("AiToolBridge");

let cachedTools: ToolSet | null = null;
let cacheTimestamp = 0;

/**
 * Creates a fresh MCP client+transport for a single request.
 * Required because the MCP server runs in stateless mode
 * (no session persistence between requests).
 */
async function callMcpTool(
  name: string,
  args: Record<string, unknown>
) {
  logger.info(`Calling MCP tool: ${name}`);
  const client = new Client({
    name: "obs-live-suite-ai-chat",
    version: "1.0.0",
  });
  const transport = new StreamableHTTPClientTransport(
    new URL(AI_CHAT.MCP_URL)
  );
  try {
    await client.connect(transport);
    const result = await client.callTool({ name, arguments: args });
    logger.info(`MCP tool ${name} completed`);
    return result.content;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`MCP tool ${name} failed: ${msg}`);
    throw error;
  } finally {
    try {
      await client.close();
    } catch {
      // ignore close errors
    }
  }
}

/**
 * Discovers MCP tools and converts them to AI SDK tool definitions.
 * Destructive tools are returned without an `execute` function,
 * so the client must handle confirmation via addToolOutput().
 */
export async function getAiTools(): Promise<{ aiTools: ToolSet }> {
  const now = Date.now();
  if (cachedTools && now - cacheTimestamp < AI_CHAT.TOOL_CACHE_TTL_MS) {
    return { aiTools: cachedTools };
  }

  try {
    const client = new Client({
      name: "obs-live-suite-ai-chat",
      version: "1.0.0",
    });
    const transport = new StreamableHTTPClientTransport(
      new URL(AI_CHAT.MCP_URL)
    );
    await client.connect(transport);
    const { tools: mcpTools } = await client.listTools();
    await client.close();

    const aiTools: ToolSet = {};
    const destructiveList: readonly string[] = AI_CHAT.DESTRUCTIVE_TOOLS;

    for (const mcpTool of mcpTools) {
      const name = mcpTool.name;
      const isDestructive = destructiveList.includes(name);

      if (isDestructive) {
        aiTools[name] = tool({
          description: mcpTool.description || name,
          inputSchema: jsonSchema(mcpTool.inputSchema as never),
        });
      } else {
        aiTools[name] = tool({
          description: mcpTool.description || name,
          inputSchema: jsonSchema(mcpTool.inputSchema as never),
          execute: async (args: Record<string, unknown>) => {
            return callMcpTool(name, args);
          },
        });
      }
    }

    cachedTools = aiTools;
    cacheTimestamp = now;

    logger.info(`Discovered ${Object.keys(aiTools).length} MCP tools`);
    return { aiTools };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(`MCP connection failed, text-only mode: ${msg}`);
    cachedTools = {};
    cacheTimestamp = now;
    return { aiTools: {} };
  }
}
