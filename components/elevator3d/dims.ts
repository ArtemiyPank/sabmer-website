/**
 * Single source of truth for the 3D hoistway layout.
 *
 * Units: meters. Y is up.
 *   x = 0  shaft / car centre line (+x = counterweight side, "right")
 *   z = 0  car centre in depth      (+z = landing side, toward the camera)
 *   y = 0  bottom landing (±0.000)
 *
 * The machine-room-less traction elevator modelled here: gearless machine on
 * a bedplate resting on the rail tops, 2:1 underslung roping, side
 * counterweight (right side, toward the back), roller guide shoes on the car,
 * progressive safety gear on the safety plank, overspeed governor on the left
 * car rail with its tension sheave in the pit.
 *
 * Every part module positions itself with these constants so pulleys, ropes,
 * rails and shoes line up. Car-local coordinates: y = 0 is the car floor
 * (sill level); add carY(p) to get world coordinates.
 */

export type V3 = [number, number, number];

// ---- building --------------------------------------------------------------
export const FLOORS = 4;
export const FLOOR_H = 3.3;
export const TRAVEL = FLOOR_H * (FLOORS - 1); // 9.9
export const PIT = 1.7;
export const OVERHEAD = 4.5;
export const PIT_FLOOR = -PIT; // -1.7
export const SHAFT_TOP = TRAVEL + OVERHEAD; // 14.4, underside of the overhead slab
export const LEVELS = [0, 1, 2, 3].map((i) => i * FLOOR_H); // bottom -> top
export const LEVEL_LABELS = ["±0.000", "+3.300", "+6.600", "+9.900"];

// ---- hoistway (clear inside) ---------------------------------------------
export const SHAFT_X = 1.25; // side wall planes at x = ±SHAFT_X (not rendered solid)
export const SHAFT_BACK = -1.05; // back wall inner face
export const SHAFT_FRONT = 1.15; // front wall plane (landing doors live here)
export const WALL_T = 0.2;
export const SLAB_T = 0.25; // floor slabs: y = level - SLAB_T .. level
export const LANDING_DEPTH = 1.4; // landing slab from SHAFT_FRONT outward (+z)

// landing door assembly (per level, on the front wall plane)
export const LDOOR_OPEN_W = 0.9; // clear opening
export const LDOOR_H = 2.1;
export const LDOOR_PANEL_Z = 1.17; // centre of the (translucent) panels
export const LDOOR_SILL_Z: [number, number] = [1.03, 1.2]; // z range of the landing sill
export const LDOOR_JAMB_X = 0.5; // ± centre of the jambs

// ---- guide rails ---------------------------------------------------------------
export const RAIL_X = 0.72; // car rail blade tips at x = ±RAIL_X (blade points to the car)
export const RAIL_Z = 0;
export const RAIL_BLADE_H = 0.062; // T89: blade height (along x, from foot to tip)
export const RAIL_FOOT_W = 0.089; // foot width (along z)
export const RAIL_T = 0.016; // blade / foot thickness
export const RAIL_BOTTOM = PIT_FLOOR + 0.05; // rails stand on base plates in the pit
export const RAIL_TOP = 12.85; // bedplate underside
export const MACHINE_BEAM_H = 0.1; // machine support beams between the rail caps and the bedplate
export const RAIL_CAP_T = 0.02; // rail cap plates the beams rest on
export const RAIL_END = RAIL_TOP - MACHINE_BEAM_H - RAIL_CAP_T; // 12.73, top of the rail sections
export const RAIL_JOINTS = [3.5, 8.5]; // fishplate joints (y)
export const RAIL_BRACKETS = [-1.0, 1.5, 4.0, 6.5, 9.0, 11.5]; // wall bracket heights (y)

// counterweight rails (T50), blades point toward the counterweight centre (±z)
export const CWT_RAIL_X = 1.08;
export const CWT_RAIL_Z: [number, number] = [-0.15, -0.95]; // blade tips
export const CWT_RAIL_BLADE_H = 0.05;
export const CWT_RAIL_FOOT_W = 0.05;

