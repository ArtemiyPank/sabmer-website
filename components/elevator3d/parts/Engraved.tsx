"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import { useProgressFrame, useScene } from "../scene-context";
import { explosion, type V3 } from "../dims";
import { FACE_ROT, STOPS, frameDistance, shotRoom, stopAt, type Stop } from "../tour";
import type { SiteNote, SiteNotes } from "@/lib/site-notes";
import { getReview, subscribeReview } from "@/lib/reviews";
import { PLATE, TOUR } from "@/lib/tuning";
import { WA_GLYPH } from "@/lib/whatsapp";
import { eachPlateAction } from "@/lib/plate-action";

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

/**
 * Where a line may be broken: any run of white space except a non-breaking
 * one, which is how a separator is kept with the part it belongs to.
 */
const BREAK = /[^\S\u00A0]+/;

/** largest type size at which the longest word of `text` still fits `maxW` */
function fitPx(ctx: CanvasRenderingContext2D, text: string, maxW: number, px: number, font: (p: number) => string) {
  ctx.font = font(px);
  let longest = 0;
  for (const w of text.split(BREAK)) longest = Math.max(longest, ctx.measureText(w).width);
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
  for (const word of text.split(BREAK)) {
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
const scratch = new THREE.Vector3();

/** writes a style only when it would change it: a no-op write still costs */
function set(el: HTMLElement, prop: "visibility" | "left" | "top" | "width" | "height", value: string) {
  if (el.style[prop] !== value) el.style[prop] = value;
}

const hide = (el: HTMLElement) => set(el, "visibility", "hidden");

/**
 * Lay `el` over the button at `b` on the plate `g`, or hide it.
 *
 * `rect` is where the canvas sits on the page, passed in rather than measured
 * here: reading it back after the styles above have been written forces the
 * browser to lay the page out again, every frame, for every anchor.
 */
function place(
  el: HTMLElement,
  b: { cx: number; cy: number; hw: number; hh: number },
  g: THREE.Group,
  camera: THREE.Camera,
  rect: { left: number; top: number; width: number; height: number }
) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      scratch.set(b.cx + sx * b.hw, b.cy + sy * b.hh, 0);
      g.localToWorld(scratch).project(camera);
      if (scratch.z > 1) {
        hide(el);
        return;
      }
      const px = rect.left + ((scratch.x + 1) / 2) * rect.width;
      const py = rect.top + ((1 - scratch.y) / 2) * rect.height;
      x0 = Math.min(x0, px);
      y0 = Math.min(y0, py);
      x1 = Math.max(x1, px);
      y1 = Math.max(y1, py);
    }
  }
  // never smaller than a finger
  const w = Math.max(x1 - x0, TOUCH);
  const h = Math.max(y1 - y0, TOUCH);
  set(el, "left", `${Math.round((x0 + x1) / 2 - w / 2)}px`);
  set(el, "top", `${Math.round((y0 + y1) / 2 - h / 2)}px`);
  set(el, "width", `${Math.round(w)}px`);
  set(el, "height", `${Math.round(h)}px`);
  set(el, "visibility", "visible");
}

/** how close to a stop the tour has to be for its button to be offered */
const PARKED = 0.045;
/** the smallest the anchor over the button may be, in CSS pixels */
const TOUCH = 44;

/** where the button printed on a plate sits, in canvas pixels */
type Hit = { x: number; y: number; w: number; h: number } | null;

/** a rounded rectangle path, ready to fill or stroke */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

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

  // ---- the button, printed like everything else on the plate ----
  let hit: Hit = null;
  if (note.action) {
    const px = unit * 1.15;
    ctx.font = F(px, 600);
    // a mark only when the button is for something that has one
    const mark = note.action.mark ? unit * 1.5 : 0;
    const gap = mark ? unit * 0.5 : 0;
    const padX = unit * 1.05;
    const bw = Math.min(inner, ctx.measureText(note.action.label).width + mark + gap + padX * 2);
    const bh = unit * 2.7;
    const bx = rtl ? edge - bw : edge;
    y += below + space(PLATE.air.copy * unit);
    if (!dry) {
      ctx.globalAlpha = 1;
      roundRect(ctx, bx, y, bw, bh, unit * 0.5);
      ctx.fillStyle = c.accent;
      ctx.globalAlpha = 0.12;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(1, unit * 0.07);
      ctx.strokeStyle = c.accent;
      ctx.stroke();
      // the mark, then the label, as a row centred in the button
      const inkW = ctx.measureText(note.action.label).width + mark + gap;
      const left = bx + (bw - inkW) / 2;
      if (mark) {
        ctx.save();
        ctx.translate(left, y + (bh - mark) / 2);
        ctx.scale(mark / 32, mark / 32);
        ctx.fillStyle = c.accent;
        ctx.fill(new Path2D(WA_GLYPH));
        ctx.restore();
      }
      ctx.fillStyle = c.accent;
      ctx.textAlign = "left";
      ctx.fillText(note.action.label, left + mark + gap, y + bh / 2 + px * 0.36);
      ctx.textAlign = rtl ? "right" : "left";
    }
    hit = { x: bx, y, w: bw, h: bh };
    y += bh;
    below = 0;
  }

  if (!dry) ctx.globalAlpha = 1;
  // the block ends at the bottom of the last ink it drew
  return { height: y + below - y0, hit };
}

