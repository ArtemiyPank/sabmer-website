"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useProgressFrame, useScene } from "../scene-context";
import {
  BED_X,
  BED_Y,
  BED_Z,
  BUFFER_TOP,
  CABINET,
  CAB_FRONT,
  CAB_H,
  CAR_BUFFER_X,
  CROSSHEAD_Y,
  CWT_H,
  CWT_RAIL_X,
  CWT_RAIL_Z,
  CWT_X,
  CWT_Z,
  DOOR_H,
  DOOR_W,
  DOOR_Z,
  GOV_TENSION_Y,
  GOV_X,
  GOV_Y,
  GOV_Z,
  HITCH_CAR_X,
  HITCH_Y,
  LDOOR_PANEL_Z,
  LEVELS,
  LEVEL_LABELS,
  MOTOR_Z,
  PLANK_Y,
  PULLEY_X,
  PULLEY_Y,
  RAIL_X,
  ROPE_Z,
  SHAFT_FRONT,
  SHEAVE_C,
  SHOE_Y_TOP,
  TCABLE_CAR,
  W_LABELS,
  type Explosion,
  carY,
  cwtY,
  explosion,
  stagger,
  type V3,
} from "../dims";

/**
 * Drawing-style numbered callouts over the 3D scene (desktop only) plus the
 * static level datum marks. Everything is a drei <Html> overlay: no meshes,
 * no pointer events. The callouts fade in with the exploded view and the
 * ones anchored to moving parts are re-positioned every frame from refs, so
 * scrolling never re-renders React.
 */

type Side = "left" | "right";

// left/top pin the wrapper's static position: without them an RTL containing
// block (the Hebrew locale) offsets every callout by its own width
const HTML_STYLE: React.CSSProperties = { pointerEvents: "none", left: 0, top: 0 };

const LINE = "var(--bp-line)";
const ACCENT = "var(--bp-accent)";

/** one balloon with its leader line, drawn as an inline SVG centred on the anchor */
function Callout({
  n,
  text,
  side = "right",
  dy = 0,
  opacity,
  innerRef,
}: {
  n: number;
  text: string;
  side?: Side;
  /** pixel shift of the balloon and its text, to keep neighbouring callouts apart */
  dy?: number;
  opacity: number;
  innerRef?: React.Ref<HTMLDivElement>;
}) {
  const w = 210;
  const h = 60;
  const s = side === "right" ? 1 : -1;
  const cx = w / 2;
  const cy = h / 2;
  // anchor -> diagonal -> horizontal -> balloon -> text
  const elbowX = cx + s * 30;
  const elbowY = cy - 24 + dy;
  const ballX = cx + s * 56;
  return (
    <div
      ref={innerRef}
      style={{
        opacity,
        visibility: opacity < 0.01 ? "hidden" : "visible",
        pointerEvents: "none",
        willChange: "opacity",
        // the drawing is always laid out left to right, also on the RTL locale
        direction: "ltr",
      }}
    >
      <svg width={w} height={h} style={{ display: "block", overflow: "visible" }} aria-hidden="true">
        <circle cx={cx} cy={cy} r={2.5} fill={ACCENT} />
        <path
          d={`M ${cx} ${cy} L ${elbowX} ${elbowY} L ${ballX - s * 9} ${elbowY}`}
          fill="none"
          stroke={LINE}
          strokeWidth={1}
          opacity={0.8}
        />
        <circle cx={ballX} cy={elbowY} r={9} fill="none" stroke={ACCENT} strokeWidth={1.5} />
        <text
          x={ballX}
          y={elbowY + 3.5}
          fill={ACCENT}
          fontSize={9}
          fontFamily="ui-monospace, SFMono-Regular, monospace"
          textAnchor="middle"
        >
          {n}
        </text>
        <text
          x={ballX + s * 15}
          y={elbowY + 3.5}
          fill={LINE}
          fontSize={11}
          letterSpacing="0.08em"
          fontFamily="ui-monospace, SFMono-Regular, monospace"
          textAnchor={side === "right" ? "start" : "end"}
        >
          {text}
        </text>
      </svg>
    </div>
  );
}

