"use client";

import { Fragment, useRef } from "react";
import * as THREE from "three";
import { Box, Cyl, Hex, Spring } from "../prims";
import { Bolt, Nut } from "../Bolts";
import { useProgressFrame } from "../scene-context";
import {
  BUFFER_TOP,
  CAR_BUFFER_X,
  CWT_BUFFER_TOP,
  CWT_X,
  CWT_Z,
  GOV_R,
  GOV_TENSION_Y,
  GOV_X,
  GOV_Z,
  LADDER,
  PIT_FLOOR,
  govAngle,
} from "../dims";

/**
 * Pit equipment: the two oil buffers under the car, the spring buffer under
 * the counterweight, the governor tension sheave with its weight and slack
 * rope switch, the pit ladder and the counterweight guard screen. Only the
 * tension sheave moves (it turns with the governor rope).
 */

const OIL_TOP = -1.18; // top of the buffer cylinder, where the plunger comes out
const PIVOT: [number, number, number] = [-0.8, -0.85, 0.2]; // tension arm pivot on the rail bracket
const ARM_LEN = Math.hypot(GOV_X - PIVOT[0], GOV_TENSION_Y - PIVOT[1], GOV_Z - PIVOT[2]);

/** oil buffer under the car sling; `sx` picks the left / right unit */
function OilBuffer({ sx }: { sx: 1 | -1 }) {
  const x = sx * CAR_BUFFER_X;
  return (
    <group position={[x, 0, 0]}>
      <Box size={[0.3, 0.02, 0.3]} at={[0, PIT_FLOOR + 0.01, 0]} edges />
      {[-0.11, 0.11].map((dx) =>
        [-0.11, 0.11].map((dz) => <Bolt key={`${dx}${dz}`} at={[dx, PIT_FLOOR + 0.02, dz]} s={1.2} />)
      )}
      <Cyl r={0.1} h={0.02} seg={24} at={[0, PIT_FLOOR + 0.03, 0]} />
      <Cyl r={0.07} h={0.5} seg={24} at={[0, PIT_FLOOR + 0.27, 0]} />
      <Cyl r={0.085} h={0.04} seg={24} at={[0, OIL_TOP + 0.02, 0]} mat="steelDark" />
      <Hex r={0.015} h={0.015} at={[0.04, OIL_TOP + 0.047, 0.02]} mat="steelDark" />
      <Cyl r={0.045} h={BUFFER_TOP - 0.02 - OIL_TOP} seg={20} at={[0, (BUFFER_TOP - 0.02 + OIL_TOP) / 2, 0]} mat="steelDark" />
      <Cyl r={0.06} h={0.02} seg={20} at={[0, BUFFER_TOP - 0.01, 0]} mat="rubber" />
      <Box size={[0.015, 0.08, 0.015]} at={[0, -1.4, 0.075]} mat="accent" />
      {/* buffer switch on a bracket, its lever riding the plunger */}
      <Box size={[0.03, 0.16, 0.03]} at={[sx * 0.09, -1.13, 0]} />
      <Box size={[0.05, 0.08, 0.04]} at={[sx * 0.11, -1.05, 0]} edges />
      <Bolt at={[sx * 0.11, -1.02, 0.021]} dir="+z" s={0.5} />
      <Bolt at={[sx * 0.11, -1.08, 0.021]} dir="+z" s={0.5} />
      <Box size={[0.08, 0.008, 0.01]} at={[sx * 0.075, -1.0, 0]} mat="accent" />
      <Box size={[0.06, 0.03, 0.004]} at={[0, -1.25, 0.072]} mat="accent" castShadow={false} />
    </group>
  );
}

