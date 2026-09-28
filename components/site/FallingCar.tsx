/**
 * The car running past the last level on the drawing.
 *
 * The site letters every landing the way a drawing does — a small triangle and
 * a height to three decimals, `▽ +3.300`, a floor every 3.3 metres. A page that
 * is not there is, in that notation, a level that is not in the schedule: the
 * car passes `±0.000`, the last one anybody surveyed, and goes on down toward
 * an ordinate nobody drew.
 *
 * The joke is told in the drawing's own hand, which is why there is no wording
 * in here beyond the two ordinates. Everything the page says in words is said
 * beside it.
 *
 * Drawn rather than rendered: this is a page a visitor reaches by mistake, and
 * it has no business fetching a megabyte of scene to say so. Lines and one
 * moving group, no script — so it also draws before hydration, and in a browser
 * with neither WebGL nor JavaScript.
 *
 * What moves and what does not is the whole of the illusion. The rails are
 * continuous and still, because rails are: they are the fixed thing the car is
 * measured against. What streams is the shaft-work bolted to them — a landing
 * sill and its brackets, one set every storey — and against still rails that
 * reads as falling rather than as a ladder being wound past.
 */

/** viewBox units between landings; the loop translates by exactly this */
const PITCH = 64;

export default function FallingCar({ label }: { label: string }) {
  return (
    <svg
      viewBox="0 0 264 400"
      role="img"
      aria-label={label}
      style={{ width: "100%", height: "auto" }}
    >
      <defs>
        <clipPath id="fall-shaft">
          <rect x="30" y="52" width="140" height="296" />
        </clipPath>
      </defs>

      <g fill="none" stroke="var(--bp-line)" strokeWidth="1.2" strokeLinecap="square">
        {/* ---- the shaft, bracketed by its two ordinates ---- */}
        <path d="M30 36V364M170 36V364" strokeOpacity="0.45" />
        <path d="M30 52h140" strokeDasharray="6 4" strokeOpacity="0.8" />
        <path d="M30 348h140" strokeDasharray="6 4" strokeOpacity="0.8" />

        <g clipPath="url(#fall-shaft)">
          {/* the guide rails: continuous, and the only still thing in the shaft */}
          <path d="M46 52v296M154 52v296" strokeOpacity="0.32" />

          {/*
            The shaft-work that streams past. One storey of spare above and
            below, so a translation of exactly one pitch leaves no seam.
          */}
          <g className="fall-stream">
            {[-1, 0, 1, 2, 3, 4, 5].map((i) => (
              <g key={i} transform={`translate(0 ${i * PITCH})`}>
                {/* a landing sill, unnumbered — down here nothing was surveyed */}
                <path d="M30 96h14M156 96h14" strokeOpacity="0.6" />
                {/* the brackets that tie the rails back to the wall */}
                <path d="M38 96h16M146 96h16" strokeOpacity="0.4" />
              </g>
            ))}
          </g>

          {/* ---- the car ---- */}
          <g className="fall-car">
            {/* the hoist rope, parted; its loose end still falls with the car */}
            <g
              className="fall-rope"
              stroke="var(--bp-accent)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M100 168V128" />
              <path d="M100 128l-9 -11 9 -11 -7 -10" />
            </g>
            {/* the sling: crosshead, stiles, platform */}
            <path d="M58 168h84M58 168v84M142 168v84M58 252h84" />
            {/* the cab, and the joint its doors meet on */}
            <rect x="66" y="178" width="68" height="64" strokeOpacity="0.85" />
            <path d="M100 178v64" strokeOpacity="0.3" />
            {/* a guide shoe at each corner, riding the rails */}
            <path
              d="M40 176h18M142 176h18M40 244h18M142 244h18"
              strokeWidth="2.8"
            />
          </g>
        </g>

        {/* ---- the ordinates, in the drawing's own hand ---- */}
        {/*
          Ordinates are written left to right whatever language the page is in:
          a drawing's notation is not prose. Left to inherit the document's
          direction, the Hebrew page anchors each label at its right edge — so
          the numbers run back across the shaft — and moves the minus of
          −404.000 to the far end, where it reads as something else entirely.
        */}
        <g
          stroke="none"
          fontFamily="ui-monospace, SFMono-Regular, monospace"
          fontSize="12.5"
          style={{ direction: "ltr", unicodeBidi: "isolate" }}
        >
          <text x="178" y="56" fill="var(--bp-accent)">▽</text>
          <text x="193" y="56" fill="var(--bp-line)">±0.000</text>
          <text x="178" y="352" fill="var(--bp-accent)">▽</text>
          <text x="193" y="352" fill="var(--bp-accent)">−404.000</text>
        </g>
      </g>
    </svg>
  );
}
