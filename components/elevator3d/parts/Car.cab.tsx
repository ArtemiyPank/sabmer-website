"use client";

import { Fragment } from "react";
import { Box, Channel, Cyl, Ring } from "../prims";
import { Bolt, BoltGrid } from "../Bolts";
import {
  APRON_BOTTOM,
  CAB_BACK,
  CAB_FRONT,
  CAB_H,
  CAB_W,
  CEILING_T,
  PANEL_T,
  PLATFORM_T,
  SILL_Z,
} from "../dims";

/**
 * The cab itself: platform with the car sill and apron, stainless wall
 * panels, front return panels with the car operating panel, and the ceiling
 * with its lighting, car-top equipment and balustrade. Car-local coordinates.
 */

const WALL_X = CAB_W / 2 + PANEL_T / 2; // 0.565 panel centre
const PANEL_Z = [-0.467, 0, 0.467]; // three panels per side wall
const CEIL_Y = CAB_H + CEILING_T / 2; // 2.23
const POSTS: Array<[number, number]> = [
  [-0.5, -0.5],
  [0.5, -0.5],
  [0, -0.5],
  [-0.5, 0.5],
  [0.5, 0.5],
];

/** platform frame, floor finish, car sill and apron */
export function Platform() {
  return (
    <>
      {[-1, 1].map((sx) => (
        <Channel key={`x${sx}`} length={1.5} h={PLATFORM_T} b={0.05} axis="z" open={sx > 0 ? "-x" : "+x"} at={[sx * 0.625, -PLATFORM_T / 2, 0]} />
      ))}
      {[-1, 1].map((sz) => (
        <Channel key={`z${sz}`} length={1.25} h={PLATFORM_T} b={0.05} axis="x" open={sz > 0 ? "-z" : "+z"} at={[0, -PLATFORM_T / 2, sz * 0.725]} />
      ))}
      {[-0.35, 0.35].map((z) => (
        <Box key={z} size={[1.25, PLATFORM_T - 0.02, 0.04]} at={[0, -PLATFORM_T / 2, z]} />
      ))}
      <Box size={[1.3, 0.02, 1.5]} at={[0, 0, 0]} mat="cab" edges />
      {[-0.5, 0.5].map((x) =>
        [-0.5, 0.5].map((z) => (
          <Fragment key={`${x}${z}`}>
            <Box size={[0.1, 0.03, 0.1]} at={[x, -0.135, z]} mat="rubber" />
            <Bolt at={[x, -0.15, z]} dir="-y" s={0.5} />
          </Fragment>
        ))
      )}
      {[-0.45, 0.45].map((x) => (
        <Box key={x} size={[0.05, 0.03, 0.05]} at={[x, -0.14, 0]} mat="accent" />
      ))}

      {/* car sill with its groove, support angles and the apron below */}
      <Box size={[1.2, 0.03, SILL_Z[1] - SILL_Z[0]]} at={[0, -0.015, (SILL_Z[0] + SILL_Z[1]) / 2]} mat="stainless" edges />
      <Box size={[1.2, 0.006, 0.02]} at={[0, -0.003, 0.78]} mat="steelDark" castShadow={false} />
      {[-0.5, 0, 0.5].map((x) => (
        <Fragment key={x}>
          <Box size={[0.05, 0.12, 0.2]} at={[x, -0.09, 0.78]} />
          <Bolt at={[x, -0.15, 0.78]} dir="-y" s={0.6} />
        </Fragment>
      ))}
      <Box size={[1.2, -APRON_BOTTOM - 0.03, 0.01]} at={[0, (APRON_BOTTOM - 0.03) / 2, SILL_Z[1] - 0.005]} mat="stainless" edges />
      <Box size={[1.2, 0.01, 0.08]} at={[0, APRON_BOTTOM + 0.01, 0.915]} rot={[0.26, 0, 0]} mat="stainless" />
      {[-0.45, 0.45].map((x) => (
        <Box key={x} size={[0.02, 0.6, 0.02]} at={[x, -0.4, 0.86]} />
      ))}
      <BoltGrid at={[0, -0.06, 0.881]} dir="+z" w={1.0} h={0.04} n={[3, 2]} s={0.5} />
    </>
  );
}

