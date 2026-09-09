"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { useProgressFrame, useScene } from "../scene-context";
import { explosion, type V3 } from "../dims";
import { FACE_ROT, STOPS, frameDistance, shotRoom, stopAt, type Stop } from "../tour";
import type { SiteNote, SiteNotes } from "@/lib/site-notes";
import { getReview, subscribeReview } from "@/lib/reviews";
import { PLATE, TOUR } from "@/lib/tuning";

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

/** the camera each plate is lettered for: the tour's own framing, per class */
const SHOT = {
  desktop: { fov: TOUR.fov, aspect: PLATE.shot.desktop },
  mobile: { fov: TOUR.fovMobile, aspect: PLATE.shot.mobile },
} as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

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

/** greedy word wrap; returns the baseline of the last line it drew */
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
  let last = y;
  for (const word of text.split(/\s+/)) {
    const probe = line ? `${line} ${word}` : word;
    if (ctx.measureText(probe).width > maxW && line) {
      if (!dry) ctx.fillText(line, x, y);
      last = y;
      y += lh;
      line = word;
    } else {
      line = probe;
    }
  }
  if (line) {
    if (!dry) ctx.fillText(line, x, y);
    last = y;
  }
  return last;
}

/**
 * Air is measured from the ink, not from the baseline.
 *
 * A baseline says nothing about where a line of type actually ends: descenders
 * hang below it and capitals rise well above it, both by amounts that change
 * with the size of the type. Spacing off baselines therefore leaves a rule
 * crowding one plate's title and floating away from another's. These read the
 * real extent of the glyphs, so the same number of units means the same amount
 * of visible space on every plate. A line of figures has no descenders at all,
 * and gets no air below it beyond the gap itself.
 *
 * The size is handed in rather than read back from `ctx.font`, which returns
 * the browser's normalised form of it — "bold 38px Rubik" — and is no more
 * parseable as a number than the weight it starts with.
 */
const inkAbove = (ctx: CanvasRenderingContext2D, text: string, px: number) => {
  const ink = ctx.measureText(text).actualBoundingBoxAscent;
  return ink === undefined ? px * 0.72 : ink;
};
const inkBelow = (ctx: CanvasRenderingContext2D, text: string, px: number) => {
  const ink = ctx.measureText(text).actualBoundingBoxDescent;
  return ink === undefined ? px * 0.22 : ink;
};

/**
 * Letters `note` down the plate and returns the height it took. With `dry` it
 * measures without marking the canvas; `air` scales every gap, so the same
 * copy can be fitted by tightening the spacing rather than by shrinking the
 * type (see `noteTexture`).
 */
