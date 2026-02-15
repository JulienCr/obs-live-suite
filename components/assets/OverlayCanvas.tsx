"use client";

import { useState, useRef, useEffect } from "react";
import { ColorScheme, FontConfig, LayoutConfig, LowerThirdAnimationTheme } from "@/lib/models/Theme";
import { Move, Undo, Redo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLayoutHistory } from "./useLayoutHistory";
import { LowerThirdDisplay } from "@/components/overlays/LowerThirdDisplay";
import { CountdownDisplay } from "@/components/overlays/CountdownDisplay";
import { OverlayMotionProvider } from "@/components/overlays/OverlayMotionProvider";

interface OverlayCanvasProps {
  // Lower third props
  lowerThirdColors: ColorScheme;
  lowerThirdFont: FontConfig;
  lowerThirdLayout: LayoutConfig;
  lowerThirdAnimation?: LowerThirdAnimationTheme;
  onLowerThirdLayoutChange: (layout: LayoutConfig) => void;
  
  // Countdown props
  countdownColors: ColorScheme;
  countdownFont: FontConfig;
  countdownStyle: string;
  countdownLayout: LayoutConfig;
  onCountdownLayoutChange: (layout: LayoutConfig) => void;
}

type DragTarget = "lowerThird" | "countdown" | null;

/**
 * Interactive 16:9 canvas for previewing and positioning overlays
 */
