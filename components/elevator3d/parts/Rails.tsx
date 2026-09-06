"use client";

import { Fragment } from "react";
import { Box, Cyl, TRail } from "../prims";
import { Bolt, BoltGrid } from "../Bolts";
import {
  CWT_RAIL_BLADE_H,
  CWT_RAIL_FOOT_W,
  CWT_RAIL_X,
  CWT_RAIL_Z,
  RAIL_BLADE_H,
  RAIL_BOTTOM,
  RAIL_BRACKETS,
  RAIL_CAP_T,
  RAIL_END,
  RAIL_FOOT_W,
  RAIL_JOINTS,
  RAIL_T,
  RAIL_X,
  RAIL_Z,
  SHAFT_X,
  type V3,
} from "../dims";

/**
 * Guide rail system (static): two T89 car rails, two T50 counterweight
 * rails, each in three sections joined by bolted fishplates; base plates in
 * the pit, cap plates under the machine support beams, wall brackets with
 * rail clips at every RAIL_BRACKETS height and the two final limit switches
 * on the left car rail, set just past the ends of the car cam's travel.
 *
 * Everything the moving parts touch is derived from dims.ts: the car rail
 * blade tips are at x = ±RAIL_X, z = RAIL_Z; the counterweight blade tips at
 * x = CWT_RAIL_X, z = CWT_RAIL_Z. The roller guide shoes ride the first
 * ~26 mm of the blade, so nothing bolted to the foot reaches closer than
 * x = ±0.75 to the blade tip.
 */

const JOINT_GAP = 0.004;
const CWT_RAIL_T = 0.012;
// offset from the car rail brackets: both sets land on the same side wall plane
const CWT_BRACKETS = RAIL_BRACKETS.map((y) => y + 1.1);

// car rail foot: plate perpendicular to x behind the blade (numbers for the right rail, mirrored for the left)
const FOOT_BACK = RAIL_X + RAIL_BLADE_H; // 0.782 outer face of the foot
const FOOT_FRONT = FOOT_BACK - RAIL_T; // 0.766 blade-side face of the foot
const FOOT_CENTER = FOOT_BACK - RAIL_T / 2; // 0.774

/** vertical section boundaries of a rail (joint gaps at RAIL_JOINTS) */
function sections(): Array<[number, number]> {
  const ys = [RAIL_BOTTOM, ...RAIL_JOINTS, RAIL_END];
  return ys.slice(0, -1).map((y0, i) => [
    i === 0 ? y0 : y0 + JOINT_GAP / 2,
    i === ys.length - 2 ? ys[i + 1] : ys[i + 1] - JOINT_GAP / 2,
  ]);
}
const SECTIONS = sections();

