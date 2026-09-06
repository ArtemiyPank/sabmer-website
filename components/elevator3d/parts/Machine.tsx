"use client";

import { Fragment, useRef } from "react";
import * as THREE from "three";
import { Box, Channel, Cyl, IBeam, Ring, Spring } from "../prims";
import { Bolt, BoltRing, Nut } from "../Bolts";
import { useProgressFrame } from "../scene-context";
import {
  BED_X,
  BED_Y,
  BED_Z,
  CWT_RAIL_X,
  GOV_R,
  GOV_ROPE_X,
  GOV_X,
  GOV_Y,
  GOV_Z,
  HITCH_CAR_X,
  HITCH_CWT_X,
  HITCH_Y,
  HOOK_BEAM_Y,
  MACHINE_BEAM_H,
  MOTOR_R,
  MOTOR_Z,
  RAIL_BLADE_H,
  RAIL_T,
  RAIL_TOP,
  RAIL_X,
  ROPE_OFFSETS,
  ROPE_Z,
  SHAFT_TOP,
  SHEAVE_C,
  SHEAVE_R,
  SHEAVE_W,
  TCABLE_WALL,
  govAngle,
  sheaveAngle,
  type V3,
} from "../dims";

/**
 * Machine-room-less drive at the top of the hoistway: gearless PM traction
 * machine (overhung sheave, disc brake) on a bedplate that rests on the rail
 * tops via short support beams,
 * the two rope hitch plates of the 2:1 roping under the bedplate, the
 * overspeed governor bolted to the left car rail, and the lifting beam under
 * the overhead slab. The sheave/rotor and the governor sheave turn with the
 * scroll progress; everything else is static.
 */

const BED_CX = (BED_X[0] + BED_X[1]) / 2;
const BED_CY = (BED_Y[0] + BED_Y[1]) / 2;
const BED_LEN = BED_X[1] - BED_X[0];
const BED_H = BED_Y[1] - BED_Y[0];
const BED_B = 0.09; // channel flange width
const BED_T = 0.012;
const BEAM_CY = RAIL_TOP - MACHINE_BEAM_H / 2; // support beams: rail caps -> bedplate underside
const BEAM_B = 0.08;
const CAR_RAIL_FOOT_X = RAIL_X + RAIL_BLADE_H - RAIL_T / 2; // 0.774, beam centre over the car rails
const CROSS_X = [-0.85, -0.2, 0.3, 1.1]; // cross members, clear of the rope x positions
const FINS = 15;
const MOTOR_CZ = (MOTOR_Z[0] + MOTOR_Z[1]) / 2;
const MOTOR_L = MOTOR_Z[1] - MOTOR_Z[0];
const BASE_Y = BED_Y[1] + 0.04; // cast base centre (0.08 thick on the bedplate top)
const BASE_TOP = BED_Y[1] + 0.08;
const HITCH_PLATE_Y = BED_Y[0] - 0.015; // plate 12.82..12.85 under the channel flanges
const CABLE_TOP_Y = SHEAVE_C[1] + MOTOR_R + 0.08; // conduit leaving the terminal box
const CABLE_RUN_Y = BED_Y[1] + 0.04; // conduit resting on the bedplate top flange

/** support beam along z between the rail cap plates and the bedplate */
function SupportBeam({ x, z0, z1 }: { x: number; z0: number; z1: number }) {
  return <IBeam length={Math.abs(z1 - z0)} h={MACHINE_BEAM_H} b={BEAM_B} t={0.01} axis="z" at={[x, BEAM_CY, (z0 + z1) / 2]} />;
}

