"use client";

import {
  motion,
  useTransform,
  easeInOut,
  type MotionValue,
} from "framer-motion";

/**
 * Animated technical schematic of a machine-room traction elevator,
 * drawn in blueprint style. Purely a function of `progress` (0..1):
 *
 *   0    — cab assembled at the top of the shaft, counterweight hidden below
 *   0.3  — doors detach
 *   0.5  — panels / ceiling / floor detach
 *   0.7  — frame & roller guides, style goes full-blueprint
 *   0.9+ — fully exploded, annotation labels & dimension lines visible
 *   1    — cab at the bottom, counterweight at the top
 *
 * All colors come from CSS vars (--bp-*) so the drawing adapts to theme.
 */

// ---- geometry constants (viewBox 900 x 1000) -------------------------------
const CAB_TRAVEL = 330; // cab: top of shaft -> bottom
const CW_TRAVEL = -516; // counterweight: resting on its buffer -> top of shaft
const CW_TOP = 716; // counterweight initial top edge (on buffer, bottom of shaft)

const LINE = "var(--bp-line)";
const SOFT = "var(--bp-line-soft)";
const ACCENT = "var(--bp-accent)";
const FILL = "var(--bp-fill)";
const FILL2 = "var(--bp-fill-2)";

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

type Props = {
  /** scroll progress 0..1 (MotionValue so the SVG never re-renders on scroll) */
  progress: MotionValue<number>;
  /** 0..1 multiplier for the exploded-view offsets (mobile passes ~0.35 or 0) */
  explode?: number;
  /** hide dimension lines / part labels (mobile) */
  showAnnotations?: boolean;
};

