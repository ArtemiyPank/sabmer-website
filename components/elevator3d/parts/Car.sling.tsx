"use client";

import { Fragment, type Ref } from "react";
import * as THREE from "three";
import { Box, Channel, Cyl, Ring, Spring } from "../prims";
import { Bolt, BoltGrid, Nut } from "../Bolts";
import {
  CAR_BUFFER_X,
  CAR_TOP_Y,
  CROSSHEAD_H,
  CROSSHEAD_Y,
  GOV_ROPE_X,
  GOV_Z,
  PLANK_H,
  PLANK_Y,
  PULLEY_R,
  PULLEY_X,
  PULLEY_Y,
  RAIL_T,
  RAIL_X,
  ROPE_Z,
  SLING_HALF_SPAN,
  STILE_D,
  STILE_W,
  STILE_X,
} from "../dims";

/**
 * Steel sling around the cab: crosshead, two stiles, safety plank with the
 * 2:1 car pulleys, roller guide shoes, progressive safety gear and the
 * governor linkage. All coordinates are car-local (y = 0 at the car floor);
 * the parent Car module moves and explodes the groups.
 */

const SPACER_X = [-0.4, 0, 0.4];
const CH_B = 0.07; // crosshead / plank flange width
const SUB_BEAM_Y = -0.47; // pulley sub-beams under the plank
const GOV_CLAMP_X = GOV_ROPE_X[1]; // -0.71: the governor rope runs here in world x
const ROD_X = -0.66; // governor pull rod / final limit cam
const SAFETY_LEVER_Y = PLANK_Y + 0.15;
const CLAMP_Y = 2.25; // governor rope clamp (car-local)

/** roller guide shoe: base plate, tip roller and two side rollers on sprung arms */
export function RollerShoe({ sx, top, ref }: { sx: 1 | -1; top: boolean; ref?: Ref<THREE.Group> }) {
  const y = top ? CAR_TOP_Y + 0.01 : PLANK_Y - PLANK_H / 2 - 0.03; // base plate centre
  const dy = top ? 0.09 : -0.1; // roller plane above / below the plate
  const x = sx * STILE_X;
  const dir = top ? "+y" : "-y";
  return (
    <group ref={ref}>
      <Box size={[0.16, 0.02, 0.2]} at={[x, y, 0]} edges />
      <BoltGrid at={[x, y + (top ? 0.01 : -0.01), 0]} dir={dir} w={0.1} h={0.14} s={0.7} />
      {/* tip roller on the blade end */}
      <Box size={[0.062, Math.abs(dy), 0.03]} at={[sx * 0.641, y + dy / 2, 0]} />
      <Cyl r={0.04} h={0.05} seg={16} axis="z" at={[sx * (RAIL_X - 0.04), y + dy, 0]} mat="rubber" />
      <Cyl r={0.008} h={0.07} seg={8} axis="z" at={[sx * (RAIL_X - 0.04), y + dy, 0]} mat="stainless" />
      <Nut at={[sx * (RAIL_X - 0.04), y + dy, 0.035]} dir="+z" s={0.4} />
      {/* side rollers riding the blade faces, clear of the rail foot at |x| 0.766 */}
      {[-1, 1].map((sz) => (
        <Fragment key={sz}>
          <Box size={[0.03, Math.abs(dy), 0.02]} at={[sx * 0.66, y + dy / 2, sz * (RAIL_T / 2 + 0.037)]} />
          <Cyl r={0.035} h={0.03} seg={16} axis="x" at={[sx * 0.735, y + dy, sz * (RAIL_T / 2 + 0.037)]} mat="rubber" />
          <Cyl r={0.008} h={0.09} seg={8} axis="x" at={[sx * 0.72, y + dy, sz * (RAIL_T / 2 + 0.037)]} mat="stainless" />
          <Nut at={[sx * 0.762, y + dy, sz * (RAIL_T / 2 + 0.037)]} dir={sx > 0 ? "+x" : "-x"} s={0.4} />
          <Spring R={0.015} r={0.003} h={0.06} turns={5} at={[sx * 0.66, y + dy - 0.03, sz * (RAIL_T / 2 + 0.037)]} />
        </Fragment>
      ))}
      <Cyl r={0.015} h={0.03} seg={10} at={[sx * 0.58, y + (top ? 0.025 : -0.025), 0.06]} mat="steelDark" />
    </group>
  );
}

/** progressive safety gear block straddling a rail blade at the plank end */
export function SafetyGear({ sx, ref }: { sx: 1 | -1; ref?: Ref<THREE.Group> }) {
  const x = sx * 0.7;
  return (
    <group ref={ref}>
      {[-1, 1].map((sz) => (
        <Fragment key={sz}>
          <Box size={[0.1, 0.24, 0.06]} at={[x, PLANK_Y, sz * 0.045]} mat="steelDark" edges />
          <Box size={[0.1, 0.02, 0.07]} at={[x, PLANK_Y + 0.13, sz * 0.045]} />
          <Box size={[0.1, 0.02, 0.07]} at={[x, PLANK_Y - 0.13, sz * 0.045]} />
          <Box size={[0.02, 0.12, 0.015]} at={[sx * 0.74, PLANK_Y, sz * 0.02]} mat="accent" />
        </Fragment>
      ))}
      <Box size={[0.12, 0.2, 0.01]} at={[x, PLANK_Y, 0.105]} />
      <BoltGrid at={[x, PLANK_Y, 0.111]} dir="+z" w={0.08} h={0.14} s={0.8} />
      <Box size={[0.25, 0.02, 0.02]} at={[sx * 0.575, SAFETY_LEVER_Y, 0.12]} />
    </group>
  );
}

