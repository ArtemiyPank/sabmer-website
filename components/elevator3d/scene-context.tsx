"use client";

import { createContext, useContext } from "react";
import { useFrame, type RootState } from "@react-three/fiber";
import type { MotionValue } from "framer-motion";

/**
 * Per-scene settings shared by all part modules. `progress` is a framer
 * MotionValue so scrolling never re-renders React: parts read it inside
 * useFrame and mutate their objects directly.
 */
export type SceneSettings = {
  progress: MotionValue<number>;
  /** exploded-view multiplier: 1 desktop, ~0.35 mobile, 0 = assembled */
  explode: number;
  /** show numbered callouts (desktop only) */
  annotations: boolean;
  /** cheaper rendering: no shadows, fewer segments where it matters */
  mobile: boolean;
  /**
   * How far the doors stand open (1 = fully) for scroll progress p. Set by the
   * camera-tour layout, which shows a working elevator instead of an exploded
   * one; without it the doors follow the exploded view.
   */
  doors?: (p: number) => number;
  /**
   * Remaps scroll progress to travel progress for the moving parts. The
   * camera tour holds the car at the top landing while its doors close, so
   * the machine runs on a different clock than the page.
   */
  travel?: (p: number) => number;
};

const SceneContext = createContext<SceneSettings | null>(null);
export const SceneProvider = SceneContext.Provider;

export function useScene(): SceneSettings {
  const s = useContext(SceneContext);
  if (!s) throw new Error("useScene must be used inside <SceneProvider>");
  return s;
}

/**
 * Runs `cb(p, explode, state, scroll)` on every rendered frame (the canvas
 * renders on demand, i.e. only when progress / theme / size changed). `p` is
 * travel progress — what the machine follows; `scroll` is the raw page
 * progress, which the camera tour and the doors run on. Use it to move and
 * explode objects via refs. `priority` orders callbacks (ascending):
 * parts use the default -1; the camera rig and rope builders use 0 so they
 * run after the objects they follow. drei's <Html> also subscribes at 0, so
 * anything whose screen position it projects must run at -1. Never pass a
 * positive value — R3F would then stop rendering automatically.
 */
export function useProgressFrame(
  cb: (p: number, explode: number, state: RootState, scroll: number) => void,
  priority = -1
) {
  const { progress, explode, travel } = useScene();
  // useFrame keeps the latest callback in its own ref, so no extra ref here
  useFrame((state) => {
    const scroll = progress.get();
    cb(travel ? travel(scroll) : scroll, explode, state, scroll);
  }, priority);
}