/** rope hitch: plate under both channels, per rope a rod, nut, spring, seat washer and socket */
function Hitch({ x }: { x: number }) {
  return (
    <group position={[x, 0, ROPE_Z]}>
      <Box size={[0.1, 0.03, 0.5]} at={[0, HITCH_PLATE_Y, 0]} edges />
      {[-0.035, 0.035].map((dx) =>
        [-0.22, 0.22].map((dz) => <Bolt key={`${dx}${dz}`} at={[dx, HITCH_PLATE_Y - 0.015, dz]} dir="-y" s={0.9} />)
      )}
      {ROPE_OFFSETS.map((dz) => (
        <Fragment key={dz}>
          <Cyl r={0.012} h={0.4} seg={10} at={[0, HITCH_Y + 0.2, dz]} mat="stainless" />
          <Nut at={[0, BED_Y[0], dz]} s={0.6} />
          <Spring R={0.015} r={0.003} h={0.2} turns={7} at={[0, HITCH_Y + 0.1, dz]} />
          <Cyl r={0.03} h={0.008} seg={16} at={[0, HITCH_Y + 0.096, dz]} />
          <Cyl r={0.02} h={0.1} seg={12} at={[0, HITCH_Y + 0.05, dz]} mat="steelDark" />
        </Fragment>
      ))}
    </group>
  );
}

/** brake caliper straddling the disc at angle `a` (rad) from the sheave centre, radius 0.2 */
function Caliper({ a }: { a: number }) {
  const at: V3 = [SHEAVE_C[0] + 0.2 * Math.cos(a), SHEAVE_C[1] + 0.2 * Math.sin(a), -0.63];
  return (
    <group position={at} rotation={[0, 0, a - Math.PI / 2]}>
      <Box size={[0.1, 0.14, 0.06]} edges />
      <Bolt at={[-0.03, -0.03, 0.03]} dir="+z" s={0.6} />
      <Bolt at={[0.03, -0.03, 0.03]} dir="+z" s={0.6} />
      <Cyl r={0.03} h={0.08} seg={16} at={[0, 0.11, 0]} mat="steelDark" />
      <Box size={[0.015, 0.12, 0.015]} at={[0.05, 0.1, 0]} rot={[0, 0, -0.5]} mat="accent" />
    </group>
  );
}

