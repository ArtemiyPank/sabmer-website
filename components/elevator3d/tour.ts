/**
 * Camera tour for the "on detail" layout. Here the elevator is not an
 * exploded diagram but a working machine: it stands at the top landing with
 * its doors open, closes them, runs down the shaft, and the camera rides
 * along, stopping at the component that carries each section of the page.
 *
 *   1. square on to the cab, reading the sign inside — then the doors slide
      shut across it and only afterwards does the car set off
 *   2. the car from the side, on the move
 *   3. the counterweight, coming the other way
 *   4. a landing further down, on its closed doors
 *   5. the pit, square on to the equipment, the last plate on the buffers
 */

import {
  CAB_BACK,
  CAB_H,
  CAB_W,
  CAB_X,
  CWT_X,
  CWT_Z,
  LDOOR_PANEL_Z,
  LEVELS,
  carY,
  cwtY,
  explosion,
  type CameraPose,
  type Explosion,
  type V3,
} from "./dims";
import { TOUR } from "@/lib/tuning";

/** smootherstep: eases in and out with no kick at either end */
const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

/** which way the lettered face looks; also where the camera comes from */
export type Face = "front" | "left" | "right" | "square";

export type Stop = {
  /** matches the key in SiteNotes */
  id: "about" | "jobs" | "reviews" | "founders" | "contacts";
  /** assembly that carries the face, or "world" for parts of the building */
  group: "world" | "cwt" | Exclude<keyof Explosion, "shoeOut" | "safetyOut">;
  /** centre of the lettering, car-local unless the group is "world" / "cwt" */
  at: V3;
  face: Face;
  /** lettered area in metres */
  size: [number, number];
  /** extra distance: >1 pulls the camera back from a tight fit on the plate */
  pad: number;
  /** scroll progress at which the camera is parked on this stop */
  p: number;
  /** how much room around the plate the shot leaves (1 = plate fills the frame) */
  context?: number;
  /**
   * How far the camera swings out over the flight that *leaves* this stop,
   * overriding TOUR.liftoff. The legs down the cab are close quarters, so they get
   * a wider arc than the drop through the shaft further down.
   */
  liftoff?: number;
};

export const STOPS: Stop[] = [
  // 1. the cab interior, read through the open doors before they shut
  { id: "about", group: "wallBack", at: [0, CAB_H / 2, CAB_BACK + 0.03], face: "square", size: [CAB_W - 0.04, CAB_H - 0.12], pad: 1.15, p: 0.03, context: 1.1, liftoff: 4.7 },
  // 2. the flank of the car as it runs down the shaft; the sign sits toward
  //    the front of the panel, clear of the sling stile, the guide rail and
  //    the governor rope, which all run down the middle of the car
  { id: "jobs", group: "wallL", at: [-CAB_X - 0.09, 1.2, 0.55], face: "left", size: [0.46, 1.02], pad: 1.25, p: 0.36, context: 1.15, liftoff: 5.1 },
  // 3. the counterweight, rising past it
  { id: "reviews", group: "cwt", at: [CWT_X + 0.09, 1.3, CWT_Z], face: "right", size: [0.66, 1.02], pad: 1.2, p: 0.55, context: 1.35 },
  // 4. the closed landing doors one floor down
  { id: "founders", group: "world", at: [0, LEVELS[1] + 1.05, LDOOR_PANEL_Z + 0.03], face: "front", size: [0.84, 1.62], pad: 1.2, p: 0.78, context: 1.25 },
  // 5. the pit, straight on: the plate rides the car buffers
  { id: "contacts", group: "world", at: [0, -1.24, 0.2], face: "square", size: [0.8, 0.66], pad: 1.3, p: 1, context: 2.6 },
];

/**
 * How far the car doors stand open. The tour opens on a car parked at the top
 * landing with its doors open and shuts them on the first pixel of scroll,
 * before it sets off.
 */
export function doorPhase(p: number) {
  return 1 - smooth(clamp01(p / TOUR.doorsShutBy));
}

/**
 * Where the doors have covered `share` of the sign behind them. Read off the
 * door curve itself rather than written down beside it, so it stays true if
 * the doors are ever given a different one.
 */
