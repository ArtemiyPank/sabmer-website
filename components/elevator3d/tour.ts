/**
 * Camera tour for the "on detail" layout: the page text is lettered onto the
 * surface of real components, and the camera flies from one to the next as
 * the page is scrolled, resting on each while its section is readable.
 *
 * Every stop names a flat face of a part that is actually exposed at the
 * moment the camera arrives — the landing door before anything moves, the
 * cab back wall once the doors have slid open, the side panels once they
 * have swung out, and so on.
 */

import {
  CAB_BACK,
  CAB_X,
  CWT_X,
  CWT_Z,
  LDOOR_PANEL_Z,
  LEVELS,
  SILL_Z,
  carY,
  cwtY,
  explosion,
  type CameraPose,
  type Explosion,
  type V3,
} from "./dims";

/** which way the lettered face looks; also where the camera comes from */
export type Face = "front" | "left" | "right";

export type Stop = {
  /** matches the key in SiteNotes */
  id: "hero" | "about" | "founder0" | "founder1" | "careers" | "contacts";
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
};

export const STOPS: Stop[] = [
  // the top landing door, straight ahead before anything has moved
  { id: "hero", group: "world", at: [0, LEVELS[3] + 1.05, LDOOR_PANEL_Z + 0.03], face: "front", size: [0.84, 1.28], pad: 1.2, p: 0.02, context: 1.8 },
  // the cab back wall, in view once the doors have slid fully apart
  { id: "about", group: "wallBack", at: [0, 1.5, CAB_BACK + 0.03], face: "front", size: [0.95, 0.95], pad: 1.3, p: 0.36, context: 1.7 },
  // the two cab side panels, once they have swung out of the car
  { id: "founder0", group: "wallL", at: [-CAB_X - 0.03, 1.2, 0], face: "left", size: [1.15, 0.98], pad: 1.35, p: 0.55, context: 1.7 },
  { id: "founder1", group: "wallR", at: [CAB_X + 0.03, 1.2, 0], face: "right", size: [1.15, 0.98], pad: 1.35, p: 0.7, context: 1.7 },
  // the counterweight, rising past the car
  { id: "careers", group: "cwt", at: [CWT_X + 0.09, 1.3, CWT_Z], face: "right", size: [0.66, 1.02], pad: 1.2, p: 0.86, context: 1.45 },
  // the car apron under the sill, at the bottom of the travel
  { id: "contacts", group: "floor", at: [0, -0.42, SILL_Z[1] + 0.03], face: "front", size: [1.1, 0.62], pad: 1.35, p: 1, context: 1.6 },
];

/** unit normal of a lettered face, tilted toward the front so the shot reads */
const NORMALS: Record<Face, V3> = {
  front: [0.22, 0.1, 0.97],
  left: [-0.88, 0.1, 0.47],
  right: [0.88, 0.1, 0.47],
};

/** rotation that turns a +z plane onto the face */
export const FACE_ROT: Record<Face, V3> = {
  front: [0, 0, 0],
  left: [0, -Math.PI / 2, 0],
  right: [0, Math.PI / 2, 0],
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
    out[1] = cwtY(p) + s.at[1];
    out[2] = s.at[2];
    return out;
  }
  const off = e[s.group];
  out[0] = s.at[0] + off[0];
  out[1] = carY(p) + s.at[1] + off[1];
  out[2] = s.at[2] + off[2];
  return out;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

/**
 * Where the tour is at progress `p`: index of the stop being looked at, the
 * next one, and how far the flight between them has got. The camera rests on
 * a stop for the first two thirds of its slice, then travels.
 */
/** share of the gap between stops spent parked on the first one */
const DWELL = 0.42;

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
  const t = local <= DWELL ? 0 : smooth(Math.min((local - DWELL) / (1 - DWELL), 1));
  return { i, next: i + 1, t };
}

/**
 * How strongly a stop's lettering shows. It leaves early in the flight and
 * the next one only lands at the end of it, so the middle of every transition
 * is the machine alone — the flight reads as travelling to the next part
 * rather than as one plate dissolving into another.
 */
export function stopOpacity(index: number, p: number) {
  const { i, next, t } = tourAt(p);
  if (index === i && index === next) return 1;
  if (index === i) return 1 - smooth(Math.min(t / 0.32, 1));
  if (index === next) return smooth(Math.max((t - 0.68) / 0.32, 0));
  return 0;
}

/** distance that frames a `size` face in a `fov` camera at this aspect */
function frameDistance(size: [number, number], fov: number, aspect: number) {
  const halfV = Math.tan((fov / 2) * (Math.PI / 180));
  const byHeight = size[1] / 2 / halfV;
  const byWidth = size[0] / 2 / (halfV * Math.max(aspect, 0.35));
  return Math.max(byHeight, byWidth);
}

const camPos: V3 = [0, 0, 0];
const camTgt: V3 = [0, 0, 0];
const a: V3 = [0, 0, 0];
const b: V3 = [0, 0, 0];

/**
 * How much room around the plate the shot leaves: the point is to arrive at a
 * *part* of the elevator, so the lettering fills roughly half the frame and
 * the component carrying it stays in view.
 */
const CONTEXT = 1.75;

/** camera pose of a single stop */
function poseOf(s: Stop, p: number, e: Explosion, aspect: number, fov: number, out: { pos: V3; tgt: V3 }) {
  stopAt(out.tgt, s, p, e);
  const n = NORMALS[s.face];
  // portrait screens are framed by width and have vertical slack to spare
  const pad = aspect < 1 ? 1 + (s.pad - 1) * 0.35 : s.pad;
  const context = s.context ?? CONTEXT;
  // phones frame by width and already sit further out, so they need less room
  const d = frameDistance(s.size, fov, aspect) * pad * (aspect < 1 ? 1 + (context - 1) * 0.55 : context);
  out.pos[0] = out.tgt[0] + n[0] * d;
  out.pos[1] = out.tgt[1] + n[1] * d;
  out.pos[2] = out.tgt[2] + n[2] * d;
}

const poseA = { pos: a, tgt: [0, 0, 0] as V3 };
const poseB = { pos: b, tgt: [0, 0, 0] as V3 };

/**
 * Camera pose for the tour. Mirrors `cameraPose`'s contract so the rig can
 * swap between the two layouts.
 */
export function tourPose(p: number, explode: number, aspect: number, mobile: boolean): CameraPose {
  const fov = mobile ? 42 : 34;
  const e = explosion(p, explode);
  const { i, next, t } = tourAt(p);
  poseOf(STOPS[i], p, e, aspect, fov, poseA);
  poseOf(STOPS[next], p, e, aspect, fov, poseB);
  for (let k = 0; k < 3; k++) {
    camPos[k] = poseA.pos[k] + (poseB.pos[k] - poseA.pos[k]) * t;
    camTgt[k] = poseA.tgt[k] + (poseB.tgt[k] - poseA.tgt[k]) * t;
  }
  // dolly out over the middle of the flight: the whole hoistway comes back
  // into view between two details instead of the lens skimming the steel
  const out = 1 + 0.8 * Math.sin(Math.PI * t);
  for (let k = 0; k < 3; k++) camPos[k] = camTgt[k] + (camPos[k] - camTgt[k]) * out;
  return { position: camPos, target: camTgt, fov };
}
