"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { useProgressFrame, useScene } from "../scene-context";
import { explosion, type V3 } from "../dims";
import { FACE_ROT, STOPS, stopAt, type Stop } from "../tour";
import type { SiteNote, SiteNotes } from "@/lib/site-notes";
import { getReview, subscribeReview } from "@/lib/reviews";
import { TOUR } from "@/lib/tuning";

/**
 * The page text lettered onto the machine: each section is drawn into a
 * canvas and mapped onto a plane laid on the surface of the component it
 * belongs to — the cab back wall, the two side panels, the counterweight, a
 * landing door, the pit buffers. They are permanent fixtures of the drawing,
 * always in place; the camera tour (see ../tour.ts) simply walks up to one
 * after another as the page scrolls.
 *
 * The plates behave like the surfaces they are printed on: depth-tested, so
 * the closing doors cover the sign in the cab and the passing car covers the
 * one on the landing, and single-sided, so none of them shows through a wall
 * or reads backwards from behind.
 */

/** ~1000 px per metre keeps the lettering crisp at the distances of the tour */
const PX_PER_M = 1000;
const MAX_PX = 2048;

/**
 * The type scale, as a share of the distance the camera reads the plate from.
 *
 * A plate's own size says nothing about how large its lettering will look: the
 * camera frames each plate to fill the shot, so a bigger plate is simply read
 * from further away. Tie the type to that distance and the body copy comes out
 * the same size on screen on every plate, whatever the plate's size or shape.
 */
const TYPE_SCALE = 0.00911;

/**
 * The shot each plate is framed for. The real viewport aspect would mean
 * redrawing every plate on resize; one representative shape per device class
 * is enough, because it is the *class* that changes which side of the plate
 * the framing runs out of first — width in a portrait phone, height on a
 * landscape desktop.
 */
const SHOT = {
  desktop: { fov: TOUR.fov, aspect: 1.6 },
  mobile: { fov: TOUR.fovMobile, aspect: 0.46 },
} as const;

/** distance that frames a `size` face — the same rule the tour flies to */
function readingDistance(size: [number, number], fov: number, aspect: number) {
  const halfV = Math.tan((fov / 2) * (Math.PI / 180));
  return Math.max(size[1] / 2 / halfV, size[0] / 2 / (halfV * Math.max(aspect, 0.35)));
}

/**
 * The longest line of body copy, in units. Much past this and the eye loses
 * its place returning to the left edge; the column is centred on plates wide
 * enough that the cap bites.
 */
const MEASURE = 24;

type Colors = { paper: string; line: string; accent: string };

function readColors(): Colors {
  const cs = getComputedStyle(document.documentElement);
  return {
    paper: cs.getPropertyValue("--bp-paper").trim() || "#eef3fb",
    line: cs.getPropertyValue("--bp-line").trim() || "#1d3f9e",
    accent: cs.getPropertyValue("--bp-accent").trim() || "#0e7490",
  };
}

/** largest type size at which the longest word of `text` still fits `maxW` */
function fitPx(ctx: CanvasRenderingContext2D, text: string, maxW: number, px: number, font: (p: number) => string) {
  ctx.font = font(px);
  let longest = 0;
  for (const w of text.split(/\s+/)) longest = Math.max(longest, ctx.measureText(w).width);
  if (longest > maxW) {
    px *= maxW / longest;
    ctx.font = font(px);
  }
  return px;
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
  const titlePx = fitPx(ctx, note.title, inner, unit * 2.3, (px) => F(px, 700));
  y = wrap(ctx, note.title, x, y, inner, titlePx * 1.18, dry);
  y += unit * 0.8;

  const bodyPx = note.body ? fitPx(ctx, note.body, inner, unit * 1.35, (px) => F(px)) : unit * 1.35;
  ctx.font = F(bodyPx);
  if (!dry) ctx.globalAlpha = 0.92;
  if (note.body) y = wrap(ctx, note.body, x, y, inner, bodyPx * 1.45, dry);
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
      const bTitlePx = fitPx(ctx, b.title, inner, unit * 1.55, (px) => F(px, 700));
      if (!dry) ctx.fillStyle = c.line;
      y = wrap(ctx, b.title, x, y + unit * 0.5, inner, bTitlePx * 1.22, dry);
      if (b.caption) {
        ctx.font = `600 ${Math.round(unit * 0.95)}px ui-monospace, SFMono-Regular, monospace`;
        if (!dry) ctx.fillStyle = c.accent;
        y = wrap(ctx, b.caption.toUpperCase(), x, y + unit * 0.1, inner, unit * 1.4, dry);
      }
      if (b.body) {
        const bBodyPx = fitPx(ctx, b.body, inner, unit * 1.3, (px) => F(px));
        if (!dry) {
          ctx.fillStyle = c.line;
          ctx.globalAlpha = 0.92;
        }
        y = wrap(ctx, b.body, x, y + unit * 0.5, inner, bBodyPx * 1.42, dry);
      }
    }
  }
  if (!dry) ctx.globalAlpha = 1;
  return y - y0;
}

