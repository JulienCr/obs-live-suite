"use client";

import { useState, useCallback, useRef } from "react";
import { OverlayMotionProvider } from "@/components/overlays/OverlayMotionProvider";
import { WordHarvestDisplay } from "@/components/overlays/WordHarvestDisplay";
import type { HarvestWord, WordHarvestPhase } from "@/lib/models/WordHarvest";

// =============================================================================
// Mock data
// =============================================================================

const MOCK_WORDS: string[] = [
  "Parapluie",
  "Dinosaure",
  "Chocolat",
  "Galaxie",
  "Trampoline",
  "Sorciere",
  "Volcan",
  "Papillon",
  "Astronaute",
  "Banane",
];

function makeMockWord(word: string, index: number, used = false): HarvestWord {
  return {
    id: `mock-${index}`,
    word,
    normalizedWord: word.toLowerCase(),
    submittedBy: `user${index}`,
    displayName: `Viewer${index + 1}`,
    submittedAt: Date.now() - (10 - index) * 1000,
    status: "approved",
    used,
    usedAt: used ? Date.now() : undefined,
  };
}

// =============================================================================
// Dev harness
// =============================================================================

export default function WordHarvestDevPage() {
  const [words, setWords] = useState<HarvestWord[]>([]);
  const [phase, setPhase] = useState<WordHarvestPhase>("idle");
  const [celebrating, setCelebrating] = useState(false);
  const [titleVariant, setTitleVariant] = useState<"intro" | "celebration" | "go" | null>(null);
  const [allUsed, setAllUsed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [targetCount] = useState(10);
  const titleTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  const clearTitle = useCallback((delay = 2500) => {
    clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(() => setTitleVariant(null), delay);
  }, []);

  // --- Actions ---

  const doStartGame = useCallback(() => {
    setWords([]);
    setAllUsed(false);
    setCelebrating(false);
    setPhase("collecting");
    setVisible(true);
    setTitleVariant("intro");
    clearTitle();
  }, [clearTitle]);

  const doAddWord = useCallback(() => {
    setWords((prev) => {
      if (prev.length >= MOCK_WORDS.length) return prev;
      const next = makeMockWord(MOCK_WORDS[prev.length], prev.length);
      return [...prev, next];
    });
  }, []);

  const doAddAllWords = useCallback(() => {
    setWords(MOCK_WORDS.map((w, i) => makeMockWord(w, i)));
  }, []);

  const doMarkNextUsed = useCallback(() => {
    setWords((prev) => {
      const idx = prev.findIndex((w) => !w.used);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = { ...copy[idx], used: true, usedAt: Date.now() };
      return copy;
    });
  }, []);

  const doMarkAllUsed = useCallback(() => {
    setWords((prev) => prev.map((w) => ({ ...w, used: true, usedAt: Date.now() })));
  }, []);

  const doCelebration = useCallback(() => {
    setPhase("complete");
    setCelebrating(true);
    setTitleVariant("celebration");
    clearTitle(3000);
  }, [clearTitle]);

  const doStartPerforming = useCallback(() => {
    setCelebrating(false);
    setPhase("performing");
    setTitleVariant("go");
    clearTitle(2500);
  }, [clearTitle]);

  const doAllWordsUsed = useCallback(() => {
    setPhase("done");
  }, []);

  const doTriggerFinale = useCallback(() => {
    setAllUsed(true);
  }, []);

  const doReset = useCallback(() => {
    setWords([]);
    setPhase("idle");
    setCelebrating(false);
    setTitleVariant(null);
    setAllUsed(false);
    setVisible(false);
    clearTimeout(titleTimer.current);
  }, []);

  // Full scenario: auto-plays the whole sequence
  const doFullScenario = useCallback(async () => {
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

    doReset();
    await wait(300);

    // Start game
    doStartGame();
    await wait(3000);

    // Add words one by one
    for (let i = 0; i < MOCK_WORDS.length; i++) {
      setWords((prev) => [...prev, makeMockWord(MOCK_WORDS[i], i)]);
      await wait(600);
    }
    await wait(500);

    // Celebration
    doCelebration();
    await wait(4000);

    // Start performing
    doStartPerforming();
    await wait(2000);

    // Mark words used one by one
    for (let i = 0; i < MOCK_WORDS.length; i++) {
      setWords((prev) => {
        const copy = [...prev];
        copy[i] = { ...copy[i], used: true, usedAt: Date.now() };
        return copy;
      });
      await wait(800);
    }
    await wait(500);

    // All words used → wait for finale
    doAllWordsUsed();
    await wait(2000);

    // Finale
    doTriggerFinale();
  }, [doReset, doStartGame, doCelebration, doStartPerforming, doAllWordsUsed, doTriggerFinale]);

  // --- Title-only triggers ---
  const showTitle = useCallback(
    (variant: "intro" | "celebration" | "go") => {
      setTitleVariant(variant);
      clearTitle(variant === "celebration" ? 3000 : 2500);
    },
    [clearTitle]
  );

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#1a1a2e", overflow: "hidden", position: "relative" }}>
      {/* Overlay layer */}
      <OverlayMotionProvider>
        {visible && (
          <WordHarvestDisplay
            words={words}
            phase={phase}
            targetCount={targetCount}
            celebrating={celebrating}
            titleVariant={titleVariant}
            allUsed={allUsed}
          />
        )}
      </OverlayMotionProvider>

      {/* Dev control panel */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: 20,
          zIndex: 100,
          background: "rgba(0,0,0,0.85)",
          borderRadius: 12,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxWidth: 340,
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.15)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: "#FFD700" }}>
          Word Harvest Dev Tools
        </div>

        {/* Status */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, opacity: 0.7 }}>
          <span>Phase: <b>{phase}</b></span>
          <span>Words: <b>{words.length}</b></span>
          <span>Used: <b>{words.filter((w) => w.used).length}</b></span>
          <span>Visible: <b>{visible ? "yes" : "no"}</b></span>
          <span>Celebrating: <b>{celebrating ? "yes" : "no"}</b></span>
          <span>AllUsed: <b>{allUsed ? "yes" : "no"}</b></span>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "4px 0" }} />

        {/* Game flow */}
        <div style={{ fontWeight: 600, fontSize: 11, textTransform: "uppercase", opacity: 0.5 }}>Game Flow</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <DevBtn color="#4CAF50" onClick={doStartGame}>Start Game</DevBtn>
          <DevBtn color="#2196F3" onClick={doAddWord}>+ 1 Word</DevBtn>
          <DevBtn color="#2196F3" onClick={doAddAllWords}>+ All Words</DevBtn>
          <DevBtn color="#FF9800" onClick={doCelebration}>Celebration</DevBtn>
          <DevBtn color="#FF5722" onClick={doStartPerforming}>Start Impro</DevBtn>
        </div>

        {/* Word usage */}
        <div style={{ fontWeight: 600, fontSize: 11, textTransform: "uppercase", opacity: 0.5 }}>Word Usage</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <DevBtn color="#9C27B0" onClick={doMarkNextUsed}>Mark Next Used</DevBtn>
          <DevBtn color="#9C27B0" onClick={doMarkAllUsed}>Mark All Used</DevBtn>
          <DevBtn color="#607D8B" onClick={doAllWordsUsed}>All Used (done)</DevBtn>
          <DevBtn color="#E91E63" onClick={doTriggerFinale}>Finale (explode)</DevBtn>
        </div>

        {/* Titles only */}
        <div style={{ fontWeight: 600, fontSize: 11, textTransform: "uppercase", opacity: 0.5 }}>Titles Only</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <DevBtn color="#607D8B" onClick={() => showTitle("intro")}>Intro Title</DevBtn>
          <DevBtn color="#607D8B" onClick={() => showTitle("celebration")}>Celebration Title</DevBtn>
          <DevBtn color="#607D8B" onClick={() => showTitle("go")}>Go! Title</DevBtn>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "4px 0" }} />

        {/* Auto + Reset */}
        <div style={{ display: "flex", gap: 6 }}>
          <DevBtn color="#FFD700" textColor="#000" onClick={doFullScenario}>Full Scenario (auto)</DevBtn>
          <DevBtn color="#555" onClick={doReset}>Reset</DevBtn>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Tiny button component
// =============================================================================

function DevBtn({
  children,
  color,
  textColor = "#fff",
  onClick,
}: {
  children: React.ReactNode;
  color: string;
  textColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: color,
        color: textColor,
        border: "none",
        borderRadius: 6,
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 600,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
