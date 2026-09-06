"use client";

import { Fragment, useRef } from "react";
import * as THREE from "three";
import { Box, Channel, Cyl, Ring } from "../prims";
import { Bolt, Nut } from "../Bolts";
import { useProgressFrame } from "../scene-context";
import {
  CWT_H,
  CWT_PULLEY_DY,
  CWT_PULLEY_R,
  CWT_RAIL_Z,
  CWT_W,
  CWT_X,
  CWT_Z,
  TRAVEL,
  cwtY,
  type V3,
} from "../dims";

/**
 * Counterweight: a channel-steel frame filled with cast-iron weights, four
 * sliding guide shoes on the T50 rails, and the 2:1 diverter pulley on top.
 * Local coordinates: x / z as in the world (centre CWT_X / CWT_Z), y = 0 at
 * the frame bottom; the root group follows cwtY(p) and the pulley turns.
 */

const STILE_H = 0.12; // section height along x
const STILE_B = 0.1; // flange width along z
const STILE_Z: [number, number] = [CWT_Z + CWT_W / 2 - STILE_B / 2, CWT_Z - CWT_W / 2 + STILE_B / 2]; // -0.24 / -0.86
const CROSS_H = 0.14;
const BLOCK_H = 0.15;
const BLOCKS = 13;
const STACK_Y0 = CROSS_H; // first block bottom
const STACK_TOP = STACK_Y0 + BLOCKS * BLOCK_H + 0.15; // 13 blocks + two half plates = 2.24
const ROD_Z = [CWT_Z + 0.2, CWT_Z - 0.2];
const PLATE_Z = [CWT_Z + 0.075, CWT_Z - 0.075];
const SHOE_Y = [0.1, CWT_H - 0.1];

/**
 * Sliding guide shoe on the frame's outer web face: base plate, two jaws that
 * straddle the rail blade with rubber liners, and a tip liner. `sz` is the
 * direction from the frame toward the rail (+1 front rail, -1 back rail).
 */
function Shoe({ y, sz, top }: { y: number; sz: 1 | -1; top: boolean }) {
  const face = sz > 0 ? CWT_Z + CWT_W / 2 : CWT_Z - CWT_W / 2; // stile web outer face (-0.19 / -0.91)
  const z = (d: number) => face + sz * d; // distance from the web face toward the rail
  const tip = CWT_RAIL_Z[sz > 0 ? 0 : 1];
  const jawLen = Math.abs(tip - z(0.02)) + 0.035; // from the base plate to just short of the rail foot
  return (
    <group position={[CWT_X, y, 0]}>
      <Box size={[0.14, 0.12, 0.02]} at={[0, 0, z(0.01)]} mat="steelDark" edges />
      <Bolt at={[-0.055, 0, z(0.02)]} dir={sz > 0 ? "+z" : "-z"} s={0.6} />
      <Bolt at={[0.055, 0, z(0.02)]} dir={sz > 0 ? "+z" : "-z"} s={0.6} />
      {[-1, 1].map((sx) => (
        <Fragment key={sx}>
          <Box size={[0.02, 0.12, jawLen]} at={[sx * 0.026, 0, z(0.02 + jawLen / 2)]} mat="steelDark" />
          <Box size={[0.008, 0.1, jawLen - 0.02]} at={[sx * 0.012, 0, z(0.02 + jawLen / 2)]} mat="rubber" castShadow={false} />
        </Fragment>
      ))}
      <Box size={[0.03, 0.1, 0.01]} at={[0, 0, z(0.025)]} mat="rubber" castShadow={false} />
      {top && <Box size={[0.05, 0.03, 0.02]} at={[0, 0.075, z(0.01)]} mat="steelDark" />}
    </group>
  );
}