export default function Machine() {
  const rotor = useRef<THREE.Group>(null);
  const gov = useRef<THREE.Group>(null);
  useProgressFrame((p) => {
    if (rotor.current) rotor.current.rotation.z = -sheaveAngle(p);
    if (gov.current) gov.current.rotation.z = govAngle(p);
  });

  return (
    <group>
      {/* ---- bedplate: two channels facing each other, cross members between them ---- */}
      <Channel length={BED_LEN} h={BED_H} b={BED_B} t={BED_T} open="-z" at={[BED_CX, BED_CY, BED_Z[0]]} />
      <Channel length={BED_LEN} h={BED_H} b={BED_B} t={BED_T} open="+z" at={[BED_CX, BED_CY, BED_Z[1]]} />
      {CROSS_X.map((x) => (
        <Box key={x} size={[0.06, BED_H - 0.02, BED_Z[0] - BED_Z[1] - BED_B]} at={[x, BED_CY, ROPE_Z]} edges />
      ))}
      {[CROSS_X[0], CROSS_X[3]].map((x) =>
        BED_Z.map((z) => (
          <Box key={`${x}${z}`} size={[0.05, 0.06, 0.06]} at={[x, BED_CY - 0.05, z + (z > ROPE_Z ? -0.05 : 0.05)]} />
        ))
      )}

      {/* ---- support beams on the rail caps, isolation pads and hold-down bolts ---- */}
      <SupportBeam x={-CAR_RAIL_FOOT_X} z0={0.05} z1={-0.8} />
      <SupportBeam x={CAR_RAIL_FOOT_X} z0={0.05} z1={-0.8} />
      <SupportBeam x={CWT_RAIL_X} z0={-0.05} z1={-1.04} />
      {[-CAR_RAIL_FOOT_X, CAR_RAIL_FOOT_X, CWT_RAIL_X].map((x) =>
        BED_Z.map((z) => (
          <Fragment key={`${x}${z}`}>
            <Box size={[0.12, 0.03, 0.12]} at={[x, BED_Y[0], z]} mat="rubber" castShadow={false} />
            <Bolt at={[x - 0.03, BED_Y[0] + BED_T, z]} s={0.8} />
            <Bolt at={[x + 0.03, BED_Y[0] + BED_T, z]} s={0.8} />
          </Fragment>
        ))
      )}

      {/* ---- cast machine base (frame with a slot for the rope drops) and four hold-down bolts ---- */}
      <Box size={[0.13, 0.08, 0.23]} at={[SHEAVE_C[0] - 0.235, BASE_Y, -0.735]} mat="iron" edges />
      <Box size={[0.13, 0.08, 0.23]} at={[SHEAVE_C[0] + 0.235, BASE_Y, -0.735]} mat="iron" edges />
      <Box size={[0.6, 0.08, 0.13]} at={[SHEAVE_C[0], BASE_Y, -0.415]} mat="iron" edges />
      <Box size={[0.12, 0.08, 0.14]} at={[SHEAVE_C[0] - 0.24, BASE_Y, -0.55]} mat="iron" edges />
      <Box size={[0.12, 0.08, 0.14]} at={[SHEAVE_C[0] + 0.24, BASE_Y, -0.55]} mat="iron" edges />
      {[-0.26, 0.26].map((dx) =>
        [-0.21, 0.21].map((dz) => <Bolt key={`${dx}${dz}`} at={[SHEAVE_C[0] + dx, BASE_TOP, -0.6 + dz]} s={1.4} />)
      )}

      {/* ---- PM motor: finned housing, rear end shield, encoder, terminal box ---- */}
      <group position={[SHEAVE_C[0], SHEAVE_C[1], MOTOR_CZ]}>
        <Cyl r={MOTOR_R} h={MOTOR_L} seg={32} axis="z" mat="steelDark" />
        {Array.from({ length: FINS }, (_, i) => (
          <group key={i} rotation={[0, 0, THREE.MathUtils.degToRad(10 + (i * 160) / (FINS - 1))]}>
            <Box size={[0.06, 0.01, MOTOR_L - 0.04]} at={[MOTOR_R + 0.02, 0, 0]} mat="steelDark" />
          </group>
        ))}
        <Cyl r={MOTOR_R + 0.01} h={0.03} seg={32} axis="z" at={[0, 0, -MOTOR_L / 2 - 0.015]} />
        <BoltRing at={[0, 0, -MOTOR_L / 2 - 0.03]} dir="-z" R={0.23} count={8} s={0.7} />
        <Cyl r={0.04} h={0.06} seg={16} axis="z" at={[0, 0, -MOTOR_L / 2 - 0.06]} mat="steelDark" />
        <Cyl r={0.006} h={SHEAVE_C[1] - BED_Y[1]} seg={6} at={[0, (BED_Y[1] - SHEAVE_C[1]) / 2, -MOTOR_L / 2 - 0.06]} mat="rubber" castShadow={false} />
        <Box size={[0.14, 0.1, 0.12]} at={[0, MOTOR_R + 0.03, 0]} edges />
        {[-0.05, 0.05].map((dx) =>
          [-0.04, 0.04].map((dz) => <Bolt key={`${dx}${dz}`} at={[dx, MOTOR_R + 0.08, dz]} s={0.5} />)
        )}
        <Cyl r={0.015} h={0.04} seg={10} axis="x" at={[0.09, MOTOR_R + 0.03, 0]} mat="steelDark" />
        <Ring R={0.03} r={0.008} axis="x" seg={20} tube={8} at={[0, MOTOR_R + 0.03, MOTOR_L / 2 - 0.03]} />
        <Box size={[0.004, 0.05, 0.1]} at={[MOTOR_R + 0.002, 0, 0]} mat="accent" castShadow={false} />
      </group>

      {/* ---- brake calipers, bolted to the bracket ring on the motor front face ---- */}
      <Caliper a={Math.PI / 4} />
      <Caliper a={(3 * Math.PI) / 4} />
      {[Math.PI / 4, (3 * Math.PI) / 4].map((a) => {
        const cx = SHEAVE_C[0] + 0.2 * Math.cos(a);
        const cy = SHEAVE_C[1] + 0.2 * Math.sin(a);
        return (
          <Fragment key={a}>
            <Box size={[0.22, 0.06, 0.02]} at={[cx, cy, MOTOR_Z[1] - 0.01]} rot={[0, 0, a - Math.PI / 2]} />
            <Bolt at={[cx + 0.07 * Math.cos(a), cy + 0.07 * Math.sin(a), MOTOR_Z[1] + 0.001]} dir="+z" s={0.7} />
            <Bolt at={[cx - 0.07 * Math.cos(a), cy - 0.07 * Math.sin(a), MOTOR_Z[1] + 0.001]} dir="+z" s={0.7} />
          </Fragment>
        );
      })}

      {/* ---- rotor: brake disc, shaft, traction sheave with groove flanges, hub and spokes ---- */}
      <group ref={rotor} position={SHEAVE_C}>
        <Cyl r={0.24} h={0.025} seg={40} axis="z" at={[0, 0, MOTOR_Z[1] + 0.02 - ROPE_Z]} mat="iron" />
        <Cyl r={0.03} h={0.12} seg={16} axis="z" at={[0, 0, -0.06]} mat="stainless" />
        <Cyl r={SHEAVE_R} h={SHEAVE_W} seg={40} axis="z" mat="steelDark" />
        {[-0.04, -0.02, 0, 0.02, 0.04].map((dz) => (
          <Cyl key={dz} r={SHEAVE_R + 0.008} h={0.008} seg={40} axis="z" at={[0, 0, dz]} mat="stainless" />
        ))}
        <Cyl r={0.07} h={0.13} seg={24} axis="z" mat="stainless" />
        <BoltRing at={[0, 0, 0.065]} dir="+z" R={0.05} count={8} s={0.8} />
        {Array.from({ length: 6 }, (_, i) => (
          <group key={i} rotation={[0, 0, (i * Math.PI) / 3]}>
            <Box size={[0.08, 0.03, 0.02]} at={[0.1, 0, SHEAVE_W / 2 + 0.005]} mat="steelDark" />
          </group>
        ))}
      </group>

      {/* ---- rope retainer over the sheave on two posts standing on the base ---- */}
      <Ring R={SHEAVE_R + 0.035} r={0.006} arc={Math.PI} seg={32} tube={8} at={SHEAVE_C} />
      {[-1, 1].map((sx) => (
        <Fragment key={sx}>
          <Box
            size={[0.02, SHEAVE_C[1] + 0.01 - BASE_TOP, 0.02]}
            at={[SHEAVE_C[0] + sx * (SHEAVE_R + 0.035), (SHEAVE_C[1] + 0.01 + BASE_TOP) / 2, ROPE_Z]}
          />
          <Bolt at={[SHEAVE_C[0] + sx * (SHEAVE_R + 0.035), BASE_TOP, ROPE_Z + 0.03]} s={0.5} />
        </Fragment>
      ))}

      {/* ---- rope hitches of the 2:1 roping ---- */}
      <Hitch x={HITCH_CAR_X} />
      <Hitch x={HITCH_CWT_X} />

      {/* ---- overspeed governor on the left car rail ---- */}
      <group position={[GOV_X, GOV_Y, GOV_Z]}>
        <group ref={gov}>
          <Cyl r={GOV_R} h={0.04} seg={32} axis="z" mat="steelDark" />
          <Cyl r={GOV_R + 0.008} h={0.006} seg={32} axis="z" at={[0, 0, 0.02]} mat="stainless" />
          <Cyl r={GOV_R + 0.008} h={0.006} seg={32} axis="z" at={[0, 0, -0.02]} mat="stainless" />
          <Cyl r={0.04} h={0.06} seg={16} axis="z" mat="stainless" />
          {Array.from({ length: 4 }, (_, i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI) / 2]}>
              <Box size={[0.08, 0.02, 0.015]} at={[0.09, 0, 0.03]} mat="steelDark" />
            </group>
          ))}
          {[0, Math.PI].map((a) => (
            <group key={a} rotation={[0, 0, a]}>
              <Box size={[0.06, 0.03, 0.02]} at={[0.1, 0, 0.04]} mat="accent" />
              <Box size={[0.05, 0.008, 0.008]} at={[0.06, 0.02, 0.04]} rot={[0, 0, 0.6]} mat="steelDark" />
            </group>
          ))}
        </group>
        {/* frame plate behind the sheave, mounting arm to the rail foot, jaw block, trip lever, switch, guard */}
        <Box size={[0.12, 0.36, 0.03]} at={[0, 0, -0.03]} edges />
        <Box size={[0.088, 0.3, 0.3]} at={[0.034, -0.05, -0.17]} edges />
        <Bolt at={[0.074, 0.01, -0.29]} dir="+x" s={0.9} />
        <Bolt at={[0.074, -0.11, -0.29]} dir="+x" s={0.9} />
        <Box size={[0.05, 0.08, 0.05]} at={[GOV_ROPE_X[1] - GOV_X + 0.03, -0.2, 0]} mat="steelDark" edges />
        <Spring R={0.015} r={0.003} h={0.08} turns={5} at={[GOV_ROPE_X[1] - GOV_X + 0.03, -0.16, 0]} />
        <Box size={[0.015, 0.1, 0.015]} at={[GOV_ROPE_X[1] - GOV_X + 0.05, -0.11, 0]} rot={[0, 0, -0.3]} mat="accent" />
        <Box size={[0.06, 0.08, 0.05]} at={[0, 0.22, -0.03]} edges />
        <Bolt at={[-0.02, 0.22, -0.005]} dir="+z" s={0.5} />
        <Bolt at={[0.02, 0.22, -0.005]} dir="+z" s={0.5} />
        <Box size={[0.01, 0.06, 0.01]} at={[0.035, 0.19, 0]} rot={[0, 0, -0.4]} mat="steelDark" />
        <Ring R={GOV_R + 0.02} r={0.004} arc={Math.PI} seg={32} tube={6} />
      </group>

      {/* ---- lifting beam under the overhead slab, hanger plates, hook trolley, load plate ---- */}
      <IBeam length={2.2} h={0.16} b={0.1} at={[0.1, HOOK_BEAM_Y, ROPE_Z]} />
      {[-0.7, 0.9].map((x) => (
        <Fragment key={x}>
          <Box size={[0.03, SHAFT_TOP - HOOK_BEAM_Y - 0.08, 0.12]} at={[x, (SHAFT_TOP + HOOK_BEAM_Y + 0.08) / 2, ROPE_Z]} />
          <Bolt at={[x, SHAFT_TOP, ROPE_Z - 0.04]} dir="-y" s={1.2} />
          <Bolt at={[x, SHAFT_TOP, ROPE_Z + 0.04]} dir="-y" s={1.2} />
        </Fragment>
      ))}
      <Box size={[0.08, 0.06, 0.1]} at={[SHEAVE_C[0], HOOK_BEAM_Y - 0.11, ROPE_Z]} mat="steelDark" edges />
      <Ring R={0.03} r={0.008} seg={20} tube={8} at={[SHEAVE_C[0], HOOK_BEAM_Y - 0.17, ROPE_Z]} />
      <Box size={[0.1, 0.04, 0.004]} at={[-0.3, HOOK_BEAM_Y, ROPE_Z + 0.008]} mat="accent" castShadow={false} />

      {/* ---- motor cable: down beside the machine, along the bedplate on saddle clips,
              then across to the trunking above the wall junction box ---- */}
      <Cyl r={0.02} h={0.36} seg={10} axis="x" at={[0.63, CABLE_TOP_Y, MOTOR_CZ]} mat="rubber" castShadow={false} />
      <Cyl r={0.02} h={CABLE_TOP_Y - CABLE_RUN_Y} seg={10} at={[0.45, (CABLE_TOP_Y + CABLE_RUN_Y) / 2, MOTOR_CZ]} mat="rubber" castShadow={false} />
      <Cyl r={0.02} h={1.65} seg={10} axis="x" at={[-0.375, CABLE_RUN_Y, MOTOR_CZ]} mat="rubber" castShadow={false} />
      <Cyl r={0.02} h={TCABLE_WALL[2] - MOTOR_CZ} seg={10} axis="z" at={[-1.2, CABLE_RUN_Y, (MOTOR_CZ + TCABLE_WALL[2]) / 2]} mat="rubber" castShadow={false} />
      {[0.2, -0.3, -0.8].map((x) => (
        <Fragment key={x}>
          <Box size={[0.05, 0.04, 0.05]} at={[x, CABLE_RUN_Y - 0.03, MOTOR_CZ]} />
          <Bolt at={[x, BED_Y[1], MOTOR_CZ]} s={0.4} />
        </Fragment>
      ))}
    </group>
  );
}
