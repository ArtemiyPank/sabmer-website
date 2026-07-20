"use client";

import {
  motion,
  useTransform,
  easeInOut,
  type MotionValue,
} from "framer-motion";

/**
 * Animated technical schematic of a machine-room-less (MRL) traction
 * elevator, loosely modeled after Mitsubishi Electric MRL lifts: the
 * gearless machine, deflector sheave and control panels hang at the top
 * of the hoistway. Drawn in blueprint style, purely a function of
 * `progress` (0..1):
 *
 *   0    — cab assembled at the top, counterweight on its buffer
 *   0.3  — doors (with hangers) and door sill detach
 *   0.5  — panels / ceiling / floor detach
 *   0.7  — frame & roller guides, style goes full-blueprint
 *   0.9+ — fully exploded, annotation labels & dimension lines visible
 *   1    — cab at the bottom, counterweight at the top
 *
 * Roping is 2:1 underslung (kept geometrically consistent): dead-end hitch
 * under the slab @x327 -> down along the car's left side -> under the car
 * via two pulleys on the safety plank (side tangents x327/x470) -> up @x470
 * (in the gap between the door edge and the wall panel) -> over the traction
 * sheave c(512.5,95) r42.5 -> down @x555 -> under the counterweight pulley
 * (tangents x555/x531) -> up @x531 -> dead-end hitch under the slab. The
 * machine rests on a support beam across the rail tops, tied to the slab.
 *
 * All colors come from CSS vars (--bp-*) so the drawing adapts to theme.
 */

// ---- geometry constants (viewBox 900 x 1000) -------------------------------
const CAB_TRAVEL = 330; // cab: top of shaft -> bottom
const CW_TRAVEL = -516; // counterweight: resting on its buffer -> top of shaft
const CW_TOP = 716; // counterweight initial top edge (on buffer, bottom of shaft)
const CAB_BOTTOM = 480; // initial y of the safety-plank underside

const LINE = "var(--bp-line)";
const SOFT = "var(--bp-line-soft)";
const ACCENT = "var(--bp-accent)";
const FILL = "var(--bp-fill)";
const FILL2 = "var(--bp-fill-2)";
const PAPER = "var(--bp-paper)";

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

// landing levels: y in viewBox -> elevation label. Spaced at exactly 1/3 of
// CAB_TRAVEL so the car sill lines up with a landing at p = 0, 1/3, 2/3, 1
// (car sill sits at y≈449 when parked at the top landing).
const LEVELS: Array<[number, string]> = [
  [449, "+9.900"],
  [559, "+6.600"],
  [669, "+3.300"],
  [779, "±0.000"],
];

// numbered balloon callouts: [n, cx, cy, tx, ty] (leader: circle -> target)
const BALLOONS: Array<[number, number, number, number, number]> = [
  [1, 672, 60, 618, 90],
  [2, 240, 96, 274, 64],
  [3, 240, 60, 334, 60],
  [4, 240, 320, 302, 320],
  [5, 672, 340, 591, 340],
  [6, 672, 908, 577, 912],
  [7, 240, 276, 296, 290],
  [8, 240, 878, 274, 899],
  [9, 240, 212, 308, 212],
];

