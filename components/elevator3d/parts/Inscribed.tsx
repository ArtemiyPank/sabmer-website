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
 * The page copy written into the machine itself: every section is a drafting
 * note bolted to one component of the elevator — the sling, a cab panel, a
 * car door, the counterweight, the platform — and it rides that component as
 * the car explodes. Each note has its own stretch of the scroll, so the text
 * arrives with the part it belongs to and leaves before the next one lands.
 *
 * The notes are real DOM (drei `<Html>`) inside the aria-hidden backdrop, so
 * they are a visual presentation of the flow sections, which stay in the page
 * for assistive technology and for search engines.
 */

type Anchor = {
  note: SiteNote;
  /** car-local (or world, for the counterweight) anchor point */
  at: V3;
  /** which exploded assembly carries it; "cwt" rides the counterweight */
  group: "cwt" | Exclude<keyof Explosion, "shoeOut" | "safetyOut">;
  side: "left" | "right";
  /** progress window: fade in over [0]..[1], fade out over [2]..[3] */
  win: [number, number, number, number];
};

const LINE = "var(--bp-line)";
const ACCENT = "var(--bp-accent)";
const HTML_STYLE: React.CSSProperties = { pointerEvents: "none", left: 0, top: 0 };

/** how far the note sits from its anchor, and how wide it is */
const LEAD = 150; // long enough to clear the drawing and land the note in the margin
const LEAD_MOBILE = 30;

function noteAnchors(n: SiteNotes): Anchor[] {
  const list: Anchor[] = [
    { note: n.hero, at: [-0.72, CROSSHEAD_Y + 0.1, 0], group: "crosshead", side: "left", win: [0, 0.04, 0.12, 0.18] },
    { note: n.about, at: [-CAB_X, 1.5, -0.1], group: "wallL", side: "left", win: [0.12, 0.18, 0.34, 0.4] },
  ];
  if (n.founders[0]) {
    list.push({ note: n.founders[0], at: [-0.21, 1.75, DOOR_Z], group: "doorL", side: "left", win: [0.34, 0.4, 0.52, 0.58] });
  }
  if (n.founders[1]) {
    list.push({ note: n.founders[1], at: [0.21, 1.15, DOOR_Z], group: "doorR", side: "right", win: [0.52, 0.58, 0.68, 0.74] });
  }
  list.push(
    { note: n.careers, at: [CWT_X, CWT_H * 0.6, CWT_Z], group: "cwt", side: "right", win: [0.68, 0.74, 0.84, 0.9] },
    // the last note rides the car top, which stays in frame while the camera pulls back
    { note: n.contacts, at: [-0.3, CAB_H + 0.3, 0.3], group: "ceiling", side: "left", win: [0.84, 0.9, 1.3, 1.4] }
  );
  return list;
}

/** world position of an anchor at progress `p` */
function poseAnchor(o: THREE.Object3D, a: Anchor, p: number, e: Explosion) {
  if (a.group === "cwt") {
    o.position.set(a.at[0], cwtY(p) + a.at[1], a.at[2]);
    return;
  }
  const off = e[a.group];
  o.position.set(a.at[0] + off[0], carY(p) + a.at[1] + off[1], a.at[2] + off[2]);
}

function initialAt(a: Anchor, p: number, explode: number): V3 {
  const o = new THREE.Object3D();
  poseAnchor(o, a, p, explosion(p, explode));
  return [o.position.x, o.position.y, o.position.z];
}

/** 0..1 presence of a note: fades in with its part and out before the next */
function presence(p: number, [a, b, c, d]: Anchor["win"]) {
  return stagger(p, a, b) * (1 - stagger(p, c, d));
}

