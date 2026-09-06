"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useProgressFrame, useScene } from "../scene-context";
import type { SiteNote, SiteNotes } from "@/lib/site-notes";
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
  stagger,
  type Explosion,
  type V3,
} from "../dims";

/**
 * The page copy written into the machine: every section belongs to one
 * component of the elevator — the sling, a cab panel, a car door, the
 * counterweight, the car top — and a leader line runs from the text to that
 * component and keeps tracking it while the car comes apart.
 *
 * The note itself sits in a fixed, comfortable spot beside the drawing: text
 * that follows a part around the screen ends up small and clipped at the
 * edges. Only the leader and its anchor dot are projected from 3D every
 * frame. Sections cross-fade in the order the parts separate.
 *
 * Everything sits in one canvas-sized drei <Html> overlay (its own DOM root,
 * so plain HTML and SVG render normally) inside the aria-hidden backdrop: the
 * flow sections stay in the page for assistive technology and crawlers.
 */

type Anchor = {
  note: SiteNote;
  /** car-local (or world, for the counterweight) point the leader points at */
  at: V3;
  /** which exploded assembly carries that point; "cwt" rides the counterweight */
  group: "cwt" | Exclude<keyof Explosion, "shoeOut" | "safetyOut">;
  /** progress window: fade in over [0]..[1], fade out over [2]..[3] */
  win: [number, number, number, number];
};

function noteAnchors(n: SiteNotes): Anchor[] {
  const list: Anchor[] = [
    { note: n.hero, at: [-0.72, CROSSHEAD_Y + 0.1, 0], group: "crosshead", win: [0, 0.02, 0.14, 0.17] },
    { note: n.about, at: [-CAB_X, 1.5, -0.1], group: "wallL", win: [0.14, 0.17, 0.32, 0.35] },
  ];
  if (n.founders[0]) {
    list.push({ note: n.founders[0], at: [-0.21, 1.75, DOOR_Z], group: "doorL", win: [0.32, 0.35, 0.5, 0.53] });
  }
  if (n.founders[1]) {
    list.push({ note: n.founders[1], at: [0.21, 1.15, DOOR_Z], group: "doorR", win: [0.5, 0.53, 0.66, 0.69] });
  }
  list.push(
    { note: n.careers, at: [CWT_X, CWT_H * 0.6, CWT_Z], group: "cwt", win: [0.66, 0.69, 0.83, 0.86] },
    // the last note points at the car top, which stays in frame as the camera pulls back
    { note: n.contacts, at: [-0.3, CAB_H + 0.3, 0.3], group: "ceiling", win: [0.83, 0.86, 1.3, 1.4] }
  );
  return list;
}

/** world position of the anchored point at progress `p` */
function anchorAt(v: THREE.Vector3, a: Anchor, p: number, e: Explosion) {
  if (a.group === "cwt") {
    v.set(a.at[0], cwtY(p) + a.at[1], a.at[2]);
    return;
  }
  const off = e[a.group];
  v.set(a.at[0] + off[0], carY(p) + a.at[1] + off[1], a.at[2] + off[2]);
}

/** 0..1 presence of a note: fades in with its part and out as the next arrives */
function presence(p: number, [a, b, c, d]: Anchor["win"]) {
  return stagger(p, a, b) * (1 - stagger(p, c, d));
}

const ACCENT = "var(--bp-accent)";
const LINE = "var(--bp-line)";