/** one car guide rail with its joints, plates and brackets; `sgn` = +1 right rail, -1 left rail */
function CarRail({ sgn }: { sgn: 1 | -1 }) {
  const out = sgn > 0 ? "+x" : "-x"; // pointing away from the car
  const inn = sgn > 0 ? "-x" : "+x"; // pointing toward the car
  const x = (v: number) => sgn * v;
  return (
    <group>
      {SECTIONS.map(([y0, y1]) => (
        <TRail
          key={y0}
          height={y1 - y0}
          bladeH={RAIL_BLADE_H}
          footW={RAIL_FOOT_W}
          t={RAIL_T}
          blade={inn}
          at={[x(RAIL_X), y0, RAIL_Z]}
        />
      ))}

      {/* fishplates: plate on the back of the foot, 2 x 4 bolts, nuts on the blade side */}
      {RAIL_JOINTS.map((yj) => (
        <Fragment key={yj}>
          <Box size={[0.012, 0.36, RAIL_FOOT_W]} at={[x(FOOT_BACK + 0.006), yj, RAIL_Z]} edges />
          <BoltGrid at={[x(FOOT_BACK + 0.012), yj, RAIL_Z]} dir={out} w={0.06} h={0.28} n={[2, 4]} s={0.8} />
          <BoltGrid at={[x(FOOT_FRONT), yj, RAIL_Z]} dir={inn} w={0.06} h={0.28} n={[2, 4]} s={0.6} nuts />
        </Fragment>
      ))}

      {/* base plate on the pit floor with 4 anchors, cap plate for the machine support beam */}
      <Box size={[0.24, 0.05, 0.24]} at={[x(FOOT_CENTER), RAIL_BOTTOM - 0.025, RAIL_Z]} edges />
      <BoltGrid at={[x(FOOT_CENTER), RAIL_BOTTOM, RAIL_Z]} dir="+y" w={0.18} h={0.18} s={1.2} />
      <Box size={[0.14, RAIL_CAP_T, 0.28]} at={[x(FOOT_CENTER), RAIL_END + RAIL_CAP_T / 2, RAIL_Z]} edges />
      <Bolt at={[x(FOOT_CENTER - 0.05), RAIL_END + RAIL_CAP_T, RAIL_Z + 0.11]} s={0.7} />
      <Bolt at={[x(FOOT_CENTER + 0.05), RAIL_END + RAIL_CAP_T, RAIL_Z + 0.11]} s={0.7} />

      {/* wall brackets: anchor plate on the side wall, arm to the foot, foot plate with two rail clips */}
      {RAIL_BRACKETS.map((y) => (
        <group key={y} position={[0, y, RAIL_Z]}>
          <Box size={[0.02, 0.24, 0.24]} at={[x(SHAFT_X - 0.01), 0, 0]} edges />
          <Bolt at={[x(SHAFT_X - 0.02), 0.08, 0]} dir={inn} s={1.3} />
          <Bolt at={[x(SHAFT_X - 0.02), -0.08, 0]} dir={inn} s={1.3} />
          <Box size={[SHAFT_X - 0.02 - (FOOT_BACK + 0.012), 0.1, 0.06]} at={[x((SHAFT_X - 0.02 + FOOT_BACK + 0.012) / 2), 0, 0]} edges />
          <Box size={[0.3, 0.02, 0.05]} at={[x(SHAFT_X - 0.17), -0.06, 0]} />
          <Box size={[0.012, 0.12, 0.16]} at={[x(FOOT_BACK + 0.006), 0, 0]} />
          {[1, -1].map((sz) => (
            <Fragment key={sz}>
              <Box size={[0.014, 0.05, 0.05]} at={[x(FOOT_FRONT - 0.007), 0, sz * 0.058]} mat="steelDark" />
              <Bolt at={[x(FOOT_BACK + 0.012), 0, sz * 0.062]} dir={out} s={0.8} />
            </Fragment>
          ))}
        </group>
      ))}
    </group>
  );
}

/**
 * Final limit switch on the left car rail: bent bracket on the foot, switch
 * body with an accent cover, roller lever reaching toward the car's cam plate
 * (the Car module carries the cam on the left stile at x -0.66, z 0.14, so the
 * roller's +x tangent at x -0.675 meets the cam's face).
 */
function LimitSwitch({ y }: { y: number }) {
  const lx = -0.75; // lever pivot
  const rx = -0.695; // roller centre (touches the cam face at x -0.675 on overtravel)
  const len = Math.hypot(rx - lx, 0.08);
  return (
    <group position={[0, y, RAIL_Z]}>
      <Box size={[0.012, 0.14, 0.09]} at={[-(FOOT_BACK + 0.006), 0, 0.12]} />
      <Bolt at={[-(FOOT_BACK + 0.012), 0.045, 0.1]} dir="-x" s={0.5} />
      <Bolt at={[-(FOOT_BACK + 0.012), -0.045, 0.1]} dir="-x" s={0.5} />
      <Box size={[0.064, 0.14, 0.012]} at={[-0.762, 0, 0.154]} />
      <Box size={[0.08, 0.14, 0.06]} at={[-0.77, 0, 0.19]} edges />
      <Box size={[0.06, 0.1, 0.004]} at={[-0.77, 0, 0.222]} mat="accent" />
      <Bolt at={[-0.77, 0.04, 0.224]} dir="+z" s={0.4} />
      <Bolt at={[-0.77, -0.04, 0.224]} dir="+z" s={0.4} />
      <Cyl r={0.012} h={0.04} axis="z" at={[lx, -0.03, 0.15]} seg={12} />
      <Box
        size={[0.012, len, 0.012]}
        at={[(lx + rx) / 2, 0.01, 0.14]}
        rot={[0, 0, -Math.atan2(rx - lx, 0.08)]}
        mat="steelDark"
      />
      <Cyl r={0.02} h={0.02} axis="z" at={[rx, 0.05, 0.14]} seg={16} mat="rubber" />
    </group>
  );
}