export default function Counterweight() {
  const root = useRef<THREE.Group>(null);
  const pulley = useRef<THREE.Group>(null);
  useProgressFrame((p) => {
    if (root.current) root.current.position.y = cwtY(p);
    if (pulley.current) pulley.current.rotation.z = (TRAVEL * p) / CWT_PULLEY_R;
  });

  const pulleyAt: V3 = [CWT_X, CWT_PULLEY_DY, CWT_Z];
  return (
    <group ref={root}>
      {/* ---- frame: two stiles facing each other, crossheads, corner gussets ---- */}
      <Channel length={CWT_H} h={STILE_H} b={STILE_B} axis="y" open="-z" at={[CWT_X, CWT_H / 2, STILE_Z[0]]} />
      <Channel length={CWT_H} h={STILE_H} b={STILE_B} axis="y" open="+z" at={[CWT_X, CWT_H / 2, STILE_Z[1]]} />
      <Channel length={CWT_W} h={STILE_H} b={CROSS_H} axis="z" open="+y" at={[CWT_X, CROSS_H / 2, CWT_Z]} />
      <Channel length={CWT_W} h={STILE_H} b={CROSS_H} axis="z" open="-y" at={[CWT_X, CWT_H - CROSS_H / 2, CWT_Z]} />
      {[-1, 1].map((sx) =>
        [0, 1].map((k) =>
          [0.32, CWT_H - 0.32].map((y) => {
            const z = STILE_Z[k] + (k === 0 ? 0.02 : -0.02);
            const x = CWT_X + sx * (STILE_H / 2 + 0.004);
            const dir = sx > 0 ? "+x" : "-x";
            return (
              <Fragment key={`${sx}${k}${y}`}>
                <Box size={[0.008, 0.18, 0.14]} at={[x, y, z]} />
                <Bolt at={[x + sx * 0.004, y + 0.055, z]} dir={dir} s={0.7} />
                <Bolt at={[x + sx * 0.004, y - 0.055, z + 0.04]} dir={dir} s={0.7} />
                <Bolt at={[x + sx * 0.004, y - 0.055, z - 0.04]} dir={dir} s={0.7} />
              </Fragment>
            );
          })
        )
      )}

      {/* ---- filler weights, tie rods, retainer bar ---- */}
      {Array.from({ length: BLOCKS }, (_, i) => (
        <Box key={i} size={[STILE_H, BLOCK_H, CWT_W - 0.18]} at={[CWT_X, STACK_Y0 + BLOCK_H * (i + 0.5), CWT_Z]} mat="iron" edges />
      ))}
      {[0, 1].map((i) => (
        <Box
          key={i}
          size={[STILE_H, 0.075, CWT_W - 0.18]}
          at={[CWT_X, STACK_Y0 + BLOCKS * BLOCK_H + 0.075 * (i + 0.5), CWT_Z]}
          mat="steelDark"
          edges
        />
      ))}
      <Box size={[0.14, 0.03, CWT_W - 0.02]} at={[CWT_X, STACK_TOP + 0.015, CWT_Z]} edges />
      {ROD_Z.map((z) => (
        <Fragment key={z}>
          <Cyl r={0.012} h={CWT_H + 0.04} seg={10} at={[CWT_X, CWT_H / 2 - 0.02, z]} mat="stainless" />
          <Nut at={[CWT_X, STACK_TOP + 0.03, z]} s={0.7} />
          <Nut at={[CWT_X, CWT_H, z]} s={0.7} />
          <Nut at={[CWT_X, -0.04, z]} dir="-y" s={0.7} />
        </Fragment>
      ))}

      {/* ---- guide shoes at the four corners ---- */}
      {SHOE_Y.map((y, i) => (
        <Fragment key={y}>
          <Shoe y={y} sz={1} top={i === 1} />
          <Shoe y={y} sz={-1} top={i === 1} />
        </Fragment>
      ))}

      {/* ---- diverter pulley between two bracket plates on the top crosshead ---- */}
      <group ref={pulley} position={pulleyAt}>
        <Cyl r={CWT_PULLEY_R} h={0.1} seg={36} axis="z" mat="steelDark" />
        {[-0.04, -0.02, 0, 0.02, 0.04].map((dz) => (
          <Cyl key={dz} r={CWT_PULLEY_R + 0.007} h={0.008} seg={36} axis="z" at={[0, 0, dz]} mat="stainless" />
        ))}
        <Cyl r={0.04} h={0.12} seg={20} axis="z" mat="stainless" />
        {Array.from({ length: 4 }, (_, i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
            <Box size={[0.06, 0.02, 0.015]} at={[0.075, 0, 0.055]} mat="steelDark" />
          </group>
        ))}
      </group>
      <Cyl r={0.02} h={0.26} seg={16} axis="z" at={pulleyAt} mat="stainless" />
      <Nut at={[CWT_X, CWT_PULLEY_DY, CWT_Z + 0.13]} dir="+z" s={0.8} />
      <Nut at={[CWT_X, CWT_PULLEY_DY, CWT_Z - 0.13]} dir="-z" s={0.8} />
      {PLATE_Z.map((z, i) => {
        const out = i === 0 ? 1 : -1; // outward side of the plate
        return (
          <Fragment key={z}>
            <Box size={[0.16, 0.34, 0.02]} at={[CWT_X, CWT_H + 0.17, z]} edges />
            <Box size={[0.16, 0.02, 0.04]} at={[CWT_X, CWT_H + 0.01, z + out * 0.03]} />
            <Bolt at={[CWT_X - 0.05, CWT_H + 0.02, z + out * 0.03]} s={0.8} />
            <Bolt at={[CWT_X + 0.05, CWT_H + 0.02, z + out * 0.03]} s={0.8} />
          </Fragment>
        );
      })}
      <Box size={[0.14, 0.03, 0.13]} at={[CWT_X, CWT_H + 0.325, CWT_Z]} edges />
      <Bolt at={[CWT_X - 0.04, CWT_H + 0.34, CWT_Z]} s={0.6} />
      <Bolt at={[CWT_X + 0.04, CWT_H + 0.34, CWT_Z]} s={0.6} />
      {/* rope retainer under the pulley, bolted to the crosshead through a saddle */}
      <Ring R={CWT_PULLEY_R + 0.035} r={0.005} arc={Math.PI} seg={32} tube={6} at={pulleyAt} rot={[0, 0, Math.PI]} mat="accent" />
      {PLATE_Z.map((z, i) =>
        [-1, 1].map((sx) => (
          <Fragment key={`${z}${sx}`}>
            <Box size={[0.03, 0.05, 0.02]} at={[CWT_X + sx * 0.145, CWT_PULLEY_DY - 0.03, z]} />
            <Bolt at={[CWT_X + sx * 0.145, CWT_PULLEY_DY - 0.03, z + (i === 0 ? 0.011 : -0.011)]} dir={i === 0 ? "+z" : "-z"} s={0.5} />
          </Fragment>
        ))
      )}
      <Box size={[0.1, 0.012, 0.03]} at={[CWT_X, CWT_H + 0.006, CWT_Z]} />
      <Bolt at={[CWT_X - 0.035, CWT_H + 0.012, CWT_Z]} s={0.5} />
      <Bolt at={[CWT_X + 0.035, CWT_H + 0.012, CWT_Z]} s={0.5} />

      {/* ---- buffer striker plate with a rubber pad ---- */}
      <Box size={[0.14, 0.02, 0.5]} at={[CWT_X, -0.01, CWT_Z]} edges />
      <Box size={[0.12, 0.02, 0.2]} at={[CWT_X, -0.03, CWT_Z]} mat="rubber" />
      {[-0.05, 0.05].map((dx) =>
        [-0.15, 0.15].map((dz) => <Bolt key={`${dx}${dz}`} at={[CWT_X + dx, -0.02, CWT_Z + dz]} dir="-y" s={0.6} />)
      )}
    </group>
  );
}