function doorsCover(share: number) {
  let lo = 0;
  // annotated: the tuning table is `as const`, so this would narrow to a literal
  let hi: number = TOUR.doorsShutBy;
  for (let k = 0; k < 20; k++) {
    const mid = (lo + hi) / 2;
    if (1 - doorPhase(mid) >= share) hi = mid;
    else lo = mid;
  }
  return hi;
}

/**
 * The stretches of the tour with nothing in them to stop at, and the stop the
 * page belongs on instead.
 *
 * The tour opens on a car standing at the top landing with its doors open and
 * the sign on its back wall in the frame. The doors then slide across that
 * sign, and only once they are shut does the car set off. Between the two lies
 * a stretch that holds neither: what the visitor stopped to read is behind the
 * doors and the journey has not begun. Passing through it is fine — it is only
 * a bad place to *stay*.
 */
const BLIND: { from: number; to: number; refuge: number }[] = [
  { from: doorsCover(TOUR.signLost), to: TOUR.depart, refuge: STOPS[0].p },
];

/**
 * Where the page belongs, having come to rest at `p` — or null if that is a
 * perfectly good place to be, which is nearly everywhere.
 */
export function refuge(p: number): number | null {
  const blind = BLIND.find((b) => p >= b.from && p < b.to);
  return blind ? blind.refuge : null;
}

/** the page anchor each stop belongs to, in the order the tour visits them */
export const STOP_SECTIONS: { id: Stop["id"]; anchor: string; key: string }[] = [
  { id: "about", anchor: "about", key: "about" },
  { id: "jobs", anchor: "jobs", key: "jobs" },
  { id: "reviews", anchor: "reviews", key: "reviews" },
  { id: "founders", anchor: "founders", key: "founders" },
  { id: "contacts", anchor: "contacts", key: "contacts" },
];

/** scroll progress at which the camera parks on the stop of this section */
export function sectionProgress(anchor: string) {
  const found = STOP_SECTIONS.find((s) => s.anchor === anchor);
  return found ? (STOPS.find((st) => st.id === found.id)?.p ?? 0) : 0;
}

/** index of the stop the camera is showing at progress `p` */
export function currentStop(p: number) {
  const { i, next, t } = tourAt(p);
  return t < 0.5 ? i : next;
}

export function travelAt(p: number) {
  return clamp01((clamp01(p) - TOUR.depart) / (1 - TOUR.depart));
}
/** unit normal of a lettered face, tilted toward the front so the shot reads */
const NORMALS: Record<Face, V3> = {
  front: [0.22, 0.1, 0.97],
  // three-quarter, not flat side on: a flat one looks past the car through the
  // traveling cable, which then crosses the sign
  left: [-0.88, 0.09, 0.46],
  right: [0.88, 0.09, 0.46],
  // dead square on: the closing frame sits level with the equipment
  square: [0, 0, 1],
};

/**
 * On a portrait screen a landscape plate can never fill the frame, so the
 * camera squares up to it — less foreshortening means more legible type — and
 * keeps almost no extra room around it.
 */
const NORMALS_PORTRAIT: Record<Face, V3> = {
  front: [0.12, 0.06, 0.99],
  left: [-0.86, 0.07, 0.5],
  right: [0.86, 0.07, 0.5],
  square: [0, 0, 1],
};

/** rotation that turns a +z plane onto the face */
export const FACE_ROT: Record<Face, V3> = {
  front: [0, 0, 0],
  left: [0, -Math.PI / 2, 0],
  right: [0, Math.PI / 2, 0],
  square: [0, 0, 0],
};

/** world centre of a stop's lettering at progress `p` */
export function stopAt(out: V3, s: Stop, p: number, e: Explosion): V3 {
  if (s.group === "world") {
    out[0] = s.at[0];
    out[1] = s.at[1];
    out[2] = s.at[2];
    return out;
  }
  if (s.group === "cwt") {
    out[0] = s.at[0];
    out[1] = cwtY(travelAt(p)) + s.at[1];
    out[2] = s.at[2];
    return out;
  }
  const off = e[s.group];
  out[0] = s.at[0] + off[0];
  out[1] = carY(travelAt(p)) + s.at[1] + off[1];
  out[2] = s.at[2] + off[2];
  return out;
}

