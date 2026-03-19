"use client";

import { type IDockviewPanelProps } from "dockview-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Play, Square, Check, X, Eye, EyeOff, RotateCcw, PartyPopper } from "lucide-react";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import { useWordHarvestMidi, type MidiEventName } from "@/hooks/useWordHarvestMidi";

const config: PanelConfig = { id: "wordHarvest", context: "dashboard" };

const API_BASE = "/api/word-harvest";

type Phase = "idle" | "collecting" | "complete" | "performing" | "done";

interface HarvestWordData {
  id: string;
  word: string;
  displayName: string;
  used: boolean;
  status: string;
}

interface WordHarvestState {
  phase: Phase;
  targetCount: number;
  pendingWords: HarvestWordData[];
  approvedWords: HarvestWordData[];
  visible: boolean;
}

const PHASE_COLORS: Record<Phase, string> = {
  idle: "bg-gray-500",
  collecting: "bg-blue-500",
  complete: "bg-green-500",
  performing: "bg-orange-500",
  done: "bg-green-500",
};

const PHASE_LABELS: Record<Phase, string> = {
  idle: "En attente",
  collecting: "Collecte",
  complete: "Complet",
  performing: "Performance",
  done: "Termine",
};

const DEFAULT_STATE: WordHarvestState = {
  phase: "idle",
  targetCount: 10,
  pendingWords: [],
  approvedWords: [],
  visible: false,
};

/** Map WebSocket event types to MIDI event names */
const WS_TO_MIDI: Record<string, MidiEventName> = {
  "word-approved": "wordApproved",
  "word-used": "wordUsed",
  "celebration": "celebration",
  "start-performing": "improStart",
};