/** one side wall: three panels, skirting, rubbing strip and outside stiffeners */
export function SideWall({ sx }: { sx: 1 | -1 }) {
  const x = sx * WALL_X;
  const out = sx > 0 ? "+x" : "-x";
  return (
    <>
      {PANEL_Z.map((z) => (
        <Fragment key={z}>
          <Box size={[PANEL_T, CAB_H, 0.44]} at={[x, CAB_H / 2, z]} mat="stainless" edges />
          <Bolt at={[x + sx * 0.016, 0.08, z]} dir={out} s={0.4} />
          <Bolt at={[x + sx * 0.016, 2.12, z]} dir={out} s={0.4} />
        </Fragment>
      ))}
      <Box size={[0.01, 0.1, 1.4]} at={[sx * (CAB_W / 2 - 0.005), 0.05, 0]} mat="steelDark" />
      <Box size={[0.02, 0.05, 1.3]} at={[sx * 0.59, 1.0, 0]} />
      {[-0.5, 0, 0.5].map((z) => (
        <Bolt key={z} at={[sx * 0.6, 1.0, z]} dir={out} s={0.5} />
      ))}
      {[-0.3, 0.3].map((z) => (
        <Box key={z} size={[0.03, 2.0, 0.05]} at={[sx * 0.595, 1.1, z]} />
      ))}
    </>
  );
}

/** back wall: two panels, handrail, mirror and outside stiffeners */
export function BackWall() {
  const z = CAB_BACK - PANEL_T / 2;
  return (
    <>
      {[-0.275, 0.275].map((x) => (
        <Box key={x} size={[0.545, CAB_H, PANEL_T]} at={[x, CAB_H / 2, z]} mat="stainless" edges />
      ))}
      <Cyl r={0.02} h={0.9} seg={16} axis="x" at={[0, 0.9, CAB_BACK + 0.05]} mat="stainless" />
      {[-0.35, 0, 0.35].map((x) => (
        <Fragment key={x}>
          <Box size={[0.02, 0.04, 0.06]} at={[x, 0.9, CAB_BACK + 0.02]} />
          <Bolt at={[x, 0.9, CAB_BACK + 0.005]} dir="+z" s={0.5} />
        </Fragment>
      ))}
      <Box size={[0.8, 0.9, 0.01]} at={[0, 1.6, CAB_BACK + 0.005]} mat="glass" castShadow={false} />
      {[-1, 1].map((sx) => (
        <Box key={sx} size={[0.02, 0.94, 0.014]} at={[sx * 0.41, 1.6, CAB_BACK + 0.006]} mat="stainless" />
      ))}
      {[-1, 1].map((sy) => (
        <Box key={sy} size={[0.84, 0.02, 0.014]} at={[0, 1.6 + sy * 0.46, CAB_BACK + 0.006]} mat="stainless" />
      ))}
      {[-0.3, 0.3].map((x) => (
        <Box key={x} size={[0.05, 2.0, 0.03]} at={[x, 1.1, z - 0.03]} />
      ))}
    </>
  );
}

/** front return panel; the right one carries the car operating panel */
export function Return({ sx }: { sx: 1 | -1 }) {
  const x = sx * 0.4925;
  const z = CAB_FRONT + PANEL_T / 2;
  return (
    <>
      <Box size={[0.145, CAB_H, PANEL_T]} at={[x, CAB_H / 2, z]} mat="cab" edges />
      {sx > 0 && (
        <>
          <Box size={[0.06, 0.9, 0.12]} at={[0.45, 1.3, 0.72]} mat="cab" edges />
          <Box size={[0.004, 0.7, 0.1]} at={[0.418, 1.3, 0.72]} mat="stainless" />
          {[1.05, 1.15, 1.25, 1.35].map((y) => (
            <Cyl key={y} r={0.014} h={0.006} seg={12} axis="x" at={[0.414, y, 0.72]} mat="accent" />
          ))}
          {[0.69, 0.72, 0.75].map((z2) => (
            <Cyl key={z2} r={0.01} h={0.006} seg={10} axis="x" at={[0.414, 0.98, z2]} mat="accent" />
          ))}
          <Box size={[0.004, 0.05, 0.08]} at={[0.415, 1.55, 0.72]} mat="light" castShadow={false} />
          <Cyl r={0.01} h={0.01} seg={10} axis="x" at={[0.414, 1.45, 0.72]} mat="steelDark" />
          <BoltGrid at={[0.416, 1.3, 0.72]} dir="-x" w={0.08} h={0.64} s={0.4} />
        </>
      )}
    </>
  );
}

