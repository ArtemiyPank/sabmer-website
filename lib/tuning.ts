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
  /** ms after the last wheel notch before the gesture counts as over */
  handFor: 140,
  /**
   * ms of quiet that separates one wheel gesture from the next.
   *
   * Generous on purpose: under load a browser delivers wheel events in bursts,
   * and a short gap would cut one flick into several gestures — each of them
   * starting over with the page handed back to the visitor, which is the one
   * state where nothing holds it to the plates.
   */
  gestureGap: 220,
  /**
   * How far a notch has to fall below the biggest one of the gesture before
   * it reads as momentum rather than a hand. A trackpad's notches wobble
   * while the fingers move, so this is a share of the peak, not of the notch
   * before it.
   */
  fade: 0.6,
  /** how many fallen notches in a row settle it */
  fadeFor: 3,
  /** px: a gesture whose biggest notch is smaller than this is not a throw */
  wheelPeak: 10,
  /** ms without the page being pushed: the browser's own fling is spent */
  stillFor: 320,
  /** ms a landing is held before the visitor gets the page back regardless */
  holdMax: 2200,
  /**
   * ms of stillness after which the page counts as having come to rest.
   *
   * Long enough that the pause between two flicks of a wheel is not mistaken
   * for a stop — being taken somewhere between notches would read as the page
   * fighting the hand on it.
   */
  restMs: 900,
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
  rideLift: 3.2,
  /** how strongly the middle of a flight is pulled to the front */
  swing: 0.85,
  /** field of view the framing is computed for */
  fov: 34,
  fovMobile: 42,
  /** scroll progress by which the doors have shut and the car may set off */
  depart: 0.17,
  /** scroll progress over which the doors close */
  doorsShutBy: 0.16,
  /**
   * How much of the sign the closing doors must have covered before the spot
   * in front of them counts as having nothing left to look at.
   */
  signLost: 0.5,
} as const;

/**
 * The lettering on the plates: how big it reads, how wide it sets, and how the
 * parts of a plate are spaced. `components/elevator3d/parts/Engraved.tsx`
 * draws to these.
 */
export const PLATE = {
  /**
   * The type scale, as a share of the distance the camera reads the plate
   * from. A plate's own size says nothing about how large its lettering will
   * look: the camera frames each plate to fill the shot, so a bigger plate is
   * simply read from further away. Tie the type to that distance and the body
   * copy comes out the same size on screen on every plate.
   */
  typeScale: 0.00911,
  /**
   * The longest line of body copy, in units of the type size. Much past this
   * and the eye loses its place returning to the left edge.
   */
  measure: 24,
  /** px per metre of plate, and the largest canvas either side may take */
  pxPerM: 1000,
  maxPx: 2048,
  /**
   * The clear border of paper around the lettering, in units of the type size
   * — the same measure the rhythm below is written in. Reading it off the type
   * rather than off the plate keeps the border even on a plate of any shape,
   * and the plate is cut to the copy plus this on every side.
   *
   * The ends are given far more than the sides: copy sets ragged on the right,
   * so a side margin looks wider than it measures, while the top and bottom
   * sit flush against the ink and look tighter than they are.
   *
   * The ends are a wish rather than a rule. A plate with more copy than room
   * gives up its border along with the rest of its air, before it gives up any
   * type size — see `fitNote` in parts/Engraved.tsx.
   */
  pad: { side: 2, ends: 6 },
  /**
   * The vertical rhythm. Every gap is clear space between the ink of what
   * precedes it and the ink of what follows, so a gap of the same size means
   * the same amount of visible air on every plate.
   *
   * The measure to judge these against is the body's own leading: two lines of
   * copy leave about 0.7 units of clear space between them, so anything meant
   * to read as a break has to be plainly wider than that.
   */
  air: {
    /** units, on each side of a rule */
    rule: 1,
    /**
     * Under a heading, as a share of the heading's own size — not of the
     * body's. A title is more than twice the size of the copy under it, and a
     * gap that would be generous under a bold sub-head reads as a collision
     * under a title.
     */
    heading: 0.9,
    /**
     * Units, between one run of copy and the next. Comfortably more than the
     * leading inside a paragraph (about 0.7 units), or a new run reads as one
     * more line of the one above it.
     */
    copy: 1.5,
    /** units, between one list item and the next */
    item: 1.15,
    /**
     * Share of the name's size, between a name and the line under it — its
     * role, or the years worked. They belong together, so this is the one gap
     * narrower than the body's leading; narrower still and they stick.
     */
    caption: 0.35,
  },
  /**
   * How far the air may be squeezed on a plate with more copy than room. A
   * crowded plate gives up its spacing before its type size, because the copy
   * has to read at one size on every plate.
   */
  airMin: 0.5,
  /**
   * The shot each plate is framed for. The real viewport aspect would mean
   * redrawing every plate on resize; one representative shape per device class
   * is enough, because it is the *class* that changes which side of the plate
   * the framing runs out of first — width in a portrait phone, height on a
   * landscape desktop.
   */
  shot: { desktop: 1.6, mobile: 0.46 },
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