/** static callouts (world coordinates) */
const STATIC: Array<{ n: number; text: string; at: V3; side: Side; dy?: number }> = [
  { n: 1, text: "TRACTION MACHINE", at: [SHEAVE_C[0], SHEAVE_C[1] + 0.35, MOTOR_Z[0]], side: "right" },
  { n: 2, text: "MACHINE BEDPLATE", at: [BED_X[0] + 0.2, BED_Y[1], BED_Z[1]], side: "left", dy: -30 },
  { n: 3, text: "ROPE HITCH (2:1)", at: [HITCH_CAR_X, HITCH_Y + 0.15, ROPE_Z], side: "left", dy: 34 },
  { n: 4, text: "OVERSPEED GOVERNOR", at: [GOV_X, GOV_Y + 0.2, GOV_Z], side: "left" },
  { n: 5, text: "CAR GUIDE RAIL T89", at: [-RAIL_X - 0.05, 7.0, 0], side: "left" },
  { n: 6, text: "CWT GUIDE RAIL T50", at: [CWT_RAIL_X, 5.5, CWT_RAIL_Z[0]], side: "right", dy: -60 },
  { n: 16, text: "OIL BUFFER", at: [CAR_BUFFER_X, BUFFER_TOP, 0], side: "right" },
  { n: 17, text: "GOV. TENSION SHEAVE", at: [GOV_X, GOV_TENSION_Y, GOV_Z], side: "left", dy: -44 },
  { n: 18, text: "CONTROL CABINET", at: [CABINET[0], CABINET[1] + 1.0, CABINET[2]], side: "left" },
  { n: 19, text: "LANDING DOOR", at: [0, LEVELS[1] + 1.0, LDOOR_PANEL_Z], side: "right", dy: 40 },
];

/** callouts that ride a moving assembly; `key` selects the explosion offset */
type Moving = {
  n: number;
  text: string;
  at: V3;
  side: Side;
  dy?: number;
  group: "cwt" | Exclude<keyof Explosion, "shoeOut" | "safetyOut">;
};
const MOVING: Moving[] = [
  { n: 7, text: "COUNTERWEIGHT", at: [CWT_X, CWT_H / 2, CWT_Z - 0.1], side: "right", group: "cwt" },
  { n: 8, text: "CAR SLING", at: [0.3, CROSSHEAD_Y, 0], side: "right", dy: 8, group: "crosshead" },
  { n: 9, text: "ROLLER GUIDE SHOE", at: [RAIL_X, SHOE_Y_TOP + 0.12, 0], side: "right", dy: -28, group: "crosshead" },
  { n: 10, text: "DOOR OPERATOR", at: [0, CAB_H + 0.25, 0.6], side: "left", dy: -20, group: "operator" },
  { n: 11, text: "CAR DOORS", at: [DOOR_W, DOOR_H / 2, DOOR_Z], side: "right", dy: 18, group: "doorR" },
  { n: 12, text: "CAR OPERATING PANEL", at: [0.49, 1.3, CAB_FRONT + 0.03], side: "right", dy: -16, group: "returnR" },
  { n: 13, text: "SAFETY GEAR", at: [RAIL_X, PLANK_Y, 0], side: "right", dy: 32, group: "plank" },
  { n: 14, text: "CAR PULLEYS (2:1)", at: [PULLEY_X, PULLEY_Y, ROPE_Z], side: "right", dy: -34, group: "plank" },
  { n: 15, text: "TRAVELING CABLE", at: [TCABLE_CAR[0], TCABLE_CAR[1] - 1.0, TCABLE_CAR[2]], side: "left", group: "plank" },
];