/** crosshead: two channels, spacer blocks and the governor rope clamp bracket */
export function Crosshead() {
  return (
    <>
      {[0.09, -0.09].map((z) => (
        <Channel
          key={z}
          length={2 * SLING_HALF_SPAN}
          h={CROSSHEAD_H}
          b={CH_B}
          open={z > 0 ? "-z" : "+z"}
          at={[0, CROSSHEAD_Y, z]}
        />
      ))}
      {SPACER_X.map((x) => (
        <Fragment key={x}>
          <Box size={[0.06, 0.16, 0.18]} at={[x, CROSSHEAD_Y, 0]} edges />
          <Bolt at={[x, CROSSHEAD_Y + 0.05, 0.125]} dir="+z" s={0.8} />
          <Bolt at={[x, CROSSHEAD_Y - 0.05, 0.125]} dir="+z" s={0.8} />
        </Fragment>
      ))}
      {/* governor rope clamp, hung below the crosshead so it clears the governor
          sheave (world y 12.40..12.70) when the car is at the top landing */}
      <Box size={[0.06, CROSSHEAD_Y - CLAMP_Y, 0.06]} at={[GOV_CLAMP_X, (CROSSHEAD_Y + CLAMP_Y) / 2, 0.12]} />
      <Box size={[0.08, 0.06, 0.22]} at={[GOV_CLAMP_X, CLAMP_Y, 0.23]} edges />
      <Box size={[0.05, 0.1, 0.05]} at={[GOV_CLAMP_X, CLAMP_Y, GOV_Z]} mat="steelDark" edges />
      <Bolt at={[GOV_CLAMP_X + 0.026, CLAMP_Y + 0.03, GOV_Z]} dir="+x" s={0.6} />
      <Bolt at={[GOV_CLAMP_X + 0.026, CLAMP_Y - 0.03, GOV_Z]} dir="+x" s={0.6} />
      <Box size={[0.02, 0.02, 0.2]} at={[ROD_X, CLAMP_Y - 0.05, 0.22]} rot={[0, 0.25, 0]} mat="accent" />
    </>
  );
}

/** one stile with its corner gussets; the left one also carries the governor rod and cam */
export function Stile({ sx }: { sx: 1 | -1 }) {
  const x = sx * STILE_X;
  const y0 = PLANK_Y;
  const y1 = CROSSHEAD_Y;
  return (
    <>
      <Channel
        length={y1 - y0}
        h={STILE_D}
        b={STILE_W}
        axis="y"
        open={sx > 0 ? "-x" : "+x"}
        at={[x, (y0 + y1) / 2, 0]}
      />
      {[y1 - 0.175, y0 + 0.175].map((y) =>
        [-1, 1].map((sz) => (
          <Fragment key={`${y}${sz}`}>
            <Box size={[0.1, 0.25, 0.01]} at={[x, y, sz * 0.065]} />
            <BoltGrid at={[x, y, sz * 0.071]} dir={sz > 0 ? "+z" : "-z"} w={0.06} h={0.17} s={0.8} />
          </Fragment>
        ))
      )}
      {sx < 0 && (
        <>
          {/* governor pull rod with its guides and tension spring, final limit cam */}
          <Cyl r={0.008} h={CLAMP_Y - 0.05 - SAFETY_LEVER_Y} seg={8} at={[ROD_X, (CLAMP_Y - 0.05 + SAFETY_LEVER_Y) / 2, 0.2]} mat="stainless" />
          <Spring R={0.02} r={0.004} h={0.1} turns={6} at={[ROD_X, 1.95, 0.2]} />
          {[0.6, 1.8].map((y) => (
            <Fragment key={y}>
              <Box size={[0.03, 0.03, 0.16]} at={[ROD_X, y, 0.13]} />
              <Bolt at={[ROD_X, y + 0.016, 0.13]} s={0.4} />
            </Fragment>
          ))}
          <Box size={[0.03, 0.4, 0.07]} at={[ROD_X, 1.4, 0.095]} />
          <Box size={[0.03, 0.4, 0.02]} at={[ROD_X, 1.4, 0.14]} edges />
          <Bolt at={[ROD_X, 1.55, 0.061]} dir="+z" s={0.5} />
          <Bolt at={[ROD_X, 1.25, 0.061]} dir="+z" s={0.5} />
        </>
      )}
    </>
  );
}