/** one counterweight rail (T50) at x = CWT_RAIL_X; `k` picks the front (0) or back (1) rail */
function CwtRail({ k }: { k: 0 | 1 }) {
  const tip = CWT_RAIL_Z[k];
  const sz = k === 0 ? 1 : -1; // direction from the blade tip toward the foot
  const footBack = tip + sz * CWT_RAIL_BLADE_H;
  const footCenter = footBack - (sz * CWT_RAIL_T) / 2;
  const behind = sz > 0 ? "+z" : "-z";
  const blade = sz > 0 ? "-z" : "+z";
  const at = (dz: number): V3 => [CWT_RAIL_X, 0, footBack + sz * dz];
  return (
    <group>
      {SECTIONS.map(([y0, y1]) => (
        <TRail
          key={y0}
          height={y1 - y0}
          bladeH={CWT_RAIL_BLADE_H}
          footW={CWT_RAIL_FOOT_W}
          t={CWT_RAIL_T}
          blade={blade}
          at={[CWT_RAIL_X, y0, tip]}
        />
      ))}
      {RAIL_JOINTS.map((yj) => (
        <group key={yj} position={[0, yj, 0]}>
          <Box size={[CWT_RAIL_FOOT_W, 0.25, 0.01]} at={at(0.005)} edges />
          <BoltGrid at={at(0.01)} dir={behind} w={0.03} h={0.18} s={0.6} />
        </group>
      ))}
      <Box size={[0.14, 0.05, 0.1]} at={[CWT_RAIL_X, RAIL_BOTTOM - 0.025, footCenter - sz * 0.02]} edges />
      <Bolt at={[CWT_RAIL_X - 0.05, RAIL_BOTTOM, footBack + sz * 0.045]} />
      <Bolt at={[CWT_RAIL_X + 0.05, RAIL_BOTTOM, footBack + sz * 0.045]} />
      <Box size={[0.16, RAIL_CAP_T, 0.11]} at={[CWT_RAIL_X, RAIL_END + RAIL_CAP_T / 2, footCenter]} edges />
      <Bolt at={[CWT_RAIL_X - 0.06, RAIL_END + RAIL_CAP_T, footCenter]} s={0.6} />
      <Bolt at={[CWT_RAIL_X + 0.06, RAIL_END + RAIL_CAP_T, footCenter]} s={0.6} />

      {/* angle brackets behind the foot: leg to the side wall with two anchors, two clip bolts */}
      {CWT_BRACKETS.map((y) => (
        <group key={y} position={[0, y, 0]}>
          <Box size={[SHAFT_X - 1.05, 0.08, 0.035]} at={[(SHAFT_X + 1.05) / 2, 0, footBack + sz * 0.0175]} edges />
          <Box size={[0.02, 0.16, 0.035]} at={[SHAFT_X - 0.01, 0, footBack + sz * 0.0175]} edges />
          <Bolt at={[SHAFT_X - 0.02, 0.055, footBack + sz * 0.0175]} dir="-x" s={0.9} />
          <Bolt at={[SHAFT_X - 0.02, -0.055, footBack + sz * 0.0175]} dir="-x" s={0.9} />
          <Bolt at={[CWT_RAIL_X - 0.035, 0, footBack + sz * 0.035]} dir={behind} s={0.7} />
          <Bolt at={[CWT_RAIL_X + 0.035, 0, footBack + sz * 0.035]} dir={behind} s={0.7} />
        </group>
      ))}
    </group>
  );
}

export default function Rails() {
  return (
    <group>
      <CarRail sgn={1} />
      <CarRail sgn={-1} />
      <LimitSwitch y={11.55} />
      <LimitSwitch y={1.1} />
      <CwtRail k={0} />
      <CwtRail k={1} />
    </group>
  );
}