export default function ElevatorSchematic({
  progress,
  explode = 1,
  showAnnotations = true,
}: Props) {
  // ---- vertical travel ----
  const cabY = useTransform(progress, [0, 1], [0, CAB_TRAVEL]);
  const cwY = useTransform(progress, [0, 1], [0, CW_TRAVEL]);
  const cabRopeY2 = useTransform(cabY, (v) => 180 + v); // sheave -> car hitch
  const cwRopeY2 = useTransform(cwY, (v) => CW_TOP + v); // sheave -> cwt hitch

  // ---- staggered disassembly sub-progress (each eased within its window) ----
  const doorsP = useTransform(progress, [0.26, 0.5], [0, 1], { ease: easeInOut });
  const operP = useTransform(progress, [0.34, 0.58], [0, 1], { ease: easeInOut });
  const ceilP = useTransform(progress, [0.44, 0.66], [0, 1], { ease: easeInOut });
  const wallP = useTransform(progress, [0.48, 0.7], [0, 1], { ease: easeInOut });
  const frameP = useTransform(progress, [0.62, 0.86], [0, 1], { ease: easeInOut });
  const labelP = useTransform(progress, [0.78, 0.95], [0, 1], { ease: easeInOut });

  const f = explode;
  // part offsets (exploded position = base * subProgress * explode)
  const doorLX = useTransform(doorsP, (v) => -178 * v * f);
  const doorRX = useTransform(doorsP, (v) => 178 * v * f);
  const doorYv = useTransform(doorsP, (v) => 18 * v * f);
  const operY = useTransform(operP, (v) => -22 * v * f);
  const ceilY = useTransform(ceilP, (v) => -105 * v * f);
  const floorY = useTransform(ceilP, (v) => 58 * v * f);
  const wallLX = useTransform(wallP, (v) => -96 * v * f);
  const wallRX = useTransform(wallP, (v) => 96 * v * f);
  const wallYv = useTransform(wallP, (v) => -88 * v * f);
  const gTLx = useTransform(frameP, (v) => -46 * v * f);
  const gTRx = useTransform(frameP, (v) => 46 * v * f);
  const gTy = useTransform(frameP, (v) => -40 * v * f);
  const gBy = useTransform(frameP, (v) => 46 * v * f);

  // ---- solid -> blueprint style transition (fills dissolve per stage) ----
  const doorFill = useTransform(doorsP, [0, 0.65], [1, 0]);
  const operFill = useTransform(operP, [0, 0.65], [1, 0]);
  const ceilFill = useTransform(ceilP, [0, 0.65], [1, 0]);
  const wallFill = useTransform(wallP, [0, 0.65], [1, 0]);
  const frameFill = useTransform(frameP, [0, 0.65], [0.9, 0]);

  // annotations fade in at the end (slight upward drift)
  const annO = useTransform(labelP, (v) => (showAnnotations ? v : 0));
  const annY = useTransform(labelP, (v) => (1 - v) * 8);

  return (
    <svg
      viewBox="0 0 900 1000"
      className="h-full w-auto"
      aria-hidden="true"
      style={{ overflow: "hidden" }}
    >
      <defs>
        <pattern
          id="bp-hatch"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="8" stroke={SOFT} strokeWidth="1" />
        </pattern>
        <marker
          id="dim-arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={ACCENT} />
        </marker>
      </defs>

      {/* ================= static background: machine room ================= */}
      <g stroke={LINE} fill="none" strokeWidth="1.2" opacity="0.85">
        {/* machine room boundary */}
        <path
          d="M220 158 V8 H700 V158"
          strokeDasharray="6 5"
          opacity="0.5"
        />
        <text
          x="232"
          y="30"
          fill={SOFT}
          stroke="none"
          fontFamily={MONO}
          fontSize="10"
          letterSpacing="2"
        >
          MACHINE ROOM
        </text>

        {/* floor slab (3 segments, gaps = rope slots) */}
        {[
          [220, 390],
          [420, 540],
          [570, 700],
        ].map(([a, b]) => (
          <g key={a}>
            <rect
              x={a}
              y={158}
              width={b - a}
              height={14}
              fill="url(#bp-hatch)"
            />
            <line x1={a} y1={158} x2={b} y2={158} />
            <line x1={a} y1={172} x2={b} y2={172} />
          </g>
        ))}

        {/* hoisting machine: motor + pedestal + axle */}
        <rect x="565" y="38" width="100" height="80" strokeWidth="1.4" />
        {[583, 601, 619, 637].map((x) => (
          <line key={x} x1={x} y1="46" x2={x} y2="110" opacity="0.55" />
        ))}
        <line x1="492" y1="71" x2="565" y2="71" />
        <line x1="492" y1="85" x2="565" y2="85" />
        <rect x="585" y="118" width="60" height="40" />
        <line x1="585" y1="118" x2="645" y2="158" opacity="0.55" />
        <line x1="645" y1="118" x2="585" y2="158" opacity="0.55" />

        {/* traction sheave */}
        <circle cx="480" cy="78" r="75" strokeWidth="1.6" />
        <circle cx="480" cy="78" r="12" strokeWidth="1.4" />
        {[0, 60, 120].map((a) => (
          <line
            key={a}
            x1={480 + 63 * Math.cos((a * Math.PI) / 180)}
            y1={78 + 63 * Math.sin((a * Math.PI) / 180)}
            x2={480 - 63 * Math.cos((a * Math.PI) / 180)}
            y2={78 - 63 * Math.sin((a * Math.PI) / 180)}
            opacity="0.5"
          />
        ))}
      </g>

      {/* ================= static background: shaft ================= */}
      <g stroke={LINE} fill="none" strokeWidth="1.2" opacity="0.7">
        {/* walls */}
        <rect x="266" y="158" width="14" height="794" fill="url(#bp-hatch)" />
        <rect x="620" y="158" width="14" height="794" fill="url(#bp-hatch)" />
        <line x1="280" y1="158" x2="280" y2="952" strokeWidth="1.4" />
        <line x1="266" y1="158" x2="266" y2="952" />
        <line x1="620" y1="158" x2="620" y2="952" strokeWidth="1.4" />
        <line x1="634" y1="158" x2="634" y2="952" />

        {/* pit floor */}
        <rect x="266" y="940" width="368" height="12" fill="url(#bp-hatch)" />
        <line x1="266" y1="940" x2="634" y2="940" strokeWidth="1.4" />

        {/* guide rails: car (302/308, 502/508) + counterweight (519/525, 585/591) */}
        {[302, 308, 502, 508].map((x) => (
          <line key={x} x1={x} y1="172" x2={x} y2="940" opacity="0.8" />
        ))}
        {[519, 525, 585, 591].map((x) => (
          <line key={x} x1={x} y1="172" x2={x} y2="940" opacity="0.6" />
        ))}
        {/* rail brackets */}
        {[252, 430, 608, 786].map((y) => (
          <g key={y} opacity="0.5">
            <line x1="280" y1={y} x2="302" y2={y} />
            <line x1="280" y1={y + 4} x2="302" y2={y + 4} />
            <line x1="508" y1={y} x2="620" y2={y} />
            <line x1="508" y1={y + 4} x2="620" y2={y + 4} />
          </g>
        ))}

        {/* buffers (car @405, cwt @555) */}
        {[405, 555].map((cx) => (
          <g key={cx} strokeWidth="1.3" opacity="0.9">
            <rect x={cx - 22} y="934" width="44" height="6" />
            <rect x={cx - 18} y="886" width="36" height="6" />
            <polyline
              points={`${cx},892 ${cx - 11},897 ${cx + 11},905 ${cx - 11},913 ${cx + 11},921 ${cx - 11},929 ${cx},934`}
            />
          </g>
        ))}
      </g>

      {/* ================= counterweight (travels up) ================= */}
      <motion.g style={{ y: cwY, willChange: "transform" }}>
        <motion.g
          stroke={LINE}
          strokeWidth="1.3"
          fill={FILL}
          style={{ fillOpacity: frameFill }}
        >
          <rect x="528" y={CW_TOP} width="54" height="170" strokeWidth="1.5" />
          {/* filler weights */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line
              key={i}
              x1="528"
              y1={CW_TOP + 24 + i * 24}
              x2="582"
              y2={CW_TOP + 24 + i * 24}
              opacity="0.7"
            />
          ))}
          {/* guide shoes */}
          <rect x="517" y={CW_TOP + 4} width="11" height="12" fill="none" />
          <rect x="582" y={CW_TOP + 4} width="11" height="12" fill="none" />
          <rect x="517" y={CW_TOP + 154} width="11" height="12" fill="none" />
          <rect x="582" y={CW_TOP + 154} width="11" height="12" fill="none" />
          {/* rope hitch */}
          <rect x="549" y={CW_TOP - 8} width="12" height="8" fill="none" />
        </motion.g>
        <motion.g style={{ opacity: annO }}>
          <text
            x="665"
            y={CW_TOP + 84}
            fill={ACCENT}
            fontFamily={MONO}
            fontSize="11"
            letterSpacing="1.5"
          >
            COUNTERWEIGHT
          </text>
          <line
            x1="660"
            y1={CW_TOP + 80}
            x2="586"
            y2={CW_TOP + 80}
            stroke={ACCENT}
            strokeWidth="1"
            opacity="0.8"
          />
        </motion.g>
      </motion.g>

      {/* ================= ropes (lengths follow cab / cwt) ================= */}
      <g stroke={LINE} strokeWidth="1.5" fill="none" opacity="0.9">
        {/* over the sheave */}
        <path d="M409 78 A71 71 0 0 1 551 78" />
        <path d="M401 78 A79 79 0 0 1 559 78" />
        {/* car side falls */}
        <motion.line x1="401" y1="78" x2="401" y2={cabRopeY2} />
        <motion.line x1="409" y1="78" x2="409" y2={cabRopeY2} />
        {/* counterweight side falls */}
        <motion.line x1="551" y1="78" x2="551" y2={cwRopeY2} />
        <motion.line x1="559" y1="78" x2="559" y2={cwRopeY2} />
      </g>

      {/* ================= the cab (travels down + explodes) ================= */}
      <motion.g style={{ y: cabY, willChange: "transform" }}>
        {/* ---- car frame / sling (stays central, style dissolves) ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.4"
          fill={FILL2}
          style={{ fillOpacity: frameFill }}
        >
          {/* rope hitch */}
          <rect x="399" y="180" width="12" height="8" fill="none" />
          {/* crosshead */}
          <rect x="315" y="188" width="180" height="14" />
          <line x1="315" y1="195" x2="495" y2="195" opacity="0.6" />
          {/* uprights */}
          <rect x="317" y="202" width="8" height="256" />
          <rect x="485" y="202" width="8" height="256" />
          {/* safety plank */}
          <rect x="315" y="458" width="180" height="14" />
          <line x1="315" y1="465" x2="495" y2="465" opacity="0.6" />
        </motion.g>

        {/* ---- roller guides (4, pop out diagonally) ---- */}
        {(
          [
            [296, 176, gTLx, gTy],
            [496, 176, gTRx, gTy],
            [296, 460, gTLx, gBy],
            [496, 460, gTRx, gBy],
          ] as const
        ).map(([x, y, mx, my], i) => (
          <motion.g
            key={i}
            stroke={LINE}
            strokeWidth="1.2"
            fill={FILL2}
            style={{ x: mx, y: my, fillOpacity: frameFill }}
          >
            <rect x={x} y={y} width="18" height="14" />
            <circle cx={x + 9} cy={y + 7} r="3.5" fill="none" />
          </motion.g>
        ))}

        {/* ---- ceiling ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.4"
          fill={FILL}
          style={{ y: ceilY, fillOpacity: ceilFill }}
        >
          <rect x="329" y="214" width="152" height="14" />
          <circle cx="381" cy="221" r="3" fill="none" opacity="0.7" />
          <circle cx="429" cy="221" r="3" fill="none" opacity="0.7" />
        </motion.g>

        {/* ---- door operator ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.3"
          fill={FILL2}
          style={{ y: operY, fillOpacity: operFill }}
        >
          <rect x="337" y="232" width="136" height="20" />
          <line x1="349" y1="242" x2="461" y2="242" opacity="0.7" />
          <circle cx="349" cy="242" r="6" fill="none" />
          <circle cx="461" cy="242" r="6" fill="none" />
        </motion.g>

        {/* ---- side wall panels ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.4"
          fill={FILL}
          style={{ x: wallLX, y: wallYv, fillOpacity: wallFill }}
        >
          <rect x="329" y="228" width="10" height="210" />
        </motion.g>
        <motion.g
          stroke={LINE}
          strokeWidth="1.4"
          fill={FILL}
          style={{ x: wallRX, y: wallYv, fillOpacity: wallFill }}
        >
          <rect x="471" y="228" width="10" height="210" />
        </motion.g>

        {/* ---- doors (center-opening, detach first) ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.4"
          fill={FILL2}
          style={{ x: doorLX, y: doorYv, fillOpacity: doorFill }}
        >
          <rect x="341" y="256" width="64" height="182" />
          <line x1="373" y1="256" x2="373" y2="438" opacity="0.6" />
        </motion.g>
        <motion.g
          stroke={LINE}
          strokeWidth="1.4"
          fill={FILL2}
          style={{ x: doorRX, y: doorYv, fillOpacity: doorFill }}
        >
          <rect x="405" y="256" width="64" height="182" />
          <line x1="437" y1="256" x2="437" y2="438" opacity="0.6" />
        </motion.g>

        {/* ---- platform / floor ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.4"
          fill={FILL}
          style={{ y: floorY, fillOpacity: ceilFill }}
        >
          <rect x="329" y="438" width="152" height="14" />
          <line x1="329" y1="445" x2="481" y2="445" opacity="0.5" />
        </motion.g>

        {/* ---- annotations: labels + dimension lines (fade in last) ---- */}
        <motion.g
          fill={ACCENT}
          stroke="none"
          fontFamily={MONO}
          fontSize="11"
          letterSpacing="1.5"
          style={{ opacity: annO, y: annY }}
        >
          <text x="405" y="96" textAnchor="middle">CEILING PANEL</text>
          <text x="405" y="258" textAnchor="middle">DOOR OPERATOR</text>
          <text x="238" y="126" textAnchor="middle">SIDE PANEL</text>
          <text x="572" y="126" textAnchor="middle">SIDE PANEL</text>
          <text x="195" y="478" textAnchor="middle">CAR DOOR</text>
          <text x="615" y="478" textAnchor="middle">CAR DOOR</text>
          <text x="280" y="536" textAnchor="middle">PLATFORM</text>
          <text x="240" y="516" textAnchor="end">ROLLER GUIDE</text>

          <g stroke={ACCENT} strokeWidth="1" fill="none" opacity="0.8">
            {/* leader lines */}
            <line x1="244" y1="512" x2="252" y2="512" />
            {/* dimension: car width */}
            <line x1="329" y1="514" x2="329" y2="552" />
            <line x1="481" y1="514" x2="481" y2="552" />
            <line
              x1="333"
              y1="546"
              x2="477"
              y2="546"
              markerStart="url(#dim-arrow)"
              markerEnd="url(#dim-arrow)"
            />
          </g>
          <text x="405" y="540" textAnchor="middle" fontSize="10">
            CAR WIDTH 1600
          </text>
        </motion.g>
      </motion.g>

      {/* ================= title block (static, drawing corner) ================= */}
      <g
        stroke={SOFT}
        fill="none"
        strokeWidth="1"
        fontFamily={MONO}
        opacity="0.9"
      >
        <rect x="690" y="896" width="194" height="72" />
        <rect x="694" y="900" width="186" height="64" />
        <text x="700" y="918" fill={SOFT} stroke="none" fontSize="9" letterSpacing="1">
          TRACTION ELEVATOR — G.A.
        </text>
        <text x="700" y="936" fill={SOFT} stroke="none" fontSize="9" letterSpacing="1">
          DWG NO. EL-2041
        </text>
        <text x="700" y="954" fill={SOFT} stroke="none" fontSize="9" letterSpacing="1">
          SCALE 1:50 · REV C
        </text>
      </g>
    </svg>
  );
}