/** safety plank, pulley sub-beams, buffer strikers and the safety linkage rod */
export function Plank() {
  return (
    <>
      {[0.1, -0.1].map((z) => (
        <Channel key={z} length={2 * SLING_HALF_SPAN} h={PLANK_H} b={CH_B} open={z > 0 ? "-z" : "+z"} at={[0, PLANK_Y, z]} />
      ))}
      {SPACER_X.map((x) => (
        <Fragment key={x}>
          <Box size={[0.06, 0.14, 0.2]} at={[x, PLANK_Y, 0]} edges />
          <Bolt at={[x, PLANK_Y + 0.04, 0.135]} dir="+z" s={0.8} />
          <Bolt at={[x, PLANK_Y - 0.04, 0.135]} dir="+z" s={0.8} />
        </Fragment>
      ))}
      {[ROPE_Z + 0.135, ROPE_Z - 0.135].map((z) => (
        <Channel key={z} length={1.3} h={0.12} b={0.06} open="+y" at={[0, SUB_BEAM_Y, z]} />
      ))}
      {[-1, 1].map((sx) => (
        <Fragment key={sx}>
          <Box size={[0.02, 0.2, 0.57]} at={[sx * 0.6, -0.4, -0.42]} />
          <BoltGrid at={[sx * 0.61, -0.4, ROPE_Z]} dir={sx > 0 ? "+x" : "-x"} w={0.22} h={0.12} s={0.8} />
          <BoltGrid at={[sx * 0.61, PLANK_Y, -0.16]} dir={sx > 0 ? "+x" : "-x"} w={0.1} h={0.1} s={0.8} />
          <Box size={[0.2, 0.02, 0.2]} at={[sx * CAR_BUFFER_X, PLANK_Y - PLANK_H / 2 - 0.01, 0]} edges />
          <BoltGrid at={[sx * CAR_BUFFER_X, PLANK_Y - PLANK_H / 2 - 0.02, 0]} dir="-y" w={0.12} h={0.12} s={0.7} />
        </Fragment>
      ))}
      {/* linkage rod tying both safety gears together */}
      <Cyl r={0.008} h={1.2} seg={8} axis="x" at={[0, SAFETY_LEVER_Y, 0.12]} mat="stainless" />
    </>
  );
}

/** one 2:1 car pulley: rotating sheave (forwarded ref) plus its brackets, axle and retainer */
export function CarPulley({ sx, ref }: { sx: 1 | -1; ref?: Ref<THREE.Group> }) {
  const x = sx * PULLEY_X;
  return (
    <>
      <group ref={ref} position={[x, PULLEY_Y, ROPE_Z]}>
        <PulleyBody />
      </group>
      <Cyl r={0.025} h={0.3} seg={16} axis="z" at={[x, PULLEY_Y, ROPE_Z]} mat="stainless" />
      <Nut at={[x, PULLEY_Y, ROPE_Z + 0.15]} dir="+z" s={0.8} />
      {[ROPE_Z + 0.13, ROPE_Z - 0.13].map((z, i) => (
        <Fragment key={z}>
          <Box size={[0.06, 0.28, 0.02]} at={[x, PULLEY_Y + 0.07, z]} />
          <Bolt at={[x, PULLEY_Y + 0.2, z + (i === 0 ? 0.011 : -0.011)]} dir={i === 0 ? "+z" : "-z"} s={0.8} />
          <Bolt at={[x, PULLEY_Y - 0.05, z + (i === 0 ? 0.011 : -0.011)]} dir={i === 0 ? "+z" : "-z"} s={0.8} />
          <Box size={[0.03, 0.04, 0.02]} at={[x + sx * (PULLEY_R + 0.035), PULLEY_Y - 0.06, z]} />
          <Bolt at={[x + sx * (PULLEY_R + 0.035), PULLEY_Y - 0.06, z + (i === 0 ? 0.011 : -0.011)]} dir={i === 0 ? "+z" : "-z"} s={0.5} />
        </Fragment>
      ))}
      <Ring
        R={PULLEY_R + 0.035}
        r={0.005}
        arc={Math.PI / 2}
        seg={20}
        tube={6}
        at={[x, PULLEY_Y, ROPE_Z]}
        rot={[0, 0, sx > 0 ? -Math.PI / 2 : Math.PI]}
        mat="accent"
      />
    </>
  );
}

/** the rotating body of a car pulley (rim, groove flanges, hub, spokes) */
function PulleyBody() {
  return (
    <>
      <Cyl r={PULLEY_R} h={0.1} seg={36} axis="z" mat="steelDark" />
      {[-0.04, -0.02, 0, 0.02, 0.04].map((dz) => (
        <Cyl key={dz} r={PULLEY_R + 0.007} h={0.008} seg={36} axis="z" at={[0, 0, dz]} mat="stainless" />
      ))}
      <Cyl r={0.05} h={0.12} seg={20} axis="z" mat="stainless" />
      {Array.from({ length: 4 }, (_, i) => (
        <group key={i} rotation={[0, 0, (i * Math.PI) / 2 + Math.PI / 4]}>
          <Box size={[0.07, 0.02, 0.015]} at={[0.09, 0, 0.055]} mat="steelDark" />
        </group>
      ))}
    </>
  );
}
