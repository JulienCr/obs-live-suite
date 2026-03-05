import { action } from "@elgato/streamdeck";
import { MediaPlayerBase } from "./media-player-base";
import { generatePrevIcon } from "../utils/media-player-icons";

@action({ UUID: "com.julien-cruau.obslive-suite.media-player.prev" })
export class MediaPlayerPrev extends MediaPlayerBase {
	protected override readonly command = "prev";
	protected override readonly iconGenerator = generatePrevIcon;
}
