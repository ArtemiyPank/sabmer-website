"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useProgressFrame } from "../scene-context";
import {
  CAB_H,
  CAB_X,
  CROSSHEAD_Y,
  CWT_H,
  CWT_X,
  CWT_Z,
  DOOR_Z,
  carY,
  cwtY,
  explosion,
  type Explosion,
  type V3,
} from "../dims";

/**
 * Ties the page text to the machine: every section of the page carries a
 * `data-note` attribute naming the component it belongs to, and this overlay
 * draws a drafting leader from that section to the part itself — the sling,
 * a cab panel, a car door, the counterweight, the car top — re-aimed every
 * frame while the car comes apart.
 *
 * The text stays in the normal page flow (so it scrolls exactly with the
 * finger and several notes share a screen); only the leader lives here. The
 * overlay is one canvas-sized drei <Html>, i.e. its own DOM root inside the
 * aria-hidden backdrop.
 */

type Anchor = {
  /** car-local (or world, for the counterweight) point the leader points at */
  at: V3;
  /** which exploded assembly carries that point; "cwt" rides the counterweight */
  group: "cwt" | Exclude<keyof Explosion, "shoeOut" | "safetyOut">;
};

/** `data-note` value -> the part the note is about */
const ANCHORS: Record<string, Anchor> = {
  hero: { at: [-0.72, CROSSHEAD_Y + 0.1, 0], group: "crosshead" },
  about: { at: [-CAB_X, 1.5, -0.1], group: "wallL" },
  "founder-0": { at: [-0.21, 1.75, DOOR_Z], group: "doorL" },
  "founder-1": { at: [0.21, 1.15, DOOR_Z], group: "doorR" },
  careers: { at: [CWT_X, CWT_H * 0.6, CWT_Z], group: "cwt" },
  contacts: { at: [-0.3, CAB_H + 0.3, 0.3], group: "ceiling" },
};
const NAMES = Object.keys(ANCHORS);

/** world position of the anchored point at progress `p` */
function anchorAt(v: THREE.Vector3, a: Anchor, p: number, e: Explosion) {
  if (a.group === "cwt") {
    v.set(a.at[0], cwtY(p) + a.at[1], a.at[2]);
    return;
  }
  const off = e[a.group];
  v.set(a.at[0] + off[0], carY(p) + a.at[1] + off[1], a.at[2] + off[2]);
}

const STUB = 26; // horizontal run leaving the note before the line turns

export default function NoteLeaders() {
  const invalidate = useThree((s) => s.invalidate);
  const gl = useThree((s) => s.gl);
  const groups = useRef<Array<SVGGElement | null>>([]);
  const paths = useRef<Array<SVGPolylineElement | null>>([]);
  const dots = useRef<Array<SVGCircleElement | null>>([]);
  const notes = useRef<Array<HTMLElement | null>>([]);
  const v = useRef(new THREE.Vector3()).current;
  const canvasBox = useRef({ w: 0, h: 0, top: 0, left: 0 }).current;

  // the notes live in the page, outside this React tree
  useEffect(() => {
    notes.current = NAMES.map((n) => document.querySelector<HTMLElement>(`[data-note="${n}"]`));
    invalidate();
    const id = requestAnimationFrame(invalidate);
    return () => cancelAnimationFrame(id);
  }, [invalidate]);

  // the leaders have to follow the page, not just the scene: the canvas only
  // redraws on demand, so a scroll that does not change progress (rubber band,
  // the last pixels of the page) still needs a frame
  useEffect(() => {
    const onScroll = () => invalidate();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [invalidate]);

  useProgressFrame((p, ex, state) => {
    const { width, height } = state.size;
    if (canvasBox.w !== width || canvasBox.h !== height) {
      const r = gl.domElement.getBoundingClientRect();
      canvasBox.w = width;
      canvasBox.h = height;
      canvasBox.top = r.top;
      canvasBox.left = r.left;
    }
    const e = explosion(p, ex);
    for (let i = 0; i < NAMES.length; i++) {
      const g = groups.current[i];
      const el = notes.current[i];
      if (!g) continue;
      const hide = () => {
        g.style.visibility = "hidden";
      };
      if (!el) {
        hide();
        continue;
      }
      // the note's own scroll fade drives the leader's
      const o = el.style.opacity === "" ? 1 : Number(el.style.opacity);
      const r = el.getBoundingClientRect();
      const y = r.top + r.height / 2 - canvasBox.top;
      if (o < 0.05 || y < -40 || y > height + 40) {
        hide();
        continue;
      }
      anchorAt(v, ANCHORS[NAMES[i]], p, e);
      v.project(state.camera);
      if (v.z > 1) {
        hide();
        continue;
      }
      const ax = (v.x * 0.5 + 0.5) * width;
      const ay = (-v.y * 0.5 + 0.5) * height;
      // leave the note on the side that faces the drawing
      const left = r.left + r.width / 2 - canvasBox.left;
      const fromRight = ax > left;
      const ex0 = (fromRight ? r.right : r.left) - canvasBox.left;
      const stub = ex0 + (fromRight ? STUB : -STUB);
      const path = paths.current[i];
      const dot = dots.current[i];
      g.style.visibility = "visible";
      g.style.opacity = String(o * 0.9);
      if (path) path.setAttribute("points", `${ex0},${y} ${stub},${y} ${ax},${ay}`);
      if (dot) {
        dot.setAttribute("cx", String(ax));
        dot.setAttribute("cy", String(ay));
      }
    }
  });

  return (
    <Html
      fullscreen
      // pin the overlay to the canvas rect instead of a point in the scene
      calculatePosition={(_el, _camera, size) => [size.width / 2, size.height / 2]}
      zIndexRange={[9, 0]}
      pointerEvents="none"
      style={{ pointerEvents: "none" }}
    >
      <svg
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}
      >
        {NAMES.map((n, i) => (
          <g
            key={n}
            style={{ visibility: "hidden" }}
            ref={(el) => {
              groups.current[i] = el;
            }}
          >
            <polyline
              fill="none"
              stroke="var(--bp-line-soft)"
              strokeWidth={1}
              ref={(el) => {
                paths.current[i] = el;
              }}
            />
            <circle
              r={4}
              fill="var(--bp-accent)"
              ref={(el) => {
                dots.current[i] = el;
              }}
            />
          </g>
        ))}
      </svg>
    </Html>
  );
}