/**
 * Everything about a plate that the copy cannot change: the canvas it is given,
 * the margin, the size of the type and the width of the column. All of it
 * follows from the surface the plate is printed on and the shot the camera
 * takes of it — never from how much copy the plate carries, which is what
 * keeps the lettering one size from one end of the tour to the other.
 */
function metrics(stop: Stop, mobile: boolean) {
  const size = stop.size;
  const scale = Math.min(PLATE.pxPerM, PLATE.maxPx / Math.max(size[0], size[1]));
  const w = Math.round(size[0] * scale);
  const hMax = Math.round(size[1] * scale);
  const shot = mobile ? SHOT.mobile : SHOT.desktop;
  const distance = frameDistance(size, shot.fov, shot.aspect) * shotRoom(stop, shot.aspect < 1);
  const unit = distance * PLATE.typeScale * scale;
  const side = Math.round(PLATE.pad.side * unit);
  const column = Math.min(w - side * 2, unit * (stop.measure ?? PLATE.measure));
  // the border the plate would like at each end; how much of it survives is
  // decided with the rest of the air, in `fitNote`
  const ends0 = (stop.ends ?? PLATE.pad.ends) * unit;
  // the paper is cut to the column as well as to the copy: a plate no wider
  // than its longest line has no empty band down the side of it
  return { scale, w: column + side * 2, hMax, ends0, unit, column, x: side };
}

type Metrics = ReturnType<typeof metrics>;

/**
 * How this note has to be set to fit the surface: the air it can keep, the
 * border it can keep, the type size it can hold and the height it comes to.
 *
 * A plate with more copy than room gives up its air before its type size: the
 * copy must read at the same size on every plate, and a little less space
 * between the parts — and a narrower border — is a far smaller loss than
 * lettering that shrinks from one plate to the next. Only when the air is
 * squeezed as far as it goes does the type start to give.
 *
 * The height is the fixed height of the lettering plus everything that scales
 * with the air, the border included, so measuring it with the air full and
 * with none of it gives the multiplier that fits in one step rather than by
 * trying sizes.
 */
function fitNote(ctx: CanvasRenderingContext2D, note: SiteNote, m: Metrics, c: Colors, rtl: boolean) {
  const set = (unit: number, air: number) =>
    layout(ctx, note, m.x, 0, m.column, unit, air, c, rtl, true).height;
  let unit = m.unit;
  const loose = set(unit, 1);
  const border = 2 * m.ends0;
  let air = 1;
  if (loose + border > m.hMax) {
    const tight = set(unit, 0);
    air = clamp((m.hMax - tight) / Math.max(loose - tight + border, 1), PLATE.airMin, 1);
  }
  let needed = air === 1 ? loose : set(unit, air);
  const ends = Math.round(m.ends0 * air);
  if (needed + 2 * ends > m.hMax) {
    unit *= Math.max((m.hMax - 2 * ends) / needed, 0.5);
    needed = set(unit, air);
  }
  return { unit, air, needed, ends };
}

type Fit = ReturnType<typeof fitNote>;