export function WordHarvestPanel(_props: IDockviewPanelProps) {
  const [state, setState] = useState<WordHarvestState>(DEFAULT_STATE);
  const [targetCount, setTargetCount] = useState(10);
  const { sendMidiEvent } = useWordHarvestMidi();
  const prevPhaseRef = useRef<Phase>("idle");

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/state`);
      if (res.ok) {
        const data = await res.json();
        // Detect phase transition to "performing" for impro start MIDI
        if (prevPhaseRef.current !== "performing" && data.phase === "performing") {
          sendMidiEvent("improStart");
        }
        prevPhaseRef.current = data.phase;
        setState(data);
        if (data.targetCount) {
          setTargetCount(data.targetCount);
        }
      }
    } catch (error) {
      console.error("Error fetching word harvest state:", error);
    }
  }, [sendMidiEvent]);

  const handleWsEvent = useCallback((data: { type: string }) => {
    // Send MIDI for matching event types
    const midiEvent = WS_TO_MIDI[data.type];
    if (midiEvent) {
      sendMidiEvent(midiEvent);
    }
    // Always re-fetch state
    fetchState();
  }, [fetchState, sendMidiEvent]);

  useWebSocketChannel("word-harvest", handleWsEvent);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleStart = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCount }),
      });
    } catch (error) {
      console.error("Error starting word harvest:", error);
    }
  }, [targetCount]);

  const handleStop = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/stop`, { method: "POST" });
    } catch (error) {
      console.error("Error stopping word harvest:", error);
    }
  }, []);

  const handleReset = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/reset`, { method: "POST" });
    } catch (error) {
      console.error("Error resetting word harvest:", error);
    }
  }, []);

  const handleApprove = useCallback(async (wordId: string) => {
    try {
      await fetch(`${API_BASE}/approve/${wordId}`, { method: "POST" });
    } catch (error) {
      console.error("Error approving word:", error);
    }
  }, []);

  const handleReject = useCallback(async (wordId: string) => {
    try {
      await fetch(`${API_BASE}/reject/${wordId}`, { method: "POST" });
    } catch (error) {
      console.error("Error rejecting word:", error);
    }
  }, []);

  const handleToggleUsed = useCallback(async (word: HarvestWordData) => {
    const endpoint = word.used ? "unuse" : "use";
    try {
      await fetch(`${API_BASE}/${endpoint}/${word.id}`, { method: "POST" });
    } catch (error) {
      console.error("Error toggling word used state:", error);
    }
  }, []);

  const handleStartPerforming = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/start-performing`, { method: "POST" });
    } catch (error) {
      console.error("Error starting improv:", error);
    }
  }, []);

  const handleFinale = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/finale`, { method: "POST" });
    } catch (error) {
      console.error("Error triggering finale:", error);
    }
  }, []);

  const handleShowOverlay = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/show`, { method: "POST" });
    } catch (error) {
      console.error("Error showing overlay:", error);
    }
  }, []);

  const handleHideOverlay = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/hide`, { method: "POST" });
    } catch (error) {
      console.error("Error hiding overlay:", error);
    }
  }, []);

  const usedCount = state.approvedWords.filter((w) => w.used).length;
  const totalApproved = state.approvedWords.length;
  const isIdle = state.phase === "idle";

  return (
    <BasePanelWrapper config={config}>
      <div className="space-y-4">
        {/* Header: Phase badge + Start/Stop */}
        <div className="flex items-center justify-between">
          <Badge className={`${PHASE_COLORS[state.phase]} text-white`}>
            {PHASE_LABELS[state.phase]}
          </Badge>
          {isIdle ? (
            <Button variant="default" size="sm" onClick={handleStart}>
              <Play className="w-4 h-4 mr-2" />
              Demarrer
            </Button>
          ) : (
            <Button variant="destructive" size="sm" onClick={handleStop}>
              <Square className="w-4 h-4 mr-2" />
              Arreter
            </Button>
          )}
        </div>

        {/* Config: Target word count */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Nombre de mots cible</label>
          <Input
            type="number"
            min={3}
            max={50}
            value={targetCount}
            onChange={(e) => setTargetCount(Math.max(3, Math.min(50, parseInt(e.target.value) || 10)))}
            disabled={!isIdle}
          />
        </div>

        {/* Pending words queue (collecting phase) */}
        {state.phase === "collecting" && state.pendingWords.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Mots en attente ({state.pendingWords.length})
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {state.pendingWords.map((word) => (
                <div
                  key={word.id}
                  className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
                >
                  <div>
                    <span className="font-medium">{word.word}</span>
                    <span className="ml-2 text-muted-foreground text-xs">
                      {word.displayName}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-green-600 hover:text-green-700"
                      onClick={() => handleApprove(word.id)}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600 hover:text-red-700"
                      onClick={() => handleReject(word.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved words list */}
        {totalApproved > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">
              Mots approuves — {usedCount}/{totalApproved} mots utilises
            </h4>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {state.approvedWords.map((word, index) => (
                <button
                  key={word.id}
                  type="button"
                  className={`w-full text-left rounded-md border px-3 py-1.5 text-sm cursor-pointer transition-colors hover:bg-accent ${
                    word.used ? "line-through text-muted-foreground" : ""
                  }`}
                  onClick={() => handleToggleUsed(word)}
                >
                  <span className="font-mono mr-2 text-muted-foreground">
                    {index + 1}.
                  </span>
                  {word.word}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Start improv button (complete phase) */}
        {state.phase === "complete" && (
          <Button
            variant="default"
            size="sm"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            onClick={handleStartPerforming}
          >
            <Play className="w-4 h-4 mr-2" />
            Lancer l&apos;impro !
          </Button>
        )}

        {/* Trigger finale button (done phase — all words used, regie decides when) */}
        {state.phase === "done" && (
          <Button
            variant="default"
            size="sm"
            className="w-full bg-pink-600 hover:bg-pink-700 text-white"
            onClick={handleFinale}
          >
            <PartyPopper className="w-4 h-4 mr-2" />
            Lancer le final !
          </Button>
        )}

        {/* Footer: Overlay toggle + Reset */}
        <div className="flex gap-2 pt-2 border-t">
          {state.visible ? (
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={handleHideOverlay}
            >
              <EyeOff className="w-4 h-4 mr-2" />
              Masquer overlay
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleShowOverlay}
            >
              <Eye className="w-4 h-4 mr-2" />
              Afficher overlay
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </BasePanelWrapper>
  );
}
