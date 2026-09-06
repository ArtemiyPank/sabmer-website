"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useProgressFrame } from "../scene-context";
import { explosion, type V3 } from "../dims";
import { FACE_ROT, STOPS, stopAt, stopOpacity, type Stop } from "../tour";
import type { SiteNote, SiteNotes } from "@/lib/site-notes";

/**
 * The page text lettered onto the machine: each section is drawn into a
 * canvas and mapped onto a plane laid on the surface of the component it
 * belongs to — the landing door, the cab back wall, the two side panels, the
 * counterweight, the car apron. The camera tour (see ../tour.ts) flies from
 * one to the next as the page scrolls, so a section is read by walking up to
 * the part that carries it.
 *
 * The planes ride their assembly's explosion offsets, so the lettering stays
 * on its part while the car comes apart.
 */

/** ~1000 px per metre keeps the lettering crisp at the distances of the tour */
const PX_PER_M = 1000;
const MAX_PX = 1600;

type Colors = { paper: string; line: string; accent: string };

function readColors(): Colors {
  const cs = getComputedStyle(document.documentElement);
  return {
    paper: cs.getPropertyValue("--bp-paper").trim() || "#eef3fb",
    line: cs.getPropertyValue("--bp-line").trim() || "#1d3f9e",
    accent: cs.getPropertyValue("--bp-accent").trim() || "#0e7490",
  };
}

/** greedy word wrap; returns the y the next block starts at */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lh: number,
  dry: boolean
) {
  let line = "";
  for (const word of text.split(/\s+/)) {
    const probe = line ? `${line} ${word}` : word;
    if (ctx.measureText(probe).width > maxW && line) {
      if (!dry) ctx.fillText(line, x, y);
      y += lh;
      line = word;
    } else {
      line = probe;
    }
  }
  if (line) {
    if (!dry) ctx.fillText(line, x, y);
    y += lh;
  }
  return y;
}

/**
 * Lays the note out at a given type size; returns the height it needs. With
 * `dry` it only measures, which is how the size is fitted to the plate.
 */
function layout(
  ctx: CanvasRenderingContext2D,
  note: SiteNote,
  x: number,
  y0: number,
  inner: number,
  unit: number,
  c: Colors,
  dry: boolean
) {
  const F = (px: number, weight = 400) => `${weight} ${Math.round(px)}px Rubik, ui-sans-serif, system-ui, sans-serif`;
  let y = y0 + unit * 1.2;

  const label = `${note.n}  ·  ${(note.caption ?? "SABMER").toUpperCase()}`;
  let labelPx = unit * 1.05;
  ctx.font = `600 ${Math.round(labelPx)}px ui-monospace, SFMono-Regular, monospace`;
  const labelW = ctx.measureText(label).width;
  if (labelW > inner) {
    labelPx *= inner / labelW;
    ctx.font = `600 ${Math.round(labelPx)}px ui-monospace, SFMono-Regular, monospace`;
  }
  if (!dry) {
    ctx.fillStyle = c.accent;
    ctx.fillText(label, x, y);
  }
  y += unit * 0.9;
  if (!dry) ctx.fillRect(x, y, inner, Math.max(1, unit * 0.07));
  y += unit * 2.1;

  if (!dry) ctx.fillStyle = c.line;
  ctx.font = F(unit * 2.3, 700);
  y = wrap(ctx, note.title, x, y, inner, unit * 2.7, dry);
  y += unit * 0.8;

  ctx.font = F(unit * 1.35);
  if (!dry) ctx.globalAlpha = 0.92;
  if (note.body) y = wrap(ctx, note.body, x, y, inner, unit * 1.95, dry);
  if (note.items) {
    y += unit * 0.5;
    for (const it of note.items) {
      if (!dry) {
        ctx.fillStyle = c.accent;
        ctx.fillText("·", x, y);
        ctx.fillStyle = c.line;
      }
      y = wrap(ctx, it, x + unit * 1.1, y, inner - unit * 1.1, unit * 1.95, dry);
    }
  }
  if (note.blocks) {
    for (const b of note.blocks) {
      y += unit * 1.1;
      if (!dry) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.accent;
        ctx.fillRect(x, y - unit * 0.75, inner, Math.max(1, unit * 0.05));
      }
      ctx.font = F(unit * 1.55, 700);
      if (!dry) ctx.fillStyle = c.line;
      y = wrap(ctx, b.title, x, y + unit * 0.5, inner, unit * 1.9, dry);
      if (b.caption) {
        ctx.font = `600 ${Math.round(unit * 0.95)}px ui-monospace, SFMono-Regular, monospace`;
        if (!dry) ctx.fillStyle = c.accent;
        y = wrap(ctx, b.caption.toUpperCase(), x, y + unit * 0.1, inner, unit * 1.4, dry);
      }
      if (b.body) {
        ctx.font = F(unit * 1.3);
        if (!dry) {
          ctx.fillStyle = c.line;
          ctx.globalAlpha = 0.92;
        }
        y = wrap(ctx, b.body, x, y + unit * 0.5, inner, unit * 1.85, dry);
      }
    }
  }
  if (!dry) ctx.globalAlpha = 1;
  return y - y0;
}