/** draws one note as a stencilled plate `h` pixels tall and returns it */
function noteTexture(
  note: SiteNote,
  m: Metrics,
  fit: Fit,
  h: number,
  c: Colors,
  rtl: boolean
) {
  const cv = document.createElement("canvas");
  cv.width = m.w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;

  // an opaque plate so the lettering does not fight the panel seams behind it
  ctx.fillStyle = c.paper;
  ctx.globalAlpha = 0.94;
  ctx.fillRect(0, 0, m.w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = c.accent;
  ctx.lineWidth = Math.max(2, Math.min(m.w, h) * 0.006);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, m.w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
  ctx.textBaseline = "alphabetic";

  const room = h - fit.ends * 2;
  const y0 = fit.ends + Math.max((room - fit.needed) / 2, 0);
  const { hit } = layout(ctx, note, m.x, y0, m.column, fit.unit, fit.air, c, rtl, false);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, hit };
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
    blocks: [{ title: card.name, caption: card.period, body: card.text }],
    // the number the review is signed with: printed at the foot of the plate
    // as a button, so it can be dialled rather than copied off the wall
    action: card.contact
      ? { label: card.contact, href: `tel:${card.contact.replace(/[^+\d]/g, "")}` }
      : undefined,
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
    // measuring needs a context, not a canvas anyone will look at
    const probe = document.createElement("canvas").getContext("2d")!;
    probe.textBaseline = "alphabetic";

    return STOPS.map((s) => {
      const m = metrics(s, mobile);
      /**
       * The paper is cut to the copy, not to the surface it hangs on: a sign
       * with four lines on it should not be a board with four lines adrift in
       * the middle. A plate that pages through cards is cut to its longest
       * one, so the sign does not resize under the visitor as they page.
       */
      const cards = notes[s.id].cards;
      const count = cards?.length ?? 0;
      const shown = count ? ((review % count) + count) % count : 0;
      const fits = (count ? cards! : [null]).map((_, i) => {
        const note = noteOf(notes, s.id, i);
        return { note, fit: fitNote(probe, note, m, c, rtl) };
      });
      const tallest = Math.max(...fits.map((f) => f.fit.needed + f.fit.ends * 2));
      const h = Math.min(m.hMax, Math.round(tallest));
      const { note, fit } = fits[shown];
      const { tex, hit } = noteTexture(note, m, fit, h, c, rtl);
      const height = h / m.scale;
      const width = m.w / m.scale;
      return {
        tex,
        height,
        // the printed button, in metres from the middle of the plate, which is
        // what the anchor over it has to be projected from
        width,
        button: hit && {
          cx: (hit.x + hit.w / 2) / m.scale - width / 2,
          cy: height / 2 - (hit.y + hit.h / 2) / m.scale,
          hw: hit.w / 2 / m.scale,
          hh: hit.h / 2 / m.scale,
        },
      };
    });
  }, [notes, tick, review, mobile]);

  useEffect(() => () => plates.forEach((p) => p.tex.dispose()), [plates]);

  const groups = useRef<Array<THREE.Group | null>>([]);
  const canvasBox = useRef({ w: 0, h: 0, left: 0, top: 0, width: 0, height: 0 });
  const pos = useRef<V3>([0, 0, 0]).current;

  useProgressFrame((_p, ex, state, scroll) => {
    // the tour is scheduled against the page; stopAt maps it to travel itself
    const e = explosion(scroll, ex);
    for (let i = 0; i < STOPS.length; i++) {
      const g = groups.current[i];
      if (!g) continue;
      stopAt(pos, STOPS[i], scroll, e);
      g.position.set(pos[0], pos[1], pos[2]);
    }

    /**
     * Lay the page's anchor over the button printed on the plate.
     *
     * The button is part of the lettering, so where it lands on screen is
     * whatever the camera says: its four corners are carried into the world by
     * the plate's own transform and projected. The anchor is only offered
     * while the tour is parked on that plate — anywhere else the button is
     * away at an angle, or off the screen entirely.
     */
    // where the canvas sits on the page: it only moves when the window is
    // resized, so it is measured then and not on every frame
    const seen = canvasBox.current;
    if (seen.w !== state.size.width || seen.h !== state.size.height) {
      const box = state.gl.domElement.getBoundingClientRect();
      seen.w = state.size.width;
      seen.h = state.size.height;
      seen.left = box.left;
      seen.top = box.top;
      seen.width = box.width;
      seen.height = box.height;
    }
    eachPlateAction((id, el) => {
      const i = STOPS.findIndex((st) => st.id === id);
      const b = i < 0 ? null : plates[i]?.button;
      const g = i < 0 ? null : groups.current[i];
      if (!b || !g || Math.abs(scroll - STOPS[i].p) >= PARKED) {
        hide(el);
        return;
      }
      place(el, b, g, state.camera, seen);
    });
  });



  return (
    <group>
      {STOPS.map((s, i) => {
        const plate = plates[i];
        if (!plate) return null;
        return (
          <group
            key={s.id}
            rotation={FACE_ROT[s.face]}
            ref={(el) => {
              groups.current[i] = el;
            }}
          >
            <mesh renderOrder={2}>
              <planeGeometry args={[plate.width, plate.height]} />
              <meshBasicMaterial
                map={plate.tex}
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
