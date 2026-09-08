/**
 * Every number that decides how the page *feels*, gathered in one place.
 *
 * Geometry lives elsewhere on purpose: the millimetres of the machine are in
 * `components/elevator3d/dims.ts`, and where each plate sits on which part is
 * in the `STOPS` table in `components/elevator3d/tour.ts`, because those are
 * descriptions of the drawing rather than dials to turn. Two settings cannot
 * live here at all and are named where they are: the height of a page section
 * (`--tour-section` in `app/globals.css`), which the browser must read as CSS,
 * and the per-stop framing overrides in that same `STOPS` table.
 *
 * Nothing here is read at build time, so any of it can be changed and seen
 * immediately.
 */

/**
 * The page's own coast — what happens after the visitor lets go. See
 * `components/site/ScrollSnap.tsx` for the rule these serve: the coast is
 * ours to run, and it may not carry the page across a plate.
 */
export const COAST = {
  /** px/ms the coast may never exceed, however hard the page is thrown */
  maxSpeed: 3.4,
  /** ms: how long a coast left to its own devices takes to fade */
  tau: 430,
  /** ms: the quickest it may be made to fade when aimed at a plate */
  tauMin: 240,
  /** ms: and the slowest */
  tauMax: 900,
  /** px/ms at which the coast is judged over */
  minSpeed: 0.03,
  /** px/ms below which a release is not worth coasting at all */
  throwSpeed: 0.12,
  /** ms after a wheel notch that did not fade: a hand is still on it */
  handFor: 140,
  /** ms without the page being pushed: the browser's own fling is spent */
  stillFor: 320,
  /** ms a landing is held before the visitor gets the page back regardless */
  holdMax: 2200,
} as const;

/**
 * The camera tour: how long it rests on a plate, how wide it swings between
 * them, and how much of the machine each shot keeps in view.
 */
export const TOUR = {
  /** share of the gap between two stops spent parked on the first */
  dwell: 0.34,
  /** how much room around a plate the shot leaves (1 = plate fills the frame) */
  context: 2.25,
  /** how far the camera swings out over the middle of a flight */
  liftoff: 3.5,
  /** the same for a ride, as a multiple of the arrival distance */
  rideLift: 1.8,
  /** how strongly the middle of a flight is pulled to the front */
  swing: 0.85,
  /** field of view the framing is computed for */
  fov: 34,
  fovMobile: 42,
  /** scroll progress by which the doors have shut and the car may set off */
  depart: 0.17,
  /** scroll progress over which the doors close */
  doorsShutBy: 0.16,
} as const;

/** Navigation: the trip the page takes when a floor button is pressed. */
export const RIDE = {
  /** ms: the shortest such trip */
  baseMs: 700,
  /** ms added per pixel of distance */
  msPerPx: 0.62,
  /** ms: and the longest, however far it has to go */
  maxMs: 3000,
  /** ms the camera takes to ease back on after a trip is cut short */
  settleMs: 450,
} as const;

/** What the renderer is asked for. Draw calls, not pixels, are the cost here. */
export const SCENE = {
  /** device pixel ratio: [floor, ceiling] */
  dpr: [1, 2] as [number, number],
  dprMobile: [1.5, 2] as [number, number],
  /** the camera the canvas starts with; the tour poses it every frame after */
  camera: { fov: 32, near: 0.5, far: 120, position: [12, 10, 22] as [number, number, number] },
} as const;

/**
 * How the drawing follows the page. It trails the scroll through a spring so
 * that however the scroll position jumps — a fling, a jump, a ride — the
 * machine only ever glides. Overdamped on purpose: it must not overshoot a
 * plate and swing back.
 */
export const DRAWING = {
  spring: { stiffness: 165, damping: 34, mass: 1, restDelta: 0.00008 },
  /** below this width the scene draws its cheaper, closer-framed variant */
  mobileQuery: "(max-width: 767px)",
} as const;