export default function Pit() {
  const sheave = useRef<THREE.Group>(null);
  useProgressFrame((p) => {
    if (sheave.current) sheave.current.rotation.z = govAngle(p);
  });

  return (
    <group>
      <OilBuffer sx={1} />
      <OilBuffer sx={-1} />

      {/* ---- counterweight spring buffer ---- */}
      <group position={[CWT_X, 0, CWT_Z]}>
        <Box size={[0.24, 0.02, 0.3]} at={[0, PIT_FLOOR + 0.01, 0]} edges />
        {[-0.08, 0.08].map((dx) =>
          [-0.11, 0.11].map((dz) => <Bolt key={`${dx}${dz}`} at={[dx, PIT_FLOOR + 0.02, dz]} s={1.0} />)
        )}
        <Cyl r={0.08} h={0.2} seg={20} at={[0, PIT_FLOOR + 0.12, 0]} />
        <Spring R={0.07} r={0.012} h={CWT_BUFFER_TOP - 0.02 - (PIT_FLOOR + 0.22)} turns={7} at={[0, PIT_FLOOR + 0.22, 0]} />
        <Cyl r={0.02} h={CWT_BUFFER_TOP - 0.02 - (PIT_FLOOR + 0.22)} seg={12} at={[0, (CWT_BUFFER_TOP - 0.02 + PIT_FLOOR + 0.22) / 2, 0]} mat="steelDark" />
        <Cyl r={0.09} h={0.02} seg={24} at={[0, CWT_BUFFER_TOP - 0.01, 0]} />
      </group>

      {/* ---- governor tension sheave on its pivoting arm ---- */}
      <Box size={[0.02, 0.2, 0.16]} at={[-0.79, -0.85, 0.15]} edges />
      <Bolt at={[-0.8, -0.79, 0.15]} dir="-x" s={0.8} />
      <Bolt at={[-0.8, -0.91, 0.15]} dir="-x" s={0.8} />
      <Cyl r={0.015} h={0.16} seg={12} axis="z" at={PIVOT} mat="stainless" />
      <Box
        size={[0.04, ARM_LEN, 0.04]}
        at={[(PIVOT[0] + GOV_X) / 2, (PIVOT[1] + GOV_TENSION_Y) / 2, (PIVOT[2] + GOV_Z) / 2]}
        rot={[-Math.atan2(GOV_Z - PIVOT[2], PIVOT[1] - GOV_TENSION_Y), 0, -Math.atan2(PIVOT[0] - GOV_X, PIVOT[1] - GOV_TENSION_Y)]}
      />
      <group position={[GOV_X, GOV_TENSION_Y, GOV_Z]}>
        <group ref={sheave}>
          <Cyl r={GOV_R} h={0.04} seg={32} axis="z" mat="steelDark" />
          <Cyl r={GOV_R + 0.008} h={0.006} seg={32} axis="z" at={[0, 0, 0.02]} mat="stainless" />
          <Cyl r={GOV_R + 0.008} h={0.006} seg={32} axis="z" at={[0, 0, -0.02]} mat="stainless" />
          <Cyl r={0.035} h={0.06} seg={16} axis="z" mat="stainless" />
          {Array.from({ length: 4 }, (_, i) => (
            <group key={i} rotation={[0, 0, (i * Math.PI) / 2 + Math.PI / 4]}>
              <Box size={[0.09, 0.02, 0.015]} at={[0.09, 0, 0.03]} mat="steelDark" />
            </group>
          ))}
        </group>
        <Cyl r={0.015} h={0.1} seg={12} axis="z" mat="stainless" />
        <Nut at={[0, 0, 0.05]} dir="+z" s={0.5} />
        {/* tension weight hanging under the axle */}
        <Box size={[0.02, 0.12, 0.02]} at={[0, -0.12, 0]} />
        <Box size={[0.14, 0.3, 0.1]} at={[0, -0.27, 0]} mat="iron" edges />
      </group>
      {/* slack-rope switch watching the arm */}
      <Box size={[0.05, 0.07, 0.04]} at={[-0.765, -0.95, 0.25]} edges />
      <Bolt at={[-0.765, -0.925, 0.271]} dir="+z" s={0.5} />
      <Bolt at={[-0.765, -0.975, 0.271]} dir="+z" s={0.5} />
      <Box size={[0.09, 0.008, 0.008]} at={[-0.81, -0.98, 0.25]} rot={[0, 0, 0.35]} mat="accent" />

      {/* ---- pit ladder ---- */}
      <group position={[LADDER[0], 0, LADDER[2]]}>
        {[-0.2, 0.2].map((dz) => (
          <Fragment key={dz}>
            <Box size={[0.03, 2.2, 0.03]} at={[0, PIT_FLOOR + 1.1, dz]} edges />
            <Box size={[0.05, 0.02, 0.05]} at={[0, PIT_FLOOR + 0.01, dz]} mat="rubber" />
            {[-0.8, 0.2].map((y) => (
              <Fragment key={y}>
                <Box size={[0.08, 0.04, 0.06]} at={[-0.055, y, dz]} />
                <Bolt at={[-0.09, y, dz]} dir="-x" s={0.8} />
              </Fragment>
            ))}
          </Fragment>
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <Cyl key={i} r={0.012} h={0.4} seg={10} axis="z" at={[0, PIT_FLOOR + 0.25 + i * 0.28, 0]} />
        ))}
      </group>

      {/* ---- counterweight guard screen ---- */}
      <group position={[CWT_X - 0.2, 0, CWT_Z]}>
        <Box size={[0.02, 2.0, 0.9]} at={[0, -0.4, 0]} mat="glass" castShadow={false} />
        {[-1, 1].map((sy) => (
          <Box key={sy} size={[0.03, 0.03, 0.9]} at={[0, -0.4 + sy, 0]} />
        ))}
        {[-1, 1].map((sz) => (
          <Fragment key={sz}>
            <Box size={[0.03, 2.0, 0.03]} at={[0, -0.4, sz * 0.45]} />
            <Box size={[0.03, 0.3, 0.03]} at={[0, PIT_FLOOR + 0.15, sz * 0.45]} />
            <Box size={[0.09, 0.01, 0.09]} at={[0, PIT_FLOOR + 0.005, sz * 0.45]} />
            <Bolt at={[0, PIT_FLOOR + 0.01, sz * 0.45 - 0.03]} s={0.8} />
            <Bolt at={[0, PIT_FLOOR + 0.01, sz * 0.45 + 0.03]} s={0.8} />
          </Fragment>
        ))}
      </group>

      {/* ---- drain grate over the sump ---- */}
      <Box size={[0.4, 0.01, 0.4]} at={[-0.3, PIT_FLOOR - 0.005, 0.85]} mat="steelDark" />
      {[-0.15, -0.075, 0, 0.075, 0.15].map((dz) => (
        <Box key={dz} size={[0.36, 0.014, 0.02]} at={[-0.3, PIT_FLOOR - 0.002, 0.85 + dz]} mat="steelDark" />
      ))}
    </group>
  );
}
