"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { OverlayMotionProvider } from "./OverlayMotionProvider";
import { WordHarvestDisplay } from "./WordHarvestDisplay";
import { WordHarvestEventType } from "@/lib/models/WordHarvest";
import type { HarvestWord, WordHarvestEvent } from "@/lib/models/WordHarvest";
import { WORD_HARVEST } from "@/lib/config/Constants";

function playSound(url: string) {
  try {
    new Audio(url).play();
  } catch {
    // Audio may fail in some browser source configs
  }
}

/**
 * WordHarvestRenderer manages WebSocket connection and state for the word harvest overlay.
 * Subscribes to the "word-harvest" channel and delegates rendering to WordHarvestDisplay.
 */
export function WordHarvestRenderer() {
  const [words, setWords] = useState<HarvestWord[]>([]);
  const [visible, setVisible] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [targetCount, setTargetCount] = useState(0);

  const prevPhaseRef = useRef<string>("idle");
  const celebrationTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const sendAckRef = useRef<(eventId: string, success?: boolean) => void>(
    () => {}
  );

  const handleEvent = useCallback((data: WordHarvestEvent) => {
    switch (data.type) {
      case WordHarvestEventType.STATE_UPDATE:
        setWords(data.payload.approvedWords);
        setVisible(data.payload.visible);
        setTargetCount(data.payload.targetCount);
        // Play impro start sound when transitioning to performing phase
        if (prevPhaseRef.current !== "performing" && data.payload.phase === "performing") {
          playSound(WORD_HARVEST.SOUND_IMPRO_START);

        }
        prevPhaseRef.current = data.payload.phase;
        break;

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
        playSound(WORD_HARVEST.SOUND_CELEBRATION);

        if (celebrationTimeout.current) {
          clearTimeout(celebrationTimeout.current);
        }
        celebrationTimeout.current = setTimeout(() => {
          setCelebrating(false);
        }, 5000);
        break;

      case WordHarvestEventType.HIDE:
        setVisible(false);
        break;

      case WordHarvestEventType.RESET:
        setWords([]);
        setVisible(false);
        setCelebrating(false);
        setTargetCount(0);
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
      if (celebrationTimeout.current) {
        clearTimeout(celebrationTimeout.current);
      }
    };
  }, []);

  return (
    <OverlayMotionProvider>
      {visible && (
        <WordHarvestDisplay
          words={words}
          celebrating={celebrating}
          targetCount={targetCount}
        />
      )}
    </OverlayMotionProvider>
  );
}