// ---- car (car-local coordinates; y = 0 at the car floor) --------------------------
export const CAB_W = 1.1; // clear inside width (x)
export const CAB_D = 1.4; // clear inside depth (z)
export const CAB_H = 2.2; // clear inside height
export const PANEL_T = 0.03; // wall panel thickness
export const CAB_X = CAB_W / 2 + PANEL_T; // 0.58 outer half width
export const CAB_BACK = -CAB_D / 2; // -0.7 inside face of the back wall
export const CAB_FRONT = CAB_D / 2; // +0.7 door line (inside face of the front returns)
export const PLATFORM_T = 0.12; // platform: y = -PLATFORM_T .. 0
export const CEILING_T = 0.06; // ceiling: y = CAB_H .. CAB_H + CEILING_T

// sling
export const STILE_X = 0.64; // stile (upright channel) centre |x|
export const STILE_W = 0.08; // channel size along x
export const STILE_D = 0.12; // channel size along z
export const CROSSHEAD_Y = 2.6; // crosshead centre; two channels 0.18 tall, z = ±0.09
export const CROSSHEAD_H = 0.18;
export const PLANK_Y = -0.35; // safety plank centre; two channels 0.16 tall, z = ±0.1
export const PLANK_H = 0.16;
export const SLING_HALF_SPAN = 0.72; // crosshead / plank reach: x = ±0.72 (to the rail tips)
export const CAR_TOP_Y = CROSSHEAD_Y + CROSSHEAD_H / 2; // 2.69
export const SHOE_Y_TOP = 2.6; // roller guide shoe centres (on the crosshead / plank ends)
export const SHOE_Y_BOT = -0.35;

// car doors (centre opening, on the front)
export const DOOR_Z = 0.74; // panel centre
export const DOOR_W = 0.42; // each panel
export const DOOR_H = 2.1;
export const DOOR_T = 0.03;
export const DOOR_OPEN = 0.42; // slide distance when open
export const DOOR_HEADER_Y = 2.22; // hanger track centre (y 2.15 .. 2.3), z = DOOR_Z
export const SILL_Z: [number, number] = [0.68, 0.88]; // car sill z range, top at y = 0
export const APRON_BOTTOM = -0.8; // toe guard from the sill down to this y

// 2:1 underslung roping: pulleys under the platform, in the rope plane
export const ROPE_Z = -0.55; // all hoist ropes run in this vertical plane
export const ROPE_OFFSETS = [-0.03, -0.01, 0.01, 0.03]; // 4 ropes, z offsets from ROPE_Z
export const ROPE_R = 0.008; // rope radius (exaggerated for visibility)
export const PULLEY_R = 0.14;
export const PULLEY_X = 0.52; // car pulley centres at x = ±PULLEY_X
export const PULLEY_Y = -0.55; // car pulley centres (car-local)
export const ROPE_DROP_X = PULLEY_X + PULLEY_R; // 0.66: the car-side vertical rope runs (±)
export const CAR_BOTTOM_Y = PULLEY_Y - PULLEY_R; // -0.69 lowest car point

// governor (left rail, z offset so the rope clears the rail and its brackets)
export const GOV_X = -0.86;
export const GOV_Z = 0.32;
export const GOV_R = 0.15;
export const GOV_Y = 12.55; // governor sheave centre
export const GOV_TENSION_Y = -1.15; // tension sheave centre (pit)
export const GOV_ROPE_X: [number, number] = [GOV_X - GOV_R, GOV_X + GOV_R]; // -1.01 (outer), -0.71 (car side)
export const GOV_CLAMP_Y = CROSSHEAD_Y; // rope clamp on the car crosshead (car-local)

// traveling cable: from the car underside, hanging loop, up the left side to
// the junction box on the left wall plane
export const TCABLE_CAR: V3 = [-0.45, PLANK_Y - PLANK_H / 2, 0.45]; // car-local anchor
export const TCABLE_WALL: V3 = [-SHAFT_X + 0.05, 12.0, 0.45]; // junction box
export const TCABLE_R = 0.018;

