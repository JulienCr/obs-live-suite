"use client";

import { LazyMotion, domAnimation } from "framer-motion";

/**
 * Lightweight Framer Motion provider for overlay pages.
 * Uses LazyMotion with domAnimation to tree-shake unused features
 * and keep the bundle size minimal for OBS browser sources.
 */
export function OverlayMotionProvider({ children }: { children: React.ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