/** draws one note as a stencilled plate and returns it as a texture */
function noteTexture(note: SiteNote, size: [number, number], c: Colors): THREE.CanvasTexture {
  const scale = Math.min(PX_PER_M, MAX_PX / Math.max(size[0], size[1]));
  const w = Math.round(size[0] * scale);
  const h = Math.round(size[1] * scale);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  const pad = Math.round(Math.min(w, h) * 0.07);
  const inner = w - pad * 2;
  const avail = h - pad * 2;

  // an opaque plate so the lettering does not fight the panel seams behind it
  ctx.fillStyle = c.paper;
  ctx.globalAlpha = 0.94;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.006);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
  ctx.textBaseline = "alphabetic";

  // fit the type to the plate: start large, shrink only as far as needed
  // larger lettering, so the plate still reads now that the shot is wider
  let unit = w / 21;
  const needed = layout(ctx, note, pad, pad, inner, unit, c, true);
  if (needed > avail) unit *= Math.max(avail / needed, 0.5);
  const total = needed > avail ? layout(ctx, note, pad, pad, inner, unit, c, true) : needed;
  layout(ctx, note, pad, pad + Math.max((avail - total) / 2, 0), inner, unit, c, false);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const noteOf = (notes: SiteNotes, id: Stop["id"]): SiteNote => notes[id];

export default function Engraved({ notes }: { notes: SiteNotes }) {
  // redraw the plates when the page theme changes, and once webfonts land
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.fonts?.ready.then(bump);
    return () => mo.disconnect();
  }, []);

  const plates = useMemo(() => {
    void tick;
    const c = readColors();
    return STOPS.map((s) => noteTexture(noteOf(notes, s.id), s.size, c));
  }, [notes, tick]);

  useEffect(() => () => plates.forEach((t) => t?.dispose()), [plates]);

  const groups = useRef<Array<THREE.Group | null>>([]);
  const mats = useRef<Array<THREE.MeshBasicMaterial | null>>([]);
  const pos = useRef<V3>([0, 0, 0]).current;

  useProgressFrame((p, ex) => {
    const e = explosion(p, ex);
    for (let i = 0; i < STOPS.length; i++) {
      const g = groups.current[i];
      const m = mats.current[i];
      const o = stopOpacity(i, p);
      if (m) {
        m.opacity = o;
        m.visible = o > 0.01;
      }
      if (g && o > 0.01) {
        stopAt(pos, STOPS[i], p, e);
        g.position.set(pos[0], pos[1], pos[2]);
      }
    }
  });

  return (
    <group>
      {STOPS.map((s, i) => {
        const tex = plates[i];
        if (!tex) return null;
        return (
          <group
            key={s.id}
            rotation={FACE_ROT[s.face]}
            ref={(el) => {
              groups.current[i] = el;
            }}
          >
            <mesh renderOrder={10}>
              <planeGeometry args={[s.size[0], s.size[1]]} />
              <meshBasicMaterial
                map={tex}
                transparent
                opacity={0}
                depthWrite={false}
                depthTest={false}
                toneMapped={false}
                side={THREE.DoubleSide}
                ref={(el) => {
                  mats.current[i] = el;
                }}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