// ---- counterweight (world x/z; y = frame bottom moves) ----------------------------
export const CWT_X = 1.08; // centre
export const CWT_T = 0.14; // thickness (x)
export const CWT_Z = ROPE_Z; // centre (z); frame spans z = -0.91 .. -0.19
export const CWT_W = 0.72; // frame width (z), guide shoes reach the rails at -0.15 / -0.95
export const CWT_H = 2.6; // frame height
export const CWT_PULLEY_R = 0.12;
export const CWT_PULLEY_DY = CWT_H + 0.16; // pulley centre above the frame bottom
export const CWT_BOTTOM_0 = -0.9; // frame bottom when the car is at the top (on its buffer)

// ---- machine (bedplate on the rail tops) ----------------------------------------------
export const BED_Y: [number, number] = [RAIL_TOP, RAIL_TOP + 0.2]; // 12.85 .. 13.05
export const BED_Z: [number, number] = [ROPE_Z + 0.2, ROPE_Z - 0.2]; // two channels at z = -0.35 / -0.75
export const BED_X: [number, number] = [-0.9, 1.22]; // span
export const SHEAVE_C: V3 = [0.81, 13.35, ROPE_Z]; // traction sheave centre, axis along z
export const SHEAVE_R = 0.15; // rope drops at x = 0.66 (car side) and 0.96 (cwt side)
export const SHEAVE_W = 0.1; // rim width (4 grooves)
export const MOTOR_Z: [number, number] = [-0.95, -0.65]; // housing behind the sheave
export const MOTOR_R = 0.27;
export const HITCH_Y = 12.5; // rope ends: bottom of the hitch springs (both sides)
export const HITCH_CAR_X = -ROPE_DROP_X; // -0.66
export const HITCH_CWT_X = CWT_X + CWT_PULLEY_R; // 1.2
export const HOOK_BEAM_Y = SHAFT_TOP - 0.15; // lifting beam under the overhead slab

// ---- pit ----------------------------------------------------------------------------
export const CAR_BUFFER_X = 0.45; // ± (under the plank, z = 0)
export const BUFFER_TOP = -0.93; // top of the car buffers (oil, 0.77 tall)
export const CWT_BUFFER_TOP = -0.95; // spring buffer under the counterweight
export const LADDER: V3 = [-1.15, PIT_FLOOR, 0.7]; // pit ladder foot

// ---- controller (top landing, beside the door, outside the shaft) -----------------
export const CABINET: V3 = [-1.0, LEVELS[3], 1.45]; // cabinet base centre (x, floor y, z)

// ---- animation ---------------------------------------------------------------------
/** car floor level (world y) for scroll progress p in 0..1 */
export const carY = (p: number) => TRAVEL * (1 - p);
/** counterweight frame bottom (world y) */
export const cwtY = (p: number) => CWT_BOTTOM_0 + TRAVEL * p;

