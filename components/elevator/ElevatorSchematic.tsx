"use client";

import {
  motion,
  useTransform,
  easeInOut,
  type MotionValue,
} from "framer-motion";

/**
 * Animated technical schematic of a machine-room traction elevator
 * (loosely modeled after Mitsubishi Electric MR traction lifts),
 * drawn in blueprint style. Purely a function of `progress` (0..1):
 *
 *   0    — cab assembled at the top of the shaft, counterweight on its buffer
 *   0.3  — doors (with hangers) and door sill detach
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
const CAB_BOTTOM = 480; // initial y of the safety-plank underside
const CW_BOTTOM = CW_TOP + 170;

const LINE = "var(--bp-line)";
const SOFT = "var(--bp-line-soft)";
const ACCENT = "var(--bp-accent)";
const FILL = "var(--bp-fill)";
const FILL2 = "var(--bp-fill-2)";
const PAPER = "var(--bp-paper)";

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

// landing levels: y in viewBox -> elevation label
const LEVELS: Array<[number, string]> = [
  [272, "+9.900"],
  [472, "+6.600"],
  [672, "+3.300"],
  [872, "±0.000"],
];

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
  const cabRopeY2 = useTransform(cabY, (v) => 174 + v); // sheave -> hitch springs
  const cwRopeY2 = useTransform(cwY, (v) => CW_TOP + v); // sheave -> cwt hitch

  // traveling cable: junction box on the wall -> underside of the car
  const travelCableD = useTransform(cabY, (v) => {
    const cb = CAB_BOTTOM + v;
    const sag = (608 + cb) / 2 + 120;
    return `M 289 608 C 289 ${sag}, 365 ${sag}, 365 ${cb}`;
  });
  // compensating chain: underside of the car -> underside of the counterweight
  const compChainD = useTransform(progress, (p) => {
    const cb = CAB_BOTTOM + CAB_TRAVEL * p;
    const cwB = CW_BOTTOM + CW_TRAVEL * p;
    const sag = Math.min(Math.max(cb, cwB) + 55, 926);
    return `M 445 ${cb} C 445 ${sag}, 535 ${sag}, 535 ${cwB}`;
  });

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
  const sillY = useTransform(doorsP, (v) => 14 * v * f);
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

      {/* ================= datum: hoistway centerline ================= */}
      <line
        x1="405"
        y1="40"
        x2="405"
        y2="960"
        stroke={SOFT}
        strokeWidth="1"
        strokeDasharray="16 5 3 5"
        opacity="0.35"
      />

      {/* ================= landing levels ================= */}
      <g fontFamily={MONO} fontSize="9" opacity="0.75">
        {LEVELS.map(([y, label]) => (
          <g key={y}>
            <line
              x1="280"
              y1={y}
              x2="620"
              y2={y}
              stroke={SOFT}
              strokeWidth="1"
              strokeDasharray="7 6"
              opacity="0.45"
            />
            {/* landing sill stub on the wall */}
            <rect x="280" y={y - 5} width="5" height="5" fill={SOFT} stroke="none" />
            {/* elevation datum: open triangle + label */}
            <polygon
              points={`194,${y - 7} 202,${y - 7} 198,${y}`}
              fill="none"
              stroke={SOFT}
              strokeWidth="1"
            />
            <text x="190" y={y} textAnchor="end" fill={SOFT} letterSpacing="1">
              {label}
            </text>
          </g>
        ))}
      </g>

      {/* ================= static background: machine room ================= */}
      <g stroke={LINE} fill="none" strokeWidth="1.2" opacity="0.85">
        {/* machine room boundary + lifting hook under the ceiling */}
        <path d="M220 158 V8 H700 V158" strokeDasharray="6 5" opacity="0.5" />
        <path d="M480 8 V20 M480 20 a5 5 0 1 0 5 5" strokeWidth="1.3" />
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

        {/* floor slab (segments, gaps = rope & governor slots) */}
        {[
          [220, 283],
          [297, 390],
          [420, 540],
          [570, 700],
        ].map(([a, b]) => (
          <g key={a}>
            <rect x={a} y={158} width={b - a} height={14} fill="url(#bp-hatch)" />
            <line x1={a} y1={158} x2={b} y2={158} />
            <line x1={a} y1={172} x2={b} y2={172} />
          </g>
        ))}

        {/* controller cabinet */}
        <g strokeWidth="1.3">
          <rect x="222" y="64" width="44" height="94" fill={PAPER} />
          <rect x="226" y="70" width="36" height="82" />
          {[82, 89, 96].map((y) => (
            <line key={y} x1="232" y1={y} x2="256" y2={y} opacity="0.55" />
          ))}
          <circle cx="257" cy="112" r="1.8" />
        </g>
        {/* conduit: cabinet -> machine terminal box */}
        <path d="M253 64 V20 H615 V24" strokeDasharray="3 4" opacity="0.5" />

        {/* hoisting machine: motor + terminal box + brake + pedestal + axle */}
        <rect x="565" y="38" width="100" height="80" strokeWidth="1.4" />
        {[583, 601, 619, 637].map((x) => (
          <line key={x} x1={x} y1="46" x2={x} y2="110" opacity="0.55" />
        ))}
        <rect x="600" y="24" width="30" height="14" />
        <line x1="492" y1="71" x2="565" y2="71" />
        <line x1="492" y1="85" x2="565" y2="85" />
        {/* brake disc + calipers on the axle */}
        <rect x="556" y="56" width="10" height="44" />
        <rect x="552" y="46" width="18" height="10" />
        <rect x="552" y="100" width="18" height="10" />
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

        {/* overspeed governor + rope loop down to pit tension device */}
        <g strokeWidth="1.2">
          <circle cx="290" cy="128" r="20" strokeWidth="1.4" />
          <circle cx="290" cy="128" r="4" />
          <line x1="276" y1="114" x2="304" y2="142" opacity="0.5" />
          <line x1="304" y1="114" x2="276" y2="142" opacity="0.5" />
          <rect x="278" y="148" width="24" height="4" />
          <line x1="286" y1="148" x2="286" y2="895" opacity="0.7" />
          <line x1="294" y1="148" x2="294" y2="895" opacity="0.7" />
          <circle cx="290" cy="895" r="12" strokeWidth="1.4" />
          <rect x="278" y="907" width="24" height="20" fill={PAPER} />
          <line x1="281" y1="913" x2="299" y2="913" opacity="0.6" />
          <line x1="281" y1="920" x2="299" y2="920" opacity="0.6" />
        </g>
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

        {/* terminal limit switches on the car rail */}
        {[206, 818].map((y) => (
          <g key={y} opacity="0.8">
            <rect x="308" y={y} width="12" height="12" />
            <line x1="320" y1={y + 6} x2="330" y2={y - 2} />
            <circle cx="331" cy={y - 3} r="2" />
          </g>
        ))}

        {/* traveling-cable junction box on the wall */}
        <rect x="282" y="592" width="14" height="16" fill={PAPER} strokeWidth="1.2" />

        {/* pit stop switch */}
        <g opacity="0.8">
          <rect x="600" y="898" width="14" height="14" />
          <line x1="614" y1="905" x2="620" y2="905" />
        </g>

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

      {/* ================= traveling cable & compensating chain ================= */}
      <g fill="none" opacity="0.75">
        <motion.path d={travelCableD} stroke={LINE} strokeWidth="1.4" />
        <motion.path
          d={compChainD}
          stroke={LINE}
          strokeWidth="1.3"
          strokeDasharray="3 3"
        />
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
          {/* filler weights + tie rods */}
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
          <line x1="542" y1={CW_TOP + 8} x2="542" y2={CW_TOP + 162} opacity="0.5" />
          <line x1="568" y1={CW_TOP + 8} x2="568" y2={CW_TOP + 162} opacity="0.5" />
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
          {/* rope hitch plate + suspension springs */}
          <rect x="380" y="174" width="50" height="4" fill="none" />
          {[387, 405, 423].map((x) => (
            <polyline
              key={x}
              fill="none"
              strokeWidth="1.1"
              points={`${x},178 ${x - 3},180 ${x + 3},183 ${x - 3},186 ${x},188`}
            />
          ))}
          {/* crosshead */}
          <rect x="315" y="188" width="180" height="14" />
          <line x1="315" y1="195" x2="495" y2="195" opacity="0.6" />
          {/* uprights */}
          <rect x="317" y="202" width="8" height="256" />
          <rect x="485" y="202" width="8" height="256" />
          {/* governor rope clamp + safety linkage pull rod */}
          <rect x="286" y="208" width="14" height="14" fill="none" />
          <line x1="300" y1="215" x2="317" y2="215" />
          <line x1="293" y1="222" x2="325" y2="472" opacity="0.7" />
          {/* safety plank */}
          <rect x="315" y="458" width="180" height="14" />
          <line x1="315" y1="465" x2="495" y2="465" opacity="0.6" />
          {/* progressive safety gears under the plank */}
          <g strokeWidth="1.2">
            <rect x="322" y="472" width="20" height="14" fill="none" />
            <line x1="326" y1="486" x2="334" y2="472" opacity="0.7" />
            <rect x="468" y="472" width="20" height="14" fill="none" />
            <line x1="472" y1="486" x2="480" y2="472" opacity="0.7" />
          </g>
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
            <circle cx={x + 3} cy={y + 7} r="2" fill="none" opacity="0.8" />
            <circle cx={x + 15} cy={y + 7} r="2" fill="none" opacity="0.8" />
          </motion.g>
        ))}

        {/* ---- ceiling (with exhaust fan) ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.4"
          fill={FILL}
          style={{ y: ceilY, fillOpacity: ceilFill }}
        >
          <rect x="329" y="214" width="152" height="14" />
          <circle cx="381" cy="221" r="3" fill="none" opacity="0.7" />
          <circle cx="429" cy="221" r="3" fill="none" opacity="0.7" />
          <rect x="445" y="206" width="20" height="8" fill="none" strokeWidth="1.2" />
          <line x1="450" y1="206" x2="450" y2="214" opacity="0.6" />
          <line x1="455" y1="206" x2="455" y2="214" opacity="0.6" />
          <line x1="460" y1="206" x2="460" y2="214" opacity="0.6" />
        </motion.g>

        {/* ---- door operator (with drive motor) ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.3"
          fill={FILL2}
          style={{ y: operY, fillOpacity: operFill }}
        >
          <rect x="337" y="230" width="136" height="20" />
          <line x1="349" y1="240" x2="461" y2="240" opacity="0.7" />
          <circle cx="349" cy="240" r="6" fill="none" />
          <circle cx="461" cy="240" r="6" fill="none" />
          <rect x="448" y="233" width="20" height="14" fill="none" strokeWidth="1.1" />
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

        {/* ---- doors (center-opening, hangers on top, detach first) ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.4"
          fill={FILL2}
          style={{ x: doorLX, y: doorYv, fillOpacity: doorFill }}
        >
          <rect x="341" y="250" width="64" height="6" fill="none" strokeWidth="1.1" />
          <circle cx="352" cy="253" r="2.5" fill="none" strokeWidth="1" />
          <circle cx="394" cy="253" r="2.5" fill="none" strokeWidth="1" />
          <rect x="341" y="256" width="64" height="176" />
          <line x1="373" y1="256" x2="373" y2="432" opacity="0.6" />
          <line x1="403" y1="262" x2="403" y2="426" opacity="0.8" strokeWidth="1" />
        </motion.g>
        <motion.g
          stroke={LINE}
          strokeWidth="1.4"
          fill={FILL2}
          style={{ x: doorRX, y: doorYv, fillOpacity: doorFill }}
        >
          <rect x="405" y="250" width="64" height="6" fill="none" strokeWidth="1.1" />
          <circle cx="416" cy="253" r="2.5" fill="none" strokeWidth="1" />
          <circle cx="458" cy="253" r="2.5" fill="none" strokeWidth="1" />
          <rect x="405" y="256" width="64" height="176" />
          <line x1="437" y1="256" x2="437" y2="432" opacity="0.6" />
          <line x1="407" y1="262" x2="407" y2="426" opacity="0.8" strokeWidth="1" />
        </motion.g>

        {/* ---- door sill (separates downward, hovers above the plank) ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.2"
          fill={FILL2}
          style={{ y: sillY, fillOpacity: doorFill }}
        >
          <rect x="335" y="432" width="140" height="6" />
          {[370, 405, 440].map((x) => (
            <line key={x} x1={x} y1="432" x2={x} y2="438" opacity="0.6" />
          ))}
        </motion.g>

        {/* ---- platform / floor (with toe-guard apron) ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.4"
          fill={FILL}
          style={{ y: floorY, fillOpacity: ceilFill }}
        >
          <rect x="329" y="438" width="152" height="14" />
          <line x1="329" y1="445" x2="481" y2="445" opacity="0.5" />
          <polygon points="365,452 445,452 437,472 373,472" fill="none" strokeWidth="1.2" />
          <line x1="373" y1="462" x2="437" y2="462" opacity="0.5" />
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
          <text x="280" y="542" textAnchor="middle">PLATFORM</text>
          <text x="240" y="516" textAnchor="end">ROLLER GUIDE</text>
          <text x="240" y="490" textAnchor="end">SAFETY GEAR</text>

          <g stroke={ACCENT} strokeWidth="1" fill="none" opacity="0.8">
            {/* leader lines */}
            <line x1="244" y1="512" x2="252" y2="512" />
            <line x1="244" y1="486" x2="320" y2="479" />
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
            {/* dimension: sling height */}
            <line x1="328" y1="204" x2="344" y2="204" />
            <line x1="328" y1="456" x2="344" y2="456" />
            <line
              x1="334"
              y1="208"
              x2="334"
              y2="452"
              markerStart="url(#dim-arrow)"
              markerEnd="url(#dim-arrow)"
            />
          </g>
          <text x="405" y="540" textAnchor="middle" fontSize="10">
            CAR WIDTH 1600
          </text>
          <text
            x="345"
            y="330"
            fontSize="10"
            transform="rotate(-90 345 330)"
            textAnchor="middle"
          >
            H 2560
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
        <rect x="690" y="880" width="194" height="88" />
        <rect x="694" y="884" width="186" height="80" />
        <text x="700" y="902" fill={SOFT} stroke="none" fontSize="9" letterSpacing="1">
          TRACTION ELEVATOR — G.A.
        </text>
        <text x="700" y="920" fill={SOFT} stroke="none" fontSize="9" letterSpacing="1">
          DWG NO. EL-2041
        </text>
        <text x="700" y="938" fill={SOFT} stroke="none" fontSize="9" letterSpacing="1">
          SCALE 1:50 · REV C
        </text>
        <text x="700" y="956" fill={SOFT} stroke="none" fontSize="9" letterSpacing="1">
          SHEET 1 OF 1
        </text>
      </g>
    </svg>
  );
}