export default function Inscribed({ notes }: { notes: SiteNotes }) {
  const { mobile } = useScene();
  const invalidate = useThree((s) => s.invalidate);
  const anchors = useMemo(() => noteAnchors(notes), [notes]);

  const cards = useRef<Array<HTMLDivElement | null>>([]);
  const leaders = useRef<Array<SVGGElement | null>>([]);
  const lines = useRef<Array<SVGLineElement | null>>([]);
  const dots = useRef<Array<SVGCircleElement | null>>([]);
  const v = useRef(new THREE.Vector3()).current;
  const box = useRef({ w: 0, h: 0, edgeX: 0, edgeY: 0 }).current;

  // the canvas renders on demand, so ask for a frame once the portal is up
  useEffect(() => {
    invalidate();
    const id = requestAnimationFrame(invalidate);
    return () => cancelAnimationFrame(id);
  }, [invalidate]);

  useProgressFrame((p, ex, state) => {
    const { width, height } = state.size;
    if (box.w !== width || box.h !== height) {
      box.w = width;
      box.h = height;
      // where the leader leaves the card — kept in step with the CSS below,
      // which parks the card in the margin beside the drawing
      const pad = (mobile ? 0.04 : 0.035) * width;
      const cardW = mobile ? width - 2 * pad : Math.min(0.3 * width, 400);
      box.edgeX = pad + cardW;
      box.edgeY = mobile ? height * 0.62 : height * 0.5;
    }
    const e = explosion(p, ex);
    for (let i = 0; i < anchors.length; i++) {
      const o = presence(p, anchors[i].win);
      const card = cards.current[i];
      if (card) {
        card.style.opacity = String(o);
        card.style.visibility = o < 0.01 ? "hidden" : "visible";
      }
      const leader = leaders.current[i];
      if (!leader) continue;
      leader.style.opacity = String(o);
      if (o < 0.01) {
        leader.style.visibility = "hidden";
        continue;
      }
      leader.style.visibility = "visible";
      anchorAt(v, anchors[i], p, e);
      v.project(state.camera);
      const x = (v.x * 0.5 + 0.5) * width;
      const y = (-v.y * 0.5 + 0.5) * height;
      const line = lines.current[i];
      const dot = dots.current[i];
      if (line) {
        line.setAttribute("x1", String(box.edgeX));
        line.setAttribute("y1", String(box.edgeY));
        line.setAttribute("x2", String(x));
        line.setAttribute("y2", String(y));
      }
      if (dot) {
        dot.setAttribute("cx", String(x));
        dot.setAttribute("cy", String(y));
      }
    }
  });

  const pad = mobile ? "4vw" : "3.5vw";
  const cardStyle: React.CSSProperties = {
    position: "absolute",
    insetInlineStart: pad,
    width: mobile ? `calc(100% - 2 * ${pad})` : "min(30vw, 400px)",
    top: mobile ? "62%" : "50%",
    transform: "translateY(-50%)",
    padding: mobile ? "16px 18px" : "20px 24px",
    background: "color-mix(in srgb, var(--bp-paper) 82%, transparent)",
    borderInlineStart: `3px solid ${ACCENT}`,
    boxShadow: "0 0 0 1px var(--bp-line-soft) inset",
    opacity: 0,
    visibility: "hidden",
    willChange: "opacity",
    pointerEvents: "none",
  };

  return (
    <Html
      fullscreen
      // pin the overlay to the canvas rect instead of a point in the scene
      calculatePosition={(_el, _camera, size) => [size.width / 2, size.height / 2]}
      zIndexRange={[9, 0]}
      pointerEvents="none"
      style={{ pointerEvents: "none" }}
    >
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {/* leaders, drawn under the cards and re-aimed at their part every frame */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          {anchors.map((a, i) => (
            <g
              key={a.note.n}
              style={{ opacity: 0, visibility: "hidden" }}
              ref={(el) => {
                leaders.current[i] = el;
              }}
            >
              <line
                stroke="var(--bp-line-soft)"
                strokeWidth={1}
                ref={(el) => {
                  lines.current[i] = el;
                }}
              />
              <circle
                r={4}
                fill={ACCENT}
                ref={(el) => {
                  dots.current[i] = el;
                }}
              />
            </g>
          ))}
        </svg>

        {anchors.map((a, i) => (
          <div
            key={a.note.n}
            style={cardStyle}
            ref={(el) => {
              cards.current[i] = el;
            }}
          >
            <div
              style={{
                font: "600 11px/1 ui-monospace, SFMono-Regular, monospace",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: ACCENT,
              }}
            >
              {a.note.n} · {a.note.caption ?? "SABMER"}
            </div>
            <div
              style={{
                marginTop: 10,
                font: `700 ${mobile ? 20 : 25}px/1.2 var(--font-rubik), sans-serif`,
                color: LINE,
              }}
            >
              {a.note.title}
            </div>
            {a.note.body && (
              <p style={{ marginTop: 10, font: `${mobile ? 14 : 15}px/1.55 var(--font-rubik), sans-serif`, opacity: 0.88 }}>
                {a.note.body}
              </p>
            )}
            {a.note.items && (
              <ul style={{ marginTop: 10, listStyle: "none", padding: 0 }}>
                {a.note.items.map((it) => (
                  <li key={it} style={{ font: `${mobile ? 14 : 15}px/1.7 var(--font-rubik), sans-serif`, opacity: 0.88 }}>
                    <span style={{ color: ACCENT }}>·</span> {it}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </Html>
  );
}