/** 0..1 eased ramp inside the [a, b] progress window */
export function stagger(p: number, a: number, b: number) {
  const t = Math.min(Math.max((p - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
}

// exploded-view windows (same rhythm as the 2D schematic). The sling window
// starts before the cab opens so the crosshead stays clear of the rising ceiling.
export const W_DOORS: [number, number] = [0.03, 0.3];
export const W_OPERATOR: [number, number] = [0.1, 0.38];
export const W_CEIL_FLOOR: [number, number] = [0.18, 0.48];
export const W_WALLS: [number, number] = [0.24, 0.55];
export const W_FRAME: [number, number] = [0.22, 0.58];
export const W_LABELS: [number, number] = [0.6, 0.95];

export type Explosion = {
  doorL: V3;
  doorR: V3;
  header: V3; // hanger track + hangers
  operator: V3;
  ceiling: V3; // ceiling + lights + car-top box + railing
  floor: V3; // platform + finish + sill + apron
  wallL: V3;
  wallR: V3;
  wallBack: V3; // + handrail
  returnL: V3; // front return panel (left)
  returnR: V3; // front return panel (right) + COP
  crosshead: V3; // + top guide shoes + governor clamp/lever
  stileL: V3;
  stileR: V3;
  plank: V3; // + bottom shoes + pulleys + safety gear + pull rod
  shoeOut: number; // extra outward |x| for the guide shoes
  safetyOut: number; // extra outward |x| and downward for the safety gear blocks
};

/**
 * Explosion offsets for progress p, scaled by `explode` (1 desktop, ~0.35
 * mobile). Offsets stay inside the hoistway (|x| < 1.2) and above the
 * buffers at p = 1; parts only move toward open space (up, down, toward the
 * camera, sideways in front of the rails).
 */
export function explosion(p: number, explode: number): Explosion {
  const d = stagger(p, ...W_DOORS) * explode;
  const o = stagger(p, ...W_OPERATOR) * explode;
  const c = stagger(p, ...W_CEIL_FLOOR) * explode;
  const w = stagger(p, ...W_WALLS) * explode;
  const f = stagger(p, ...W_FRAME) * explode;
  return {
    doorL: [-DOOR_OPEN * d, 0, 0.26 * d],
    doorR: [DOOR_OPEN * d, 0, 0.26 * d],
    header: [0, 0.3 * o, 0.3 * o],
    operator: [0, 0.5 * o, 0.35 * o],
    ceiling: [0, 1.0 * c, 0],
    floor: [0, -0.2 * c, 0],
    wallL: [-0.55 * w, 0.15 * w, 0],
    wallR: [0.55 * w, 0.15 * w, 0],
    wallBack: [0, 0.2 * w, -0.28 * w],
    returnL: [-0.3 * w, 0, 0.2 * w],
    returnR: [0.3 * w, 0, 0.2 * w],
    crosshead: [0, 1.9 * f, 0],
    stileL: [-0.35 * f, 0, 0.45 * f],
    stileR: [0.35 * f, 0, 0.45 * f],
    plank: [0, -0.4 * f, 0],
    shoeOut: 0.2 * f,
    safetyOut: 0.2 * f,
  };
}

/** world y of the car pulley centres (they hang on the safety plank) */
export function pulleyY(p: number, explode: number) {
  return carY(p) + PULLEY_Y + explosion(p, explode).plank[1];
}

/** world y of the counterweight pulley centre */
export const cwtPulleyY = (p: number) => cwtY(p) + CWT_PULLEY_DY;

/** rotation angle (rad) of the traction sheave: rope speed is 2x car speed */
export const sheaveAngle = (p: number) => (2 * TRAVEL * p) / SHEAVE_R;
export const govAngle = (p: number) => (TRAVEL * p) / GOV_R;

// ---- camera ---------------------------------------------------------------------------
export type CameraPose = { position: V3; target: V3; fov: number };

const DEG = Math.PI / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Deterministic camera pose for progress p. The rig frames the car from the
 * front-right and follows it down the shaft; on desktop it pulls back at the
 * end to show the whole hoistway with the exploded car at the bottom landing.
 */
export function cameraPose(p: number, aspect: number, mobile: boolean): CameraPose {
  const fov = 32;
  const pull = stagger(p, 0.72, 1);
  // visible height (m) at the target distance
  let h = mobile ? lerp(11.5, 16.5, pull) : lerp(10.5, 17.2, pull);
  // portrait screens: make sure the shaft still fits across
  h = Math.max(h, (mobile ? 3.8 : 4.4) / Math.max(aspect, 0.3));
  const az = lerp(30, 38, p) * DEG;
  const el = lerp(12, 6, p) * DEG;
  // follow the car, clamped so the frame never leaves the hoistway
  const minY = PIT_FLOOR - 0.6 + h / 2;
  const maxY = SHAFT_TOP + 0.9 - h / 2;
  const ty = Math.min(Math.max(carY(p) + 1.2, Math.min(minY, maxY)), Math.max(minY, maxY));
  const target: V3 = [0.15, ty, 0];
  const dist = h / 2 / Math.tan((fov / 2) * DEG);
  const position: V3 = [
    target[0] + dist * Math.cos(el) * Math.sin(az),
    target[1] + dist * Math.sin(el),
    target[2] + dist * Math.cos(el) * Math.cos(az),
  ];
  return { position, target, fov };
}