export function OverlayCanvas({
  lowerThirdColors,
  lowerThirdFont,
  lowerThirdLayout,
  lowerThirdAnimation,
  onLowerThirdLayoutChange,
  countdownColors,
  countdownFont,
  countdownStyle,
  countdownLayout,
  onCountdownLayoutChange,
}: OverlayCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<DragTarget>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });

  const {
    currentState,
    setState: setHistoryState,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useLayoutHistory({
    lowerThird: lowerThirdLayout,
    countdown: countdownLayout,
  });

  useEffect(() => {
    const updateSize = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const canvasScale = canvasSize.width / 1920;

  const handleMouseDown = (
    e: React.MouseEvent,
    target: DragTarget,
    currentLayout: LayoutConfig
  ) => {
    e.preventDefault();
    setDragging(target);
    
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    
    const scaleX = 1920 / canvasRect.width;
    const scaleY = 1080 / canvasRect.height;
    
    const mouseX = (e.clientX - canvasRect.left) * scaleX;
    const mouseY = (e.clientY - canvasRect.top) * scaleY;
    
    setDragOffset({
      x: mouseX - currentLayout.x,
      y: mouseY - currentLayout.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const scaleX = 1920 / canvasRect.width;
    const scaleY = 1080 / canvasRect.height;

    let newX = (e.clientX - canvasRect.left) * scaleX - dragOffset.x;
    let newY = (e.clientY - canvasRect.top) * scaleY - dragOffset.y;

    newX = Math.max(0, Math.min(1920, newX));
    newY = Math.max(0, Math.min(1080, newY));

    if (dragging === "lowerThird") {
      onLowerThirdLayoutChange({ ...lowerThirdLayout, x: newX, y: newY });
    } else if (dragging === "countdown") {
      onCountdownLayoutChange({ ...countdownLayout, x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    if (dragging) {
      setHistoryState({
        lowerThird: lowerThirdLayout,
        countdown: countdownLayout,
      });
    }
    setDragging(null);
  };

  const handleScaleChange = (target: DragTarget, delta: number) => {
    if (target === "lowerThird") {
      const newScale = Math.max(0.5, Math.min(2, lowerThirdLayout.scale + delta));
      onLowerThirdLayoutChange({ ...lowerThirdLayout, scale: newScale });
      setHistoryState({
        lowerThird: { ...lowerThirdLayout, scale: newScale },
        countdown: countdownLayout,
      });
    } else if (target === "countdown") {
      const newScale = Math.max(0.5, Math.min(2, countdownLayout.scale + delta));
      onCountdownLayoutChange({ ...countdownLayout, scale: newScale });
      setHistoryState({
        lowerThird: lowerThirdLayout,
        countdown: { ...countdownLayout, scale: newScale },
      });
    }
  };

  useEffect(() => {
    if (currentState.lowerThird !== lowerThirdLayout) {
      onLowerThirdLayoutChange(currentState.lowerThird);
    }
    if (currentState.countdown !== countdownLayout) {
      onCountdownLayoutChange(currentState.countdown);
    }
  }, [currentState]);

  const lowerThirdPos = {
    left: (lowerThirdLayout.x / 1920) * 100,
    bottom: ((1080 - lowerThirdLayout.y + 80) / 1080) * 100, // Add ~element height
  };
  
  const countdownPos = {
    left: (countdownLayout.x / 1920) * 100,
    top: (countdownLayout.y / 1080) * 100,
  };

  return (
    <OverlayMotionProvider>
    <div className="space-y-4">
      {/* Undo/Redo Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4 mr-2" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4 mr-2" />
            Redo
          </Button>
          <span className="text-xs text-muted-foreground">
            Ctrl+Z / Ctrl+Y
          </span>
        </div>
        {(canUndo || canRedo) && (
          <span className="text-xs text-muted-foreground">
            {canUndo ? "↩ Changes saved" : ""} {canRedo ? "↪ Can redo" : ""}
          </span>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full bg-gray-900 rounded-lg overflow-hidden cursor-crosshair"
        style={{ aspectRatio: "16 / 9" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute inset-0" style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "10% 10%"
          }} />
        </div>

        {/* Center guides */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-500/30 pointer-events-none" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-500/30 pointer-events-none" />

        {/* Lower Third */}
        <div
          className={`absolute group ${dragging === "lowerThird" ? "z-50" : "z-10"}`}
          style={{
            left: `${lowerThirdPos.left}%`,
            bottom: `${lowerThirdPos.bottom}%`,
          }}
        >
          <div
            className="relative cursor-move"
            onMouseDown={(e) => handleMouseDown(e, "lowerThird", lowerThirdLayout)}
            style={{
              transform: `scale(${lowerThirdLayout.scale * canvasScale})`,
              transformOrigin: "bottom left",
            }}
          >
            <LowerThirdDisplay
              title="John Doe"
              subtitle="Software Engineer"
              avatarImage="https://ui-avatars.com/api/?name=JD&background=60A5FA&color=fff&size=128"
              theme={{
                colors: lowerThirdColors,
                font: lowerThirdFont,
                layout: lowerThirdLayout,
                lowerThirdAnimation: lowerThirdAnimation,
              }}
              animating={true}
              isPreview={true}
            />

            {/* Controls */}
            <div className="absolute -top-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/80 rounded px-2 py-1 text-xs text-white">
              <Move className="w-3 h-3" />
              <span>Lower Third</span>
              <button
                className="ml-2 px-1 hover:bg-white/20 rounded"
                onClick={(e) => { e.stopPropagation(); handleScaleChange("lowerThird", -0.1); }}
              >
                -
              </button>
              <span>{(lowerThirdLayout.scale * 100).toFixed(0)}%</span>
              <button
                className="px-1 hover:bg-white/20 rounded"
                onClick={(e) => { e.stopPropagation(); handleScaleChange("lowerThird", 0.1); }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Countdown */}
        <div
          className={`absolute group ${dragging === "countdown" ? "z-50" : "z-10"}`}
          style={{
            left: `${countdownPos.left}%`,
            top: `${countdownPos.top}%`,
          }}
        >
          <div
            className="relative cursor-move"
            onMouseDown={(e) => handleMouseDown(e, "countdown", countdownLayout)}
            style={{
              transform: `translate(-50%, -50%) scale(${countdownLayout.scale * canvasScale})`,
              transformOrigin: "center",
            }}
          >
            <CountdownDisplay
              seconds={300}
              style={countdownStyle as "bold" | "corner" | "banner"}
              theme={{
                colors: countdownColors,
                font: countdownFont,
                layout: countdownLayout,
              }}
              isPreview={true}
            />

            {/* Controls */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/80 rounded px-2 py-1 text-xs text-white whitespace-nowrap">
              <Move className="w-3 h-3" />
              <span>Countdown</span>
              <button
                className="ml-2 px-1 hover:bg-white/20 rounded"
                onClick={(e) => { e.stopPropagation(); handleScaleChange("countdown", -0.1); }}
              >
                -
              </button>
              <span>{(countdownLayout.scale * 100).toFixed(0)}%</span>
              <button
                className="px-1 hover:bg-white/20 rounded"
                onClick={(e) => { e.stopPropagation(); handleScaleChange("countdown", 0.1); }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Position info */}
        <div className="absolute bottom-2 left-2 bg-black/80 rounded px-2 py-1 text-xs text-white font-mono">
          1920x1080
        </div>
      </div>

      {/* Coordinates display */}
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="bg-muted rounded p-3 space-y-1">
          <div className="font-semibold">Lower Third Position</div>
          <div className="font-mono">X: {Math.round(lowerThirdLayout.x)}px</div>
          <div className="font-mono">Y: {Math.round(lowerThirdLayout.y)}px</div>
          <div className="font-mono">Scale: {(lowerThirdLayout.scale * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-muted rounded p-3 space-y-1">
          <div className="font-semibold">Countdown Position</div>
          <div className="font-mono">X: {Math.round(countdownLayout.x)}px</div>
          <div className="font-mono">Y: {Math.round(countdownLayout.y)}px</div>
          <div className="font-mono">Scale: {(countdownLayout.scale * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
    </OverlayMotionProvider>
  );
}