/** ceiling panel, light panels, car-top equipment and the balustrade */
export function Ceiling() {
  return (
    <>
      <Box size={[1.16, CEILING_T, 1.46]} at={[0, CEIL_Y, 0]} mat="cab" edges />
      <BoltGrid at={[0, CEIL_Y + CEILING_T / 2, 0.68]} dir="+y" w={0.9} h={0} n={[3, 1]} s={0.4} />
      <BoltGrid at={[0, CEIL_Y + CEILING_T / 2, -0.68]} dir="+y" w={0.9} h={0} n={[3, 1]} s={0.4} />
      {[-0.3, 0.3].map((x) => (
        <Box key={x} size={[0.4, 0.01, 1.0]} at={[x, CAB_H - 0.005, 0]} mat="light" castShadow={false} />
      ))}
      {/* car-top inspection station, light, junction box, fan */}
      <Box size={[0.2, 0.12, 0.14]} at={[0.3, CEIL_Y + 0.09, 0.4]} edges />
      {[-0.06, 0, 0.06].map((dx) => (
        <Cyl key={dx} r={0.012} h={0.008} seg={10} axis="z" at={[0.3 + dx, CEIL_Y + 0.09, 0.474]} mat="accent" />
      ))}
      <Bolt at={[0.22, CEIL_Y + 0.15, 0.4]} s={0.4} />
      <Bolt at={[0.38, CEIL_Y + 0.15, 0.4]} s={0.4} />
      <Box size={[0.05, 0.05, 0.4]} at={[-0.3, CEIL_Y + 0.06, 0.2]} mat="steelDark" />
      <Box size={[0.03, 0.02, 0.34]} at={[-0.3, CEIL_Y + 0.035, 0.2]} mat="light" castShadow={false} />
      <Box size={[0.16, 0.1, 0.1]} at={[-0.35, CEIL_Y + 0.08, -0.4]} edges />
      <BoltGrid at={[-0.35, CEIL_Y + 0.13, -0.4]} dir="+y" w={0.1} h={0.06} s={0.4} />
      <Cyl r={0.12} h={0.08} seg={20} at={[0.1, CEIL_Y + 0.07, -0.3]} mat="steelDark" />
      <Ring R={0.11} r={0.008} axis="y" seg={20} tube={6} at={[0.1, CEIL_Y + 0.11, -0.3]} />
      {/* balustrade: posts, rails and toe boards on three sides */}
      {POSTS.map(([x, z]) => (
        <Fragment key={`${x}${z}`}>
          <Cyl r={0.015} h={1.0} seg={10} at={[x, CEIL_Y + 0.53, z]} />
          <Box size={[0.05, 0.01, 0.05]} at={[x, CEIL_Y + 0.035, z]} />
          <Bolt at={[x - 0.018, CEIL_Y + 0.04, z]} s={0.4} />
          <Bolt at={[x + 0.018, CEIL_Y + 0.04, z]} s={0.4} />
        </Fragment>
      ))}
      {[-0.5, 0.5].map((x) =>
        [2.76, 3.26].map((y) => <Cyl key={`${x}${y}`} r={0.012} h={1.0} seg={8} axis="z" at={[x, y, 0]} />)
      )}
      {[2.76, 3.26].map((y) => (
        <Cyl key={y} r={0.012} h={1.0} seg={8} axis="x" at={[0, y, -0.5]} />
      ))}
      {[-0.51, 0.51].map((x) => (
        <Box key={x} size={[0.02, 0.1, 1.0]} at={[x, CEIL_Y + 0.08, 0]} />
      ))}
      <Box size={[1.0, 0.1, 0.02]} at={[0, CEIL_Y + 0.08, -0.51]} />
    </>
  );
}