const PARTS: string[] = [
  "TRACTION MACHINE",
  "OVERSPEED GOVERNOR",
  "CONTROL PANEL",
  "CAR GUIDE RAIL",
  "CWT GUIDE RAIL",
  "SPRING BUFFER",
  "TRAVELING CABLE",
  "GOV. TENSION PULLEY",
  "FINAL LIMIT SWITCH",
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
  // 2:1 roping: rope ends are dead-hitched under the slab; the moving ends
  // of the four vertical rope runs follow the underslung car pulleys and
  // the counterweight pulley
  const carPulY = useTransform(cabY, (v) => 490 + v);
  const cwPulY = useTransform(cwY, (v) => CW_TOP - 18 + v);

  // traveling cable: from the control panel at the very top, down the gap
  // between the left wall and the car (visible), then loops under the car
  // to its underside connection
  const travelCableD = useTransform(cabY, (v) => {
    const cb = CAB_BOTTOM + v;
    return [
      "M 357 150",
      "C 357 200, 298 210, 298 270",
      `L 298 ${cb - 40}`,
      `C 298 ${cb + 45}, 365 ${cb + 45}, 365 ${cb}`,
    ].join(" ");
  });

  // ---- staggered disassembly sub-progress (each eased within its window) ----
  // starts almost immediately with the first scroll movement
  const doorsP = useTransform(progress, [0.03, 0.3], [0, 1], { ease: easeInOut });
  const operP = useTransform(progress, [0.1, 0.38], [0, 1], { ease: easeInOut });
  const ceilP = useTransform(progress, [0.18, 0.48], [0, 1], { ease: easeInOut });
  const wallP = useTransform(progress, [0.24, 0.55], [0, 1], { ease: easeInOut });
  const frameP = useTransform(progress, [0.35, 0.7], [0, 1], { ease: easeInOut });
  const labelP = useTransform(progress, [0.6, 0.85], [0, 1], { ease: easeInOut });

  const f = explode;
  // part offsets (exploded position = base * subProgress * explode)
  const doorLX = useTransform(doorsP, (v) => -178 * v * f);
  const doorRX = useTransform(doorsP, (v) => 178 * v * f);
  const doorYv = useTransform(doorsP, (v) => 18 * v * f);
  const sillY = useTransform(doorsP, (v) => 14 * v * f);
  const operY = useTransform(operP, (v) => -22 * v * f);
  const ceilY = useTransform(ceilP, (v) => -105 * v * f);
  const floorY = useTransform(ceilP, (v) => 66 * v * f);
  const wallLX = useTransform(wallP, (v) => -96 * v * f);
  const wallRX = useTransform(wallP, (v) => 96 * v * f);
  const wallYv = useTransform(wallP, (v) => -88 * v * f);
  const gTLx = useTransform(frameP, (v) => -46 * v * f);
  const gTRx = useTransform(frameP, (v) => 46 * v * f);
  const gTy = useTransform(frameP, (v) => -40 * v * f);
  const gBy = useTransform(frameP, (v) => 46 * v * f);
  // extra cab parts
  const trackY = useTransform(operP, (v) => -64 * v * f);
  const copX = useTransform(operP, (v) => 100 * v * f);
  const copY = useTransform(operP, (v) => 80 * v * f);
  const fanX = useTransform(ceilP, (v) => 60 * v * f);
  const fanY = useTransform(ceilP, (v) => -140 * v * f);

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
      // the schematic never mirrors or reorders its text in RTL locales
      style={{ overflow: "hidden", direction: "ltr" }}
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
        <marker
          id="dim-arrow-soft"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L6,3 L0,6 Z" fill={SOFT} />
        </marker>
      </defs>

      {/* ================= datum: hoistway centerline ================= */}
      <line
        x1="405"
        y1="30"
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
            <text
              x="190"
              y={y}
              textAnchor="end"
              fill={SOFT}
              stroke={PAPER}
              strokeWidth="3"
              paintOrder="stroke"
              letterSpacing="1"
            >
              {label}
            </text>
          </g>
        ))}
      </g>

      {/* ================= parts list (top-left drawing corner) ================= */}
      <g stroke={SOFT} fill="none" strokeWidth="1" fontFamily={MONO} opacity="0.85">
        <rect x="20" y="20" width="188" height="211" />
        <line x1="20" y1="42" x2="208" y2="42" />
        <line x1="48" y1="42" x2="48" y2="231" />
        <text x="114" y="35" textAnchor="middle" fill={SOFT} stroke="none" fontSize="9" letterSpacing="2">
          PARTS LIST
        </text>
        {PARTS.map((name, i) => (
          <g key={name}>
            {i > 0 && (
              <line x1="20" y1={42 + i * 21} x2="208" y2={42 + i * 21} opacity="0.5" />
            )}
            <text
              x="34"
              y={57 + i * 21}
              textAnchor="middle"
              fill={SOFT}
              stroke="none"
              fontSize="8.5"
            >
              {i + 1}
            </text>
            <text x="56" y={57 + i * 21} fill={SOFT} stroke="none" fontSize="8.5" letterSpacing="0.5">
              {name}
            </text>
          </g>
        ))}
      </g>

      {/* ================= static: hoistway structure ================= */}
      <g stroke={LINE} fill="none" strokeWidth="1.2" opacity="0.7">
        {/* top slab closing the shaft */}
        <rect x="266" y="8" width="368" height="14" fill="url(#bp-hatch)" />
        <line x1="266" y1="8" x2="634" y2="8" />
        <line x1="266" y1="22" x2="634" y2="22" strokeWidth="1.4" />

        {/* walls */}
        <rect x="266" y="22" width="14" height="930" fill="url(#bp-hatch)" />
        <rect x="620" y="22" width="14" height="930" fill="url(#bp-hatch)" />
        <line x1="280" y1="22" x2="280" y2="952" strokeWidth="1.4" />
        <line x1="266" y1="22" x2="266" y2="952" />
        <line x1="620" y1="22" x2="620" y2="952" strokeWidth="1.4" />
        <line x1="634" y1="22" x2="634" y2="952" />

        {/* pit floor */}
        <rect x="266" y="940" width="368" height="12" fill="url(#bp-hatch)" />
        <line x1="266" y1="940" x2="634" y2="940" strokeWidth="1.4" />

        {/* guide rails: car (302/308, 502/508) + counterweight (519/525, 585/591) */}
        {[302, 308, 502, 508].map((x) => (
          <line key={x} x1={x} y1="40" x2={x} y2="940" opacity="0.8" />
        ))}
        {[519, 525, 585, 591].map((x) => (
          <line key={x} x1={x} y1="40" x2={x} y2="940" opacity="0.6" />
        ))}
        {/* rail brackets with anchor bolts */}
        {[252, 430, 608, 786].map((y) => (
          <g key={y} opacity="0.5">
            <line x1="280" y1={y} x2="302" y2={y} />
            <line x1="280" y1={y + 4} x2="302" y2={y + 4} />
            <circle cx="284" cy={y + 2} r="1.4" />
            <line x1="508" y1={y} x2="620" y2={y} />
            <line x1="508" y1={y + 4} x2="620" y2={y + 4} />
            <circle cx="512" cy={y + 2} r="1.4" />
            <circle cx="616" cy={y + 2} r="1.4" />
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

        {/* pit stop switch on a stand */}
        <g opacity="0.8">
          <rect x="466" y="898" width="14" height="14" />
          <line x1="473" y1="912" x2="473" y2="940" />
        </g>

        {/* pit access ladder on the right wall */}
        <g opacity="0.7">
          <line x1="600" y1="846" x2="600" y2="938" />
          <line x1="612" y1="846" x2="612" y2="938" />
          {[854, 866, 878, 890, 902, 914, 926].map((y) => (
            <line key={y} x1="600" y1={y} x2="612" y2={y} />
          ))}
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

        {/* hoistway width dimension (in the pit zone) */}
        <g opacity="0.8">
          <line x1="280" y1="952" x2="280" y2="978" />
          <line x1="620" y1="952" x2="620" y2="978" />
          <line
            x1="284"
            y1="972"
            x2="616"
            y2="972"
            markerStart="url(#dim-arrow)"
            markerEnd="url(#dim-arrow)"
          />
          <text
            x="450"
            y="966"
            textAnchor="middle"
            fill={SOFT}
            stroke="none"
            fontFamily={MONO}
            fontSize="9"
            letterSpacing="1"
          >
            HOISTWAY 3600
          </text>
        </g>
      </g>

      {/* ================= static: MRL machine hanging at the top ================= */}
      <g stroke={LINE} fill="none" strokeWidth="1.2" opacity="0.85">
        {/* anti-tip stay bracket from the slab to the motor */}
        <rect x="582" y="22" width="16" height="52" strokeWidth="1.3" />
        <line x1="582" y1="34" x2="598" y2="34" opacity="0.5" />
        <line x1="582" y1="46" x2="598" y2="46" opacity="0.5" />

        {/* machine support beam resting on the rail tops (slot for ropes) */}
        <rect x="500" y="146" width="26" height="12" fill="url(#bp-hatch)" />
        <rect x="560" y="146" width="65" height="12" fill="url(#bp-hatch)" />
        <line x1="500" y1="146" x2="526" y2="146" />
        <line x1="560" y1="146" x2="625" y2="146" />
        <line x1="500" y1="158" x2="526" y2="158" />
        <line x1="560" y1="158" x2="625" y2="158" />
        {/* mounting chocks under the sheave rim and the motor */}
        <rect x="503" y="141" width="16" height="5" />
        <rect x="585" y="142" width="15" height="4" />

        {/* traction sheave with rope grooves, hub and spokes */}
        <circle cx="512.5" cy="95" r="42.5" strokeWidth="1.6" />
        <circle cx="512.5" cy="95" r="38" opacity="0.6" />
        <circle cx="512.5" cy="95" r="8" strokeWidth="1.4" />
        {[0, 60, 120].map((a) => (
          <line
            key={a}
            x1={512.5 + 33 * Math.cos((a * Math.PI) / 180)}
            y1={95 + 33 * Math.sin((a * Math.PI) / 180)}
            x2={512.5 - 33 * Math.cos((a * Math.PI) / 180)}
            y2={95 - 33 * Math.sin((a * Math.PI) / 180)}
            opacity="0.5"
          />
        ))}
        {/* center marks */}
        <line
          x1="465"
          y1="95"
          x2="560"
          y2="95"
          strokeDasharray="10 3 2 3"
          opacity="0.35"
        />
        <line
          x1="512.5"
          y1="46"
          x2="512.5"
          y2="144"
          strokeDasharray="10 3 2 3"
          opacity="0.35"
        />
        {/* drive axle: motor -> sheave hub */}
        <line x1="520" y1="88" x2="563" y2="88" />
        <line x1="520" y1="102" x2="563" y2="102" />

        {/* PM motor housing with cooling fins + terminal box */}
        <rect x="563" y="74" width="55" height="68" strokeWidth="1.4" />
        {[572, 581, 590, 599, 608].map((x) => (
          <line key={x} x1={x} y1="80" x2={x} y2="136" opacity="0.55" />
        ))}
        <rect x="600" y="62" width="18" height="12" />
        {/* conduit run: terminal box -> control panel */}
        <path d="M 609 62 V 25 H 362 V 40" strokeDasharray="3 4" opacity="0.5" />

        {/* 2:1 roping dead-end hitches under the slab (car side / cwt side) */}
        {[327, 531].map((x) => (
          <g key={x} strokeWidth="1.3">
            <rect x={x - 8} y="22" width="16" height="8" fill={PAPER} />
            <line x1={x - 5} y1="30" x2={x - 5} y2="36" opacity="0.7" />
            <line x1={x + 5} y1="30" x2={x + 5} y2="36" opacity="0.7" />
          </g>
        ))}

        {/* control panels hanging from the slab */}
        <g strokeWidth="1.3">
          <line x1="342" y1="22" x2="342" y2="40" />
          <line x1="380" y1="22" x2="380" y2="40" />
          <rect x="334" y="40" width="55" height="70" fill={PAPER} />
          <rect x="338" y="45" width="47" height="60" />
          {[56, 63, 70].map((y) => (
            <line key={y} x1="345" y1={y} x2="377" y2={y} opacity="0.55" />
          ))}
          <circle cx="379" cy="88" r="1.8" />
          <rect x="340" y="118" width="34" height="32" fill={PAPER} />
          <line x1="348" y1="118" x2="348" y2="110" />
          <line x1="366" y1="118" x2="366" y2="110" />
        </g>

        {/* overspeed governor under the slab + rope loop down to pit tension */}
        <g strokeWidth="1.2">
          <rect x="274" y="50" width="28" height="28" fill={PAPER} />
          <circle cx="288" cy="64" r="6" strokeWidth="1.3" />
          <circle cx="288" cy="64" r="1.6" />
          <line x1="282" y1="64" x2="282" y2="899" opacity="0.7" />
          <line x1="294" y1="64" x2="294" y2="899" opacity="0.7" />
          <circle cx="288" cy="899" r="6" strokeWidth="1.3" />
          <rect x="276" y="907" width="24" height="20" fill={PAPER} />
          <line x1="279" y1="913" x2="297" y2="913" opacity="0.6" />
          <line x1="279" y1="920" x2="297" y2="920" opacity="0.6" />
        </g>
      </g>

      {/* ================= section dimension chain (OH / TRAVEL / PIT) ========= */}
      <g stroke={SOFT} fill="none" strokeWidth="1" fontFamily={MONO} opacity="0.85">
        {(
          [
            [22, 449, "OH 4500", 235],
            [449, 779, "TRAVEL 9900", 614],
            [779, 940, "PIT 1700", 860],
          ] as const
        ).map(([y1, y2, label, my]) => (
          <g key={label}>
            <line
              x1="655"
              y1={y1 + 4}
              x2="655"
              y2={y2 - 4}
              markerStart="url(#dim-arrow-soft)"
              markerEnd="url(#dim-arrow-soft)"
            />
            <line x1="649" y1={y1} x2="661" y2={y1} />
            <line x1="649" y1={y2} x2="661" y2={y2} />
            <text
              x="668"
              y={my}
              fontSize="9"
              letterSpacing="1"
              fill={SOFT}
              stroke="none"
              textAnchor="middle"
              transform={`rotate(-90 668 ${my})`}
            >
              {label}
            </text>
          </g>
        ))}
      </g>

      {/* ================= floor level table ================= */}
      <g stroke={SOFT} fill="none" strokeWidth="1" fontFamily={MONO} opacity="0.85">
        <rect x="700" y="742" width="184" height="118" />
        <line x1="700" y1="764" x2="884" y2="764" />
        <line x1="728" y1="764" x2="728" y2="860" />
        <line x1="808" y1="764" x2="808" y2="860" />
        <text x="792" y="757" textAnchor="middle" fill={SOFT} stroke="none" fontSize="9" letterSpacing="2">
          LEVELS
        </text>
        {(
          [
            ["4", "+9.900", "3300"],
            ["3", "+6.600", "3300"],
            ["2", "+3.300", "3300"],
            ["1", "±0.000", "—"],
          ] as const
        ).map(([n, lvl, h], i) => (
          <g key={n} fill={SOFT} stroke="none" fontSize="8.5">
            {i > 0 && (
              <line
                x1="700"
                y1={764 + i * 24}
                x2="884"
                y2={764 + i * 24}
                stroke={SOFT}
                opacity="0.5"
              />
            )}
            <text x="714" y={780 + i * 24} textAnchor="middle">{n}</text>
            <text x="768" y={780 + i * 24} textAnchor="middle">{lvl}</text>
            <text x="846" y={780 + i * 24} textAnchor="middle">{h}</text>
          </g>
        ))}
      </g>

      {/* ================= section caption + approval stamp ================= */}
      <text
        x="450"
        y="994"
        textAnchor="middle"
        fill={SOFT}
        fontFamily={MONO}
        fontSize="10"
        letterSpacing="3"
        opacity="0.9"
      >
        SECTION A-A · SCALE 1:50
      </text>
      <g
        transform="rotate(-7 125 330)"
        stroke={ACCENT}
        fill="none"
        strokeWidth="1.2"
        fontFamily={MONO}
        opacity="0.65"
      >
        <rect x="58" y="306" width="134" height="46" rx="3" />
        <rect x="62" y="310" width="126" height="38" rx="2" />
        <text x="125" y="326" textAnchor="middle" fill={ACCENT} stroke="none" fontSize="11" letterSpacing="2">
          APPROVED
        </text>
        <text x="125" y="341" textAnchor="middle" fill={ACCENT} stroke="none" fontSize="7.5" letterSpacing="1">
          FOR EXECUTION · 17.08.2025
        </text>
      </g>

      {/* ================= balloon callouts (parts list refs) ================= */}
      <g fontFamily={MONO} fontSize="9" opacity="0.75">
        {BALLOONS.map(([n, cx, cy, tx, ty]) => {
          const dx = tx - cx;
          const dy = ty - cy;
          const len = Math.hypot(dx, dy) || 1;
          const sx = cx + (dx / len) * 8;
          const sy = cy + (dy / len) * 8;
          return (
            <g key={n}>
              <circle cx={cx} cy={cy} r="8" fill={PAPER} stroke={LINE} strokeWidth="1" />
              <text x={cx} y={cy + 3} textAnchor="middle" fill={LINE}>
                {n}
              </text>
              <line x1={sx} y1={sy} x2={tx} y2={ty} stroke={LINE} strokeWidth="0.8" />
            </g>
          );
        })}
      </g>

      {/* ================= traveling cable ================= */}
      <motion.path
        d={travelCableD}
        stroke={LINE}
        strokeWidth="2"
        fill="none"
        opacity="0.8"
      />

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
          {/* 2:1 pulley on top of the counterweight */}
          <g fill="none">
            <line x1="537" y1={CW_TOP} x2="540" y2={CW_TOP - 12} />
            <line x1="549" y1={CW_TOP} x2="546" y2={CW_TOP - 12} />
            <circle cx="543" cy={CW_TOP - 18} r="12" strokeWidth="1.4" />
            <circle cx="543" cy={CW_TOP - 18} r="3" />
            <path
              d={`M 555 ${CW_TOP - 18} A 12 12 0 0 1 531 ${CW_TOP - 18}`}
              strokeWidth="1.8"
              opacity="0.9"
            />
          </g>
        </motion.g>
        <motion.g style={{ opacity: annO }}>
          <text
            x="665"
            y={CW_TOP + 84}
            fill={ACCENT}
            stroke={PAPER}
            strokeWidth="4"
            paintOrder="stroke"
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

      {/* ================= ropes: 2:1 underslung roping ================= */}
      {/* hitch 1 -> down behind the car -> under car pulleys -> up -> over the
          traction sheave -> down -> under the cwt pulley -> up -> hitch 2 */}
      <g stroke={LINE} strokeWidth="1.8" fill="none" opacity="0.9">
        {/* wrap over the traction sheave */}
        <path d="M 470 95 A 42.5 42.5 0 0 1 555 95" />
        {/* car side: dead-end run + riser to the sheave */}
        <motion.line x1="327" y1="30" x2="327" y2={carPulY} />
        <motion.line x1="470" y1="95" x2="470" y2={carPulY} />
        {/* counterweight side: fall from the sheave + dead-end run */}
        <motion.line x1="555" y1="95" x2="555" y2={cwPulY} />
        <motion.line x1="531" y1="30" x2="531" y2={cwPulY} />
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
          {/* crosshead */}
          <rect x="315" y="188" width="180" height="14" />
          <line x1="315" y1="195" x2="495" y2="195" opacity="0.6" />
          {/* uprights */}
          <rect x="317" y="202" width="8" height="256" />
          <rect x="485" y="202" width="8" height="256" />
          {/* governor rope clamp + safety linkage: horizontal link from the
              clamp, vertical pull rod along the upright, link to the lever */}
          <rect x="288" y="208" width="12" height="14" fill="none" />
          <line x1="300" y1="215" x2="313" y2="215" />
          <line x1="313" y1="215" x2="313" y2="470" opacity="0.8" />
          <line x1="313" y1="470" x2="321" y2="476" />
          {/* retiring cam (landing-door unlocking) */}
          <path d="M 317 244 L 309 248 L 309 254 L 317 258" fill="none" strokeWidth="1.1" />
          {/* safety plank */}
          <rect x="315" y="458" width="180" height="14" />
          <line x1="315" y1="465" x2="495" y2="465" opacity="0.6" />
          {/* progressive safety gear on the plank ends: housing on each rail,
              wedge gibs both sides of the blade, clamp spring pack on top,
              synchronization shaft + release lever pulled by the governor rope */}
          <g strokeWidth="1.1">
            {[305, 505].map((rx) => (
              <g key={rx}>
                <rect
                  x={rx - 12}
                  y="474"
                  width="24"
                  height="22"
                  fill="none"
                  strokeWidth="1.2"
                />
                <polyline
                  fill="none"
                  points={`${rx - 10},478 ${rx - 6},475 ${rx - 2},481 ${rx + 2},475 ${rx + 6},481 ${rx + 10},478`}
                />
                <polygon
                  points={`${rx - 9},482 ${rx - 4},482 ${rx - 4},494`}
                  fill="none"
                />
                <polygon
                  points={`${rx + 9},482 ${rx + 4},482 ${rx + 4},494`}
                  fill="none"
                />
              </g>
            ))}
            <line x1="317" y1="476" x2="493" y2="476" />
            <circle cx="321" cy="476" r="2.2" fill="none" />
            <circle cx="489" cy="476" r="2.2" fill="none" />
            <line x1="321" y1="476" x2="329" y2="468" />
          </g>

          {/* underslung rope pulleys on the safety plank (near both ends) */}
          <g strokeWidth="1.3">
            <line x1="331" y1="472" x2="334" y2="482" />
            <line x1="343" y1="472" x2="340" y2="482" />
            <circle cx="337" cy="490" r="10" fill="none" strokeWidth="1.4" />
            <circle cx="337" cy="490" r="3" fill="none" />
            <line x1="454" y1="472" x2="457" y2="482" />
            <line x1="466" y1="472" x2="463" y2="482" />
            <circle cx="460" cy="490" r="10" fill="none" strokeWidth="1.4" />
            <circle cx="460" cy="490" r="3" fill="none" />
          </g>
        </motion.g>

        {/* rope run under the car: down the wraps, along the bottom tangents */}
        <path
          d="M 327 490 A 10 10 0 0 0 337 500 L 460 500 A 10 10 0 0 0 470 490"
          stroke={LINE}
          strokeWidth="1.8"
          fill="none"
          opacity="0.9"
        />

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
        </motion.g>

        {/* ---- roof exhaust fan (separate part, flies up-right) ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.2"
          fill={FILL}
          style={{ x: fanX, y: fanY, fillOpacity: ceilFill }}
        >
          <rect x="445" y="206" width="20" height="8" />
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

        {/* ---- door hanger track (detaches upward, under the crosshead) ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.2"
          fill={FILL2}
          style={{ y: trackY, fillOpacity: operFill }}
        >
          <rect x="337" y="246" width="136" height="4" />
        </motion.g>

        {/* ---- car operating panel (COP, flies right-down) ---- */}
        <motion.g
          stroke={LINE}
          strokeWidth="1.1"
          fill={FILL2}
          style={{ x: copX, y: copY, fillOpacity: operFill }}
        >
          <rect x="452" y="290" width="10" height="60" />
          {[300, 312, 324, 336].map((y) => (
            <g key={y} fill="none">
              <circle cx="455" cy={y} r="1.3" />
              <circle cx="459" cy={y} r="1.3" />
            </g>
          ))}
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
          {/* door interlock / clutch with rollers */}
          <rect x="345" y="300" width="12" height="30" fill="none" strokeWidth="1.1" />
          <circle cx="351" cy="306" r="2.5" fill="none" strokeWidth="1" />
          <circle cx="351" cy="324" r="2.5" fill="none" strokeWidth="1" />
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
          {/* load weighing device under the platform */}
          <rect x="340" y="452" width="16" height="8" fill="none" strokeWidth="1.1" />
          <circle cx="348" cy="456" r="1.6" fill="none" strokeWidth="1" />
        </motion.g>

        {/* ---- annotations: labels + dimension lines (fade in last) ----
             text gets a paper-colored halo so it stays readable over ropes */}
        <motion.g
          fill={ACCENT}
          stroke={PAPER}
          strokeWidth="4"
          paintOrder="stroke"
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
          <text x="515" y="58" textAnchor="middle" fontSize="10">VENT FAN</text>
          <text x="557" y="448" textAnchor="middle" fontSize="10">COP</text>

          <g stroke={ACCENT} strokeWidth="1" fill="none" opacity="0.8">
            {/* leader lines */}
            <line x1="244" y1="512" x2="252" y2="512" />
            <line x1="244" y1="486" x2="292" y2="483" />
            {/* dimension: car width */}
            <line x1="329" y1="522" x2="329" y2="552" />
            <line x1="481" y1="522" x2="481" y2="552" />
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
            H 2650
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
        <line x1="790" y1="884" x2="790" y2="964" />
        {(
          [
            ["DWG NO. EL-2041", "MRL TRACTION LIFT"],
            ["CAPACITY 1000 KG", "GENERAL ARRANGEMENT"],
            ["SPEED 1.6 M/S", "SECTION A-A · 1:50"],
            ["STOPS 4 · 11 KW", "REV C · SHEET 1/1"],
            ["TRAVEL 9900 MM", "DRAWN · APPROVED"],
          ] as const
        ).map(([l, r], i) => (
          <g key={l} fill={SOFT} stroke="none" fontSize="8" letterSpacing="0.5">
            <text x="700" y={899 + i * 16}>{l}</text>
            <text x="796" y={899 + i * 16}>{r}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
