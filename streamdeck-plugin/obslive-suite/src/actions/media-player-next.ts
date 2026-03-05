import { action } from "@elgato/streamdeck";
import { MediaPlayerBase } from "./media-player-base";
import { generateNextIcon } from "../utils/media-player-icons";

@action({ UUID: "com.julien-cruau.obslive-suite.media-player.next" })
export class MediaPlayerNext extends MediaPlayerBase {
	protected override readonly command = "next";
	protected override readonly iconGenerator = generateNextIcon;
}