/** world position of a moving callout for progress `p`, written into `g` */
function poseCallout(g: THREE.Object3D, m: Moving, p: number, e: Explosion) {
  if (m.group === "cwt") {
    g.position.set(m.at[0], cwtY(p) + m.at[1], m.at[2]);
    return;
  }
  const off = e[m.group];
  const out = m.n === 9 ? e.shoeOut : m.n === 13 ? e.safetyOut : 0;
  const down = m.n === 13 ? 0.75 * e.safetyOut : 0;
  g.position.set(m.at[0] + off[0] + out, carY(p) + m.at[1] + off[1] - down, m.at[2] + off[2]);
}

/** the same placement as a plain tuple, for the very first render */
function initialAt(m: Moving, p: number, explode: number): V3 {
  const g = new THREE.Object3D();
  poseCallout(g, m, p, explosion(p, explode));
  return [g.position.x, g.position.y, g.position.z];
}

export default function Labels() {
  const divs = useRef<Array<HTMLDivElement | null>>([]);
  const groups = useRef<Array<THREE.Group | null>>([]);
  const invalidate = useThree((s) => s.invalidate);
  const { progress, explode } = useScene();
  // opacity of the very first paint: <Html> is positioned by its own useFrame,
  // and the canvas renders on demand, so a label must already be correct
  // before any frame runs (reduced motion, deep links, a page loaded scrolled)
  const initial = stagger(progress.get(), W_LABELS[0], W_LABELS[1]);

  // <Html> mounts its content into a portal one commit later, so the elements
  // below appear after this component. Keep asking for frames for a moment so
  // they get placed and faded even while nothing else invalidates the canvas.
  useEffect(() => {
    invalidate();
    const id = requestAnimationFrame(invalidate);
    return () => cancelAnimationFrame(id);
  }, [invalidate]);

  useProgressFrame((p, explode) => {
    const o = stagger(p, W_LABELS[0], W_LABELS[1]);
    const text = String(o);
    for (const d of divs.current) {
      if (!d) continue;
      d.style.opacity = text;
      d.style.visibility = o < 0.01 ? "hidden" : "visible";
    }
    const e = explosion(p, explode);
    for (let i = 0; i < MOVING.length; i++) {
      const g = groups.current[i];
      if (g) poseCallout(g, MOVING[i], p, e);
    }
  });

  return (
    <group>
      {STATIC.map((c, i) => (
        <Html key={c.n} position={c.at} center zIndexRange={[10, 0]} pointerEvents="none" style={HTML_STYLE}>
          <Callout
            n={c.n}
            text={c.text}
            side={c.side}
            dy={c.dy}
            opacity={initial}
            innerRef={(el) => {
              divs.current[i] = el;
            }}
          />
        </Html>
      ))}
      {MOVING.map((c, i) => (
        <group
          key={c.n}
          position={initialAt(c, progress.get(), explode)}
          ref={(el) => {
            groups.current[i] = el;
          }}
        >
          <Html center zIndexRange={[10, 0]} pointerEvents="none" style={HTML_STYLE}>
            <Callout
              n={c.n}
              text={c.text}
              side={c.side}
              dy={c.dy}
              opacity={initial}
              innerRef={(el) => {
                divs.current[STATIC.length + i] = el;
              }}
            />
          </Html>
        </group>
      ))}
      {LEVELS.map((L, i) => (
        <Html
          key={L}
          position={[-1.1, L + 0.05, SHAFT_FRONT + 0.3]}
          center
          zIndexRange={[10, 0]}
          pointerEvents="none"
          style={HTML_STYLE}
        >
          <div
            style={{
              font: "10px ui-monospace, SFMono-Regular, monospace",
              letterSpacing: "0.08em",
              color: LINE,
              whiteSpace: "nowrap",
              transform: "translateX(-50%)",
              pointerEvents: "none",
              direction: "ltr",
            }}
          >
            <span style={{ color: ACCENT }}>▽</span> {LEVEL_LABELS[i]}
          </div>
        </Html>
      ))}
    </group>
  );
}