/**
 * Where the tour is at progress `p`: index of the stop being looked at, the
 * next one, and how far the flight between them has got. The camera rests on
 * a stop for the first two thirds of its slice, then travels.
 */

export function tourAt(p: number) {
  const last = STOPS.length - 1;
  const q = clamp01(p);
  let i = 0;
  while (i < last && q >= STOPS[i + 1].p) i++;
  if (q <= STOPS[0].p) return { i: 0, next: 0, t: 0 };
  const from = STOPS[i].p;
  const to = STOPS[Math.min(i + 1, last)].p;
  if (i === last || to <= from) return { i: last, next: last, t: 0 };
  // parked on the stop for the first part of the gap, then a long flight
  const local = (q - from) / (to - from);
  const t = local <= TOUR.dwell ? 0 : smooth(Math.min((local - TOUR.dwell) / (1 - TOUR.dwell), 1));
  return { i, next: i + 1, t };
}

/**
 * How much room around the plate the shot leaves: the point is to arrive at a
 * *part* of the elevator, so the lettering fills roughly half the frame and
 * the component carrying it stays in view.
 */


/** distance that frames a `size` face in a `fov` camera at this aspect */
export function frameDistance(size: [number, number], fov: number, aspect: number) {
  const halfV = Math.tan((fov / 2) * (Math.PI / 180));
  const byHeight = size[1] / 2 / halfV;
  const byWidth = size[0] / 2 / (halfV * Math.max(aspect, 0.35));
  return Math.max(byHeight, byWidth);
}

/**
 * How much room the shot leaves around a stop's plate: 1 fills the frame, more
 * keeps the component carrying the lettering in view. A portrait frame is
 * already limited by its width, so it keeps barely any margin beyond that.
 *
 * The lettering is drawn to this same rule (see parts/Engraved.tsx): the type
 * is sized for the distance the camera reads the plate from, and only one of
 * the two may decide what that distance is.
 */
export function shotRoom(s: Stop, portrait: boolean) {
  const full = s.pad * (s.context ?? TOUR.context);
  return portrait ? 1 + (full - 1) * 0.4 : full;
}

const camPos: V3 = [0, 0, 0];
const camTgt: V3 = [0, 0, 0];
const a: V3 = [0, 0, 0];
const b: V3 = [0, 0, 0];
const dirA: V3 = [0, 0, 0];
const dirB: V3 = [0, 0, 0];
/** the flight is routed out through the front of the hoistway */
const FRONT: V3 = [0.06, 0.16, 0.99];

/**
 * How far out the camera stands through a flight: 0 parked on a plate, 1 at
 * the top of the arc.
 *
 * A raised cosine. It leaves a plate and settles onto the next one at no rate
 * at all, so neither end jerks, and its steepest point is no steeper than a
 * plain sine's — easing the ends by squaring off the middle instead would buy
 * the calm arrival by making the crossing itself faster, which is the part
 * that reads as the camera darting about.
 */
function arcOf(t: number) {
  const s = Math.sin(Math.PI * t);
  return s * s;
}

/** camera pose of a single stop */
function poseOf(s: Stop, p: number, e: Explosion, aspect: number, fov: number, out: { pos: V3; tgt: V3 }) {
  stopAt(out.tgt, s, p, e);
  const portrait = aspect < 1;
  const n = portrait ? NORMALS_PORTRAIT[s.face] : NORMALS[s.face];
  const d = frameDistance(s.size, fov, aspect) * shotRoom(s, portrait);
  out.pos[0] = out.tgt[0] + n[0] * d;
  out.pos[1] = out.tgt[1] + n[1] * d;
  out.pos[2] = out.tgt[2] + n[2] * d;
}

const poseA = { pos: a, tgt: [0, 0, 0] as V3 };
const poseB = { pos: b, tgt: [0, 0, 0] as V3 };

