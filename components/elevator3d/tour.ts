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

/** smootherstep: eases in and out with no kick at either end */
const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

/** which way the lettered face looks; also where the camera comes from */
export type Face = "front" | "left" | "right" | "square";

export type Stop = {
  /** matches the key in SiteNotes */
  id: "hero" | "about" | "founders" | "careers" | "contacts";
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
  // 1. the cab interior, read through the open doors before they shut
  { id: "hero", group: "wallBack", at: [0, 1.56, CAB_BACK + 0.03], face: "square", size: [1, 1.12], pad: 1.2, p: 0.03, context: 2.1 },
  // 2. the flank of the car as it runs down the shaft; the sign sits toward
  //    the front of the panel, clear of the sling stile, the guide rail and
  //    the governor rope, which all run down the middle of the car
  { id: "about", group: "wallL", at: [-CAB_X - 0.09, 1.2, 0.55], face: "left", size: [0.46, 1.02], pad: 1.25, p: 0.36, context: 1.15 },
  // 3. the counterweight, rising past it
  { id: "careers", group: "cwt", at: [CWT_X + 0.09, 1.3, CWT_Z], face: "right", size: [0.66, 1.02], pad: 1.2, p: 0.55, context: 1.35 },
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
  return 1 - smooth(clamp01(p / 0.16));
}

/** the page anchor each stop belongs to, in the order the tour visits them */
export const STOP_SECTIONS: { id: Stop["id"]; anchor: string; key: string }[] = [
  { id: "hero", anchor: "top", key: "home" },
  { id: "about", anchor: "about", key: "about" },
  { id: "careers", anchor: "careers", key: "careers" },
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

/** the car only starts travelling once the doors have shut */
const DEPART = 0.17;
export function travelAt(p: number) {
  return clamp01((clamp01(p) - DEPART) / (1 - DEPART));
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
/** share of the gap between stops spent parked on the first one */
const DWELL = 0.34;

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
 * How much room around the plate the shot leaves: the point is to arrive at a
 * *part* of the elevator, so the lettering fills roughly half the frame and
 * the component carrying it stays in view.
 */
const CONTEXT = 2.25;

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
const dirA: V3 = [0, 0, 0];
const dirB: V3 = [0, 0, 0];
/** the flight is routed out through the front of the hoistway */
const FRONT: V3 = [0.06, 0.16, 0.99];
/** how far out the camera swings over the middle of a flight */
const LIFTOFF = 3.5;
/** the same for a ride, as a multiple of the arrival distance (see blendPoses) */
const RIDE_LIFT = 1.8;
/** how strongly the middle of a flight is pulled to the front */
const SWING = 0.85;

/** camera pose of a single stop */
function poseOf(s: Stop, p: number, e: Explosion, aspect: number, fov: number, out: { pos: V3; tgt: V3 }) {
  stopAt(out.tgt, s, p, e);
  const portrait = aspect < 1;
  const n = portrait ? NORMALS_PORTRAIT[s.face] : NORMALS[s.face];
  const context = s.context ?? CONTEXT;
  // a portrait frame is already limited by its width: keep barely any margin
  const room = portrait ? 1 + (s.pad * context - 1) * 0.4 : s.pad * context;
  const d = frameDistance(s.size, fov, aspect) * room;
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
  const fov = mobile ? 42 : 34;
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

  const arc = Math.sin(Math.PI * t);
  const swing = SWING * arc;
  let len = 0;
  for (let k = 0; k < 3; k++) {
    const d = dirA[k] / da + (dirB[k] / db - dirA[k] / da) * t;
    camPos[k] = d * (1 - swing) + FRONT[k] * swing;
    len += camPos[k] * camPos[k];
  }
  len = Math.sqrt(len) || 1;

  const dist = (da + (db - da) * t) * (1 + LIFTOFF * arc);
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

  const arc = Math.sin(Math.PI * t);
  const swing = SWING * arc;
  let len = 0;
  for (let k = 0; k < 3; k++) {
    const d = dirA[k] / da + (dirB[k] / db - dirA[k] / da) * t;
    blendPos[k] = d * (1 - swing) + FRONT[k] * swing;
    len += blendPos[k] * blendPos[k];
  }
  len = Math.sqrt(len) || 1;

  const dist = da + (db - da) * t + RIDE_LIFT * arc * db;
  for (let k = 0; k < 3; k++) {
    blendTgt[k] = fromTgt[k] + (toTgt[k] - fromTgt[k]) * t;
    blendPos[k] = blendTgt[k] + (blendPos[k] / len) * dist;
  }
  return { position: blendPos, target: blendTgt, fov };
}
