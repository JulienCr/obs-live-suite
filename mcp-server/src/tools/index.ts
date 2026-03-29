import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGuestTools } from './guests.js';
import { registerPosterTools } from './posters.js';
import { registerSubvideoTools } from './subvideos.js';
import { registerLowerThirdTools } from './lower-third.js';
import { registerCountdownTools } from './countdown.js';
import { registerPosterOverlayTools } from './poster-overlay.js';
import { registerChatTools } from './chat.js';
import { registerClearAllTools } from './clear-all.js';
import { registerTextPresetTools } from './text-presets.js';
import { registerSommaireTools } from './sommaire.js';

export function registerAllTools(server: McpServer) {
  registerGuestTools(server);
  registerPosterTools(server);
  registerSubvideoTools(server);
  registerLowerThirdTools(server);
  registerTextPresetTools(server);
  registerCountdownTools(server);
  registerPosterOverlayTools(server);
  registerChatTools(server);
  registerClearAllTools(server);
  registerSommaireTools(server);
}