function layout(
  ctx: CanvasRenderingContext2D,
  note: SiteNote,
  x: number,
  y0: number,
  inner: number,
  unit: number,
  air: number,
  c: Colors,
  rtl: boolean,
  dry: boolean
) {
  /** clear space: every gap on the plate is squeezed by the same multiplier */
  const space = (v: number) => v * air;
  // Hebrew is set from the other edge of the column: every run of type hangs
  // off `edge`, and a list's marker sits outside the copy on that same side
  const edge = rtl ? x + inner : x;
  const bullet = unit * 1.1;
  const indent = rtl ? edge - bullet : edge + bullet;
  ctx.textAlign = rtl ? "right" : "left";
  const F = (px: number, weight = 400) => `${weight} ${Math.round(px)}px Rubik, ui-sans-serif, system-ui, sans-serif`;
  const MONO = (px: number) => `600 ${Math.round(px)}px ui-monospace, SFMono-Regular, monospace`;
  const ruleT = Math.max(1, unit * 0.06);

  /** a rule, with `PLATE.air.rule` of clear space kept above it */
  const drawRule = (y: number) => {
    if (!dry) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.accent;
      ctx.fillRect(x, y, inner, ruleT);
    }
    return y + ruleT;
  };

  // ---- sheet number and caption ----
  const label = `${note.n}  ·  ${(note.caption ?? "SABMER").toUpperCase()}`;
  let labelPx = unit * 1.05;
  ctx.font = MONO(labelPx);
  const labelW = ctx.measureText(label).width;
  if (labelW > inner) {
    labelPx *= inner / labelW;
    ctx.font = MONO(labelPx);
  }
  let y = y0 + inkAbove(ctx, label, labelPx);
  if (!dry) {
    ctx.fillStyle = c.accent;
    ctx.fillText(label, edge, y);
  }

  // ---- the rule under it ----
  y += inkBelow(ctx, label, labelPx) + space(PLATE.air.rule * unit);
  y = drawRule(y);

  // ---- title ----
  if (!dry) ctx.fillStyle = c.line;
  const titlePx = fitPx(ctx, note.title, inner, unit * 2.3, (px) => F(px, 700));
  ctx.font = F(titlePx, 700);
  y += space(PLATE.air.rule * unit) + inkAbove(ctx, note.title, titlePx);
  y = wrap(ctx, note.title, edge, y, inner, titlePx * 1.18, dry);
  let below = inkBelow(ctx, note.title, titlePx);

  // ---- body ----
  const bodyPx = note.body ? fitPx(ctx, note.body, inner, unit * 1.35, (px) => F(px)) : unit * 1.35;
  const bodyLh = bodyPx * 1.45;
  if (note.body) {
    ctx.font = F(bodyPx);
    y += below + space(PLATE.air.heading * titlePx) + inkAbove(ctx, note.body, bodyPx);
    if (!dry) {
      ctx.fillStyle = c.line;
      ctx.globalAlpha = 0.92;
    }
    y = wrap(ctx, note.body, edge, y, inner, bodyLh, dry);
    below = inkBelow(ctx, note.body, bodyPx);
  }

  // ---- list ----
  if (note.items) {
    ctx.font = F(bodyPx);
    // the list opens under the body copy, or under the title if there is none
    let opening = note.body ? PLATE.air.copy * unit : PLATE.air.heading * titlePx;
    for (const it of note.items) {
      y += below + space(opening) + inkAbove(ctx, it, bodyPx);
      if (!dry) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.accent;
        ctx.fillText("·", edge, y);
        ctx.fillStyle = c.line;
        ctx.globalAlpha = 0.92;
      }
      y = wrap(ctx, it, indent, y, inner - bullet, bodyLh, dry);
      below = inkBelow(ctx, it, bodyPx);
      opening = PLATE.air.item * unit;
    }
  }

  // ---- sub-entries, each opened by a rule ----
  if (note.blocks) {
    for (const b of note.blocks) {
      y += below + space(PLATE.air.rule * unit);
      y = drawRule(y);

      const bTitlePx = fitPx(ctx, b.title, inner, unit * 1.55, (px) => F(px, 700));
      ctx.font = F(bTitlePx, 700);
      y += space(PLATE.air.rule * unit) + inkAbove(ctx, b.title, bTitlePx);
      if (!dry) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = c.line;
      }
      y = wrap(ctx, b.title, edge, y, inner, bTitlePx * 1.22, dry);
      below = inkBelow(ctx, b.title, bTitlePx);

      if (b.caption) {
        const capText = b.caption.toUpperCase();
        const capPx = unit * 0.95;
        ctx.font = MONO(capPx);
        y += below + space(PLATE.air.caption * bTitlePx) + inkAbove(ctx, capText, capPx);
        if (!dry) ctx.fillStyle = c.accent;
        y = wrap(ctx, capText, edge, y, inner, unit * 1.4, dry);
        below = inkBelow(ctx, capText, capPx);
      }
      if (b.body) {
        const bBodyPx = fitPx(ctx, b.body, inner, unit * 1.3, (px) => F(px));
        ctx.font = F(bBodyPx);
        y += below + space(b.caption ? PLATE.air.copy * unit : PLATE.air.heading * bTitlePx) + inkAbove(ctx, b.body, bBodyPx);
        if (!dry) {
          ctx.fillStyle = c.line;
          ctx.globalAlpha = 0.92;
        }
        y = wrap(ctx, b.body, edge, y, inner, bBodyPx * 1.42, dry);
        below = inkBelow(ctx, b.body, bBodyPx);
      }
    }
  }

  if (!dry) ctx.globalAlpha = 1;
  // the block ends at the bottom of the last ink it drew
  return y + below - y0;
}

/** draws one note as a stencilled plate and returns it as a texture */
function noteTexture(note: SiteNote, stop: Stop, c: Colors, mobile: boolean, rtl: boolean): THREE.CanvasTexture {
  const size = stop.size;
  const scale = Math.min(PLATE.pxPerM, PLATE.maxPx / Math.max(size[0], size[1]));
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
  // is read from, not to how big it is.
  const shot = mobile ? SHOT.mobile : SHOT.desktop;
  const distance = frameDistance(size, shot.fov, shot.aspect) * shotRoom(stop, shot.aspect < 1);
  let unit = distance * PLATE.typeScale * scale;
  const column = Math.min(w - margin * 2, unit * PLATE.measure);
  const x = Math.round((w - column) / 2);

  // A plate with more copy than room gives up its air before its type size:
  // the copy must read at the same size on every plate, and a little less
  // space between the parts is a far smaller loss than lettering that shrinks
  // from one plate to the next. Only when the air is squeezed as far as it
  // goes does the type start to give.
  //
  // The height is the fixed height of the lettering plus the air, and the air
  // scales exactly, so measuring it with and without gives the multiplier that
  // fits in one step rather than by trying sizes.
  const loose = layout(ctx, note, x, margin, column, unit, 1, c, rtl, true);
  const air =
    loose <= avail
      ? 1
      : (() => {
          const tight = layout(ctx, note, x, margin, column, unit, 0, c, rtl, true);
          return clamp((avail - tight) / Math.max(loose - tight, 1), PLATE.airMin, 1);
        })();
  let needed = air === 1 ? loose : layout(ctx, note, x, margin, column, unit, air, c, rtl, true);
  if (needed > avail) {
    unit *= Math.max(avail / needed, 0.5);
    needed = layout(ctx, note, x, margin, column, unit, air, c, rtl, true);
  }
  layout(ctx, note, x, margin + Math.max((avail - needed) / 2, 0), column, unit, air, c, rtl, false);

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
    // Hebrew sets from the right; the page tells the plates which way it reads
    const rtl = document.documentElement.dir === "rtl";
    return STOPS.map((s) => noteTexture(noteOf(notes, s.id, review), s, c, mobile, rtl));
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
