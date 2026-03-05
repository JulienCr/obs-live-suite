import { action } from "@elgato/streamdeck";
import { MediaPlayerBase } from "./media-player-base";
import { generateStopIcon } from "../utils/media-player-icons";

@action({ UUID: "com.julien-cruau.obslive-suite.media-player.stop" })
export class MediaPlayerStop extends MediaPlayerBase {
	protected override readonly command = "stop";
	protected override readonly iconGenerator = generateStopIcon;
}
