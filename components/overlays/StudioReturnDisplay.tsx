"use client";

import { motion } from "framer-motion";

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

export type Severity = "info" | "warn" | "urgent";

export interface StudioReturnContent {
  title: string;
  body: string;
  severity: Severity;
  type: "notification" | "countdown";
}

interface StudioReturnDisplayProps {
  title: string;
  body: string;
  severity: Severity;
  type: "notification" | "countdown";
  fontSize?: number;
}

// ------------------------------------------------------------------
// Severity colors (matching the original CSS)
// ------------------------------------------------------------------

const SEVERITY_COLORS: Record<Severity, string> = {
  info: "#3b82f6",
  warn: "#f59e0b",
  urgent: "#ef4444",
};

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------

export function StudioReturnDisplay({
  title,
  body,
  severity,
  fontSize = 80,
}: StudioReturnDisplayProps) {
  const accentColor = SEVERITY_COLORS[severity];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <motion.div
        animate={
          severity === "urgent"
            ? {
                borderColor: [accentColor, "#ff6b6b", accentColor],
                boxShadow: [
                  `0 0 60px rgba(239, 68, 68, 0.3)`,
                  `0 0 80px rgba(239, 68, 68, 0.6)`,
                  `0 0 60px rgba(239, 68, 68, 0.3)`,
                ],
              }
            : undefined
        }
        transition={
          severity === "urgent"
            ? { duration: 1, ease: "easeInOut", repeat: Infinity }
            : undefined
        }
        style={{
          background: "rgba(0, 0, 0, 0.75)",
          borderRadius: 24,
          padding: "48px 64px",
          maxWidth: "85vw",
          maxHeight: "80vh",
          textAlign: "center",
          border: `4px solid ${accentColor}`,
          boxShadow: "0 0 60px rgba(0, 0, 0, 0.5)",
        }}
      >
        {title && (
          <div
            style={{
              color: accentColor,
              fontSize: fontSize * 0.6,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 16,
              fontFamily: "'Segoe UI', Arial, sans-serif",
            }}
          >
            {title}
          </div>
        )}
        <div
          style={{
            color: "#ffffff",
            fontSize,
            fontWeight: 600,
            lineHeight: 1.2,
            wordBreak: "break-word",
            fontFamily: "'Segoe UI', Arial, sans-serif",
          }}
        >
          {body}
        </div>
      </motion.div>
    </motion.div>
  );
}
