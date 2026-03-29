"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { OverlayMotionProvider } from "./OverlayMotionProvider";
import { WordHarvestDisplay } from "./WordHarvestDisplay";
import { WordHarvestEventType } from "@/lib/models/WordHarvest";
import type {
  HarvestWord,
  WordHarvestEvent,
  WordHarvestPhase,
} from "@/lib/models/WordHarvest";
import { WORD_HARVEST } from "@/lib/config/Constants";
import { playSound } from "@/lib/utils/audioPlayer";

/**
 * WordHarvestRenderer manages WebSocket connection and state for the word harvest overlay.
 * Subscribes to the "word-harvest" channel and delegates rendering to WordHarvestDisplay.
 */
export function WordHarvestRenderer() {
  const [words, setWords] = useState<HarvestWord[]>([]);
  const [visible, setVisible] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [targetCount, setTargetCount] = useState(0);
  const [phase, setPhase] = useState<WordHarvestPhase>("idle");
  const [showTitle, setShowTitle] = useState<"intro" | "celebration" | "go" | null>(null);
  const [allUsed, setAllUsed] = useState(false);

  const prevPhaseRef = useRef<WordHarvestPhase>("idle");
  const titleTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const goTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const fadeoutTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const sendAckRef = useRef<(eventId: string, success?: boolean) => void>(
    () => {}
  );

  const handleEvent = useCallback((data: WordHarvestEvent) => {
    switch (data.type) {
      case WordHarvestEventType.STATE_UPDATE: {
        setWords(data.payload.approvedWords);
        setVisible(data.payload.visible);
        setTargetCount(data.payload.targetCount);
        setPhase(data.payload.phase);

        // Show intro title when transitioning to collecting
        if (
          prevPhaseRef.current === "idle" &&
          data.payload.phase === "collecting"
        ) {
          setShowTitle("intro");
          titleTimeout.current = setTimeout(() => {
            setShowTitle(null);
          }, 2500);
        }

        prevPhaseRef.current = data.payload.phase;
        break;
      }

      case WordHarvestEventType.WORD_APPROVED:
        setWords(data.payload.approvedWords);
        setTargetCount(data.payload.targetCount);
        playSound(WORD_HARVEST.SOUND_WORD_APPROVED);
        break;

      case WordHarvestEventType.WORD_USED:
        setWords((prev) =>
          prev.map((w) =>
            w.id === data.payload.wordId
              ? { ...w, used: data.payload.used }
              : w
          )
        );
        playSound(WORD_HARVEST.SOUND_WORD_USED);
        break;

      case WordHarvestEventType.WORD_UNUSED:
        setWords((prev) =>
          prev.map((w) =>
            w.id === data.payload.wordId
              ? { ...w, used: data.payload.used }
              : w
          )
        );
        break;

      case WordHarvestEventType.CELEBRATION:
        setCelebrating(true);
        setTargetCount(data.payload.targetCount);
        setPhase("complete");
        playSound(WORD_HARVEST.SOUND_CELEBRATION);

        // Show celebration title, then clear after 3s (breathing continues)
        setShowTitle("celebration");
        titleTimeout.current = setTimeout(() => {
          setShowTitle(null);
        }, 3000);
        break;

      case WordHarvestEventType.START_PERFORMING:
        setCelebrating(false);
        setPhase("performing");
        setShowTitle("go");
        playSound(WORD_HARVEST.SOUND_IMPRO_START);

        goTimeout.current = setTimeout(() => {
          setShowTitle(null);
        }, 2500);
        break;

      case WordHarvestEventType.ALL_USED:
        setAllUsed(true);
        setPhase("done");

        // Fade out overlay after explosion + confetti settle
        fadeoutTimeout.current = setTimeout(() => {
          setVisible(false);
        }, 5500);
        break;

      case WordHarvestEventType.HIDE:
        setVisible(false);
        break;

      case WordHarvestEventType.RESET:
        setWords([]);
        setVisible(false);
        setCelebrating(false);
        setAllUsed(false);
        setTargetCount(0);
        setPhase("idle");
        setShowTitle(null);
        break;
    }

    sendAckRef.current(data.id);
  }, []);

  const { sendAck } = useWebSocketChannel<WordHarvestEvent>(
    "word-harvest",
    handleEvent,
    { logPrefix: "WordHarvest" }
  );

  sendAckRef.current = sendAck;

  useEffect(() => {
    return () => {
      if (titleTimeout.current) clearTimeout(titleTimeout.current);
      if (goTimeout.current) clearTimeout(goTimeout.current);
      if (fadeoutTimeout.current) clearTimeout(fadeoutTimeout.current);
    };
  }, []);

  return (
    <OverlayMotionProvider>
      {visible && (
        <WordHarvestDisplay
          words={words}
          phase={phase}
          targetCount={targetCount}
          celebrating={celebrating}
          titleVariant={showTitle}
          allUsed={allUsed}
        />
      )}
    </OverlayMotionProvider>
  );
}
