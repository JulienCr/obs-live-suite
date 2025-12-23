import OBSWebSocket from "obs-websocket-js";
import { Logger } from "../../lib/utils/Logger";

const logger = new Logger("OBSHelpers");

/**
 * Update OBS source text and position for poster source display
 * @param obs - OBS WebSocket connection
 * @param sourceText - Text to display (empty string to clear)
 */
export async function updatePosterSourceInOBS(
    obs: OBSWebSocket,
    sourceText: string
): Promise<void> {
    try {
        // 1. Update text content and internal alignment
        // align: "right" makes text grow to the left from its origin
        await obs.call("SetInputSettings", {
            inputName: "source-text",
            inputSettings: {
                text: sourceText,
                align: "right"
            }
        });

        // 2. Position the scene item (Right aligned, 35px from edge)
        const { currentProgramSceneName } = await obs.call("GetCurrentProgramScene");

        // Find the scene item id
        const { sceneItemId } = await obs.call("GetSceneItemId", {
            sceneName: currentProgramSceneName,
            sourceName: "source-text"
        });

        if (sceneItemId) {
            const { baseWidth } = await obs.call("GetVideoSettings");
            const targetX = baseWidth - 35; // 35px from right edge

            // Get current transform to preserve vertical alignment
            const { sceneItemTransform } = await obs.call("GetSceneItemTransform", {
                sceneName: currentProgramSceneName,
                sceneItemId
            });

            // Calculate new alignment: Preserve vertical bits
            // OBS Alignment is:
            // Center: 0
            // Left: 1
            // Right: 2
            // Top: 4
            // Bottom: 8
            // Mask: 0b1100 = 12 (0xC) for vertical (Top|Bottom)
            const currentAlign = sceneItemTransform.alignment as number;

            // Preserve vertical (Top(4) / Bottom(8) / Center(0))
            const verticalPart = currentAlign & 12; // 12 = 4 | 8

            // Force Right (2)
            const newAlign = verticalPart | 2;

            await obs.call("SetSceneItemTransform", {
                sceneName: currentProgramSceneName,
                sceneItemId,
                sceneItemTransform: {
                    positionX: targetX,
                    alignment: newAlign
                }
            });

            logger.debug(`Updated source-text: Right aligned at ${targetX}px`);
        }
    } catch (error) {
        // It's normal to fail if source-text doesn't exist in current scene or at all
        throw error;
    }
}