/** draws one note as a stencilled plate and returns it as a texture */
function noteTexture(note: SiteNote, stop: Stop, c: Colors, mobile: boolean): THREE.CanvasTexture {
  const size = stop.size;
  const scale = Math.min(PX_PER_M, MAX_PX / Math.max(size[0], size[1]));
  const w = Math.round(size[0] * scale);
  const h = Math.round(size[1] * scale);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  const margin = Math.round(Math.min(w, h * 0.5) * 0.08);
  const avail = h - margin * 2;

  // an opaque plate so the lettering does not fight the panel seams behind it
  ctx.fillStyle = c.paper;
  ctx.globalAlpha = 0.94;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = Math.max(2, Math.min(w, h) * 0.006);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
  ctx.textBaseline = "alphabetic";

  // The same size of lettering on every plate: tied to how far away the plate
  // is read from, not to how big it is. It only ever shrinks from there, and
  // only if a plate is given more copy than it can hold.
  const shot = mobile ? SHOT.mobile : SHOT.desktop;
  const room = stop.pad * (stop.context ?? TOUR.context);
  const distance = readingDistance(size, shot.fov, shot.aspect) * room;
  let unit = distance * TYPE_SCALE * scale;
  const column = Math.min(w - margin * 2, unit * MEASURE);
  const x = Math.round((w - column) / 2);
  const needed = layout(ctx, note, x, margin, column, unit, c, true);
  if (needed > avail) unit *= Math.max(avail / needed, 0.5);
  const total = needed > avail ? layout(ctx, note, x, margin, column, unit, c, true) : needed;
  layout(ctx, note, x, margin + Math.max((avail - total) / 2, 0), column, unit, c, false);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * The note a plate carries. A plate with `cards` shows one of them at a time —
 * the arrows page through it — so the chosen card is folded into the ordinary
 * note shape and lettered exactly like any other.
 */
function noteOf(notes: SiteNotes, id: Stop["id"], review: number): SiteNote {
  const note = notes[id];
  const cards = note.cards;
  if (!cards || cards.length === 0) return note;
  const i = ((review % cards.length) + cards.length) % cards.length;
  const card = cards[i];
  return {
    n: note.n,
    title: note.title,
    caption: `${i + 1} / ${cards.length}`,
    // the contact signs the review off, so it trails it: the plate letters
    // body, then items, then blocks, and an item would sit above the name
    blocks: [
      { title: card.name, caption: card.period, body: card.text },
      ...(card.contact ? [{ title: card.contact }] : []),
    ],
  };
}

export default function Engraved({ notes }: { notes: SiteNotes }) {
  const { mobile } = useScene();
  // redraw the plates when the page theme changes, and once webfonts land
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.fonts?.ready.then(bump);
    return () => mo.disconnect();
  }, []);

  const review = useSyncExternalStore(subscribeReview, getReview, () => 0);

  const plates = useMemo(() => {
    void tick;
    const c = readColors();
    return STOPS.map((s) => noteTexture(noteOf(notes, s.id, review), s, c, mobile));
  }, [notes, tick, review, mobile]);

  useEffect(() => () => plates.forEach((t) => t?.dispose()), [plates]);

  const groups = useRef<Array<THREE.Group | null>>([]);
  const pos = useRef<V3>([0, 0, 0]).current;

  useProgressFrame((_p, ex, _state, scroll) => {
    // the tour is scheduled against the page; stopAt maps it to travel itself
    const e = explosion(scroll, ex);
    for (let i = 0; i < STOPS.length; i++) {
      const g = groups.current[i];
      if (!g) continue;
      stopAt(pos, STOPS[i], scroll, e);
      g.position.set(pos[0], pos[1], pos[2]);
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
            <mesh renderOrder={2}>
              <planeGeometry args={[s.size[0], s.size[1]]} />
              <meshBasicMaterial
                map={tex}
                transparent
                depthWrite={false}
                toneMapped={false}
                side={THREE.FrontSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