/** one note: anchor dot, leader to the part, and the text on a paper wash */
function Note({
  note,
  side,
  mobile,
  innerRef,
  opacity,
}: {
  note: SiteNote;
  side: "left" | "right";
  mobile: boolean;
  innerRef: (el: HTMLDivElement | null) => void;
  opacity: number;
}) {
  const lead = mobile ? LEAD_MOBILE : LEAD;
  const width = mobile ? "min(84vw, 320px)" : 290;
  const right = side === "right";
  return (
    <div ref={innerRef} style={{ position: "relative", width: 0, height: 0, opacity, willChange: "opacity" }}>
      <span
        style={{
          position: "absolute",
          left: -3.5,
          top: -3.5,
          width: 7,
          height: 7,
          borderRadius: "50%",
          background: ACCENT,
        }}
      />
      <span
        style={
          mobile
            ? { position: "absolute", left: -0.5, top: 5, width: 1, height: lead, background: "var(--bp-line-soft)" }
            : { position: "absolute", left: right ? 5 : -lead - 5, top: -0.5, width: lead, height: 1, background: "var(--bp-line-soft)" }
        }
      />
      <div
        style={{
          position: "absolute",
          top: mobile ? lead + 8 : -18,
          left: mobile ? 0 : right ? lead + 8 : undefined,
          right: mobile ? undefined : right ? undefined : lead + 8,
          transform: mobile ? `translateX(calc(-50% ${right ? "-" : "+"} 55px))` : undefined,
          width,
          padding: mobile ? "10px 12px" : "12px 16px",
          background: "color-mix(in srgb, var(--bp-paper) 76%, transparent)",
          [right ? "borderLeft" : "borderRight"]: `2px solid ${ACCENT}`,
          boxShadow: "0 0 0 1px var(--bp-line-soft) inset",
        }}
      >
        <div
          style={{
            font: `600 ${mobile ? 9 : 10}px/1 ui-monospace, SFMono-Regular, monospace`,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: ACCENT,
          }}
        >
          {note.n} · {note.caption ?? "SABMER"}
        </div>
        <div
          style={{
            marginTop: 6,
            font: `700 ${mobile ? 14 : 17}px/1.25 var(--font-rubik), sans-serif`,
            color: LINE,
          }}
        >
          {note.title}
        </div>
        {note.body && (
          <p style={{ marginTop: 6, font: `${mobile ? 12 : 13}px/1.5 var(--font-rubik), sans-serif`, opacity: 0.85 }}>
            {note.body}
          </p>
        )}
        {note.items && (
          <ul style={{ marginTop: 6, listStyle: "none", padding: 0 }}>
            {note.items.map((it) => (
              <li key={it} style={{ font: `${mobile ? 12 : 13}px/1.6 var(--font-rubik), sans-serif`, opacity: 0.85 }}>
                <span style={{ color: ACCENT }}>·</span> {it}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function Inscribed({ notes }: { notes: SiteNotes }) {
  const { progress, explode, mobile } = useScene();
  const invalidate = useThree((s) => s.invalidate);
  const anchors = useMemo(() => noteAnchors(notes), [notes]);
  const divs = useRef<Array<HTMLDivElement | null>>([]);
  const groups = useRef<Array<THREE.Group | null>>([]);
  const p0 = progress.get();

  // <Html> mounts its portals over the next few commits and the canvas renders
  // on demand, so ask for the frames that place and fade the notes; without
  // them a note that mounted late would stay at its first-render opacity
  useEffect(() => {
    let n = 0;
    let id = 0;
    const tick = () => {
      invalidate();
      if (++n < 5) id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, [invalidate]);

  useProgressFrame((p, ex) => {
    const e = explosion(p, ex);
    for (let i = 0; i < anchors.length; i++) {
      const g = groups.current[i];
      if (g) poseAnchor(g, anchors[i], p, e);
      const d = divs.current[i];
      if (!d) continue;
      const o = presence(p, anchors[i].win);
      d.style.opacity = String(o);
      d.style.visibility = o < 0.01 ? "hidden" : "visible";
    }
  });

  return (
    <group>
      {anchors.map((a, i) => (
        <group
          key={a.note.n + a.note.title}
          position={initialAt(a, p0, explode)}
          ref={(el) => {
            groups.current[i] = el;
          }}
        >
          <Html center zIndexRange={[9, 0]} pointerEvents="none" style={HTML_STYLE}>
            <Note
              note={a.note}
              side={a.side}
              mobile={mobile}
              opacity={presence(p0, a.win)}
              innerRef={(el) => {
                divs.current[i] = el;
              }}
            />
          </Html>
        </group>
      ))}
    </group>
  );
}