/**
 * Camera pose for the tour. Mirrors `cameraPose`'s contract so the rig can
 * swap between the two layouts.
 *
 * Between stops the pose is split into a direction and a distance rather than
 * interpolated as a point: two stops on opposite sides of the shaft would
 * otherwise cancel out and drag the lens straight through the machine. The
 * direction swings out to the front and the distance grows, so the flight is
 * an arc around the hoistway with the whole of it in view at the halfway mark.
 */
export function tourPose(p: number, explode: number, aspect: number, mobile: boolean): CameraPose {
  const fov = mobile ? TOUR.fovMobile : TOUR.fov;
  const e = explosion(p, explode);
  const { i, next, t } = tourAt(p);
  poseOf(STOPS[i], p, e, aspect, fov, poseA);
  poseOf(STOPS[next], p, e, aspect, fov, poseB);

  let da = 0;
  let db = 0;
  for (let k = 0; k < 3; k++) {
    dirA[k] = poseA.pos[k] - poseA.tgt[k];
    dirB[k] = poseB.pos[k] - poseB.tgt[k];
    da += dirA[k] * dirA[k];
    db += dirB[k] * dirB[k];
  }
  da = Math.sqrt(da) || 1;
  db = Math.sqrt(db) || 1;

  const arc = arcOf(t);
  const swing = TOUR.swing * arc;
  let len = 0;
  for (let k = 0; k < 3; k++) {
    const d = dirA[k] / da + (dirB[k] / db - dirA[k] / da) * t;
    camPos[k] = d * (1 - swing) + FRONT[k] * swing;
    len += camPos[k] * camPos[k];
  }
  len = Math.sqrt(len) || 1;

  const dist = (da + (db - da) * t) * (1 + (STOPS[i].liftoff ?? TOUR.liftoff) * arc);
  for (let k = 0; k < 3; k++) {
    camTgt[k] = poseA.tgt[k] + (poseB.tgt[k] - poseA.tgt[k]) * t;
    camPos[k] = camTgt[k] + (camPos[k] / len) * dist;
  }
  return { position: camPos, target: camTgt, fov };
}

const blendPos: V3 = [0, 0, 0];
const blendTgt: V3 = [0, 0, 0];

/**
 * Straight flight between two arbitrary poses, used while the page is riding
 * to another floor: the camera leaves where it stands and arrives at the
 * destination stop without walking through the ones in between. Same arc as
 * an ordinary flight — direction and distance are blended separately and the
 * path swings out to the front — so it never cuts through the machine.
 *
 * The swing is added as a multiple of the *arrival* distance rather than
 * multiplying the current one: a ride can begin while the camera is already
 * mid-flight and far out, and multiplying that again would hurl it into the
 * distance at the first frame.
 */
export function blendPoses(
  fromPos: V3,
  fromTgt: V3,
  toPos: V3,
  toTgt: V3,
  t: number,
  fov: number
): CameraPose {
  let da = 0;
  let db = 0;
  for (let k = 0; k < 3; k++) {
    dirA[k] = fromPos[k] - fromTgt[k];
    dirB[k] = toPos[k] - toTgt[k];
    da += dirA[k] * dirA[k];
    db += dirB[k] * dirB[k];
  }
  da = Math.sqrt(da) || 1;
  db = Math.sqrt(db) || 1;

  const arc = arcOf(t);
  const swing = TOUR.swing * arc;
  let len = 0;
  for (let k = 0; k < 3; k++) {
    const d = dirA[k] / da + (dirB[k] / db - dirA[k] / da) * t;
    blendPos[k] = d * (1 - swing) + FRONT[k] * swing;
    len += blendPos[k] * blendPos[k];
  }
  len = Math.sqrt(len) || 1;

  const dist = da + (db - da) * t + TOUR.rideLift * arc * db;
  for (let k = 0; k < 3; k++) {
    blendTgt[k] = fromTgt[k] + (toTgt[k] - fromTgt[k]) * t;
    blendPos[k] = blendTgt[k] + (blendPos[k] / len) * dist;
  }
  return { position: blendPos, target: blendTgt, fov };
}
