import { action } from "@elgato/streamdeck";
import { MediaPlayerBase } from "./media-player-base";
import { generateFadeoutIcon } from "../utils/media-player-icons";

@action({ UUID: "com.julien-cruau.obslive-suite.media-player.fadeout" })
export class MediaPlayerFadeout extends MediaPlayerBase {
	protected override readonly command = "fadeout";
	protected override readonly iconGenerator = generateFadeoutIcon;
}
