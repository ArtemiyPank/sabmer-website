"use client";

import { Fragment } from "react";
import { Box, Cyl } from "../prims";
import { Bolt, BoltGrid } from "../Bolts";
import { CAB_FRONT, DOOR_H, DOOR_T, DOOR_W, DOOR_Z, PANEL_T } from "../dims";

/**
 * Car doors (centre opening), their header with the hanger track, and the
 * belt-driven door operator on the car top. Car-local coordinates; the door
 * panels slide apart through the `doorL` / `doorR` explosion offsets.
 */

const TRACK_Y = 2.17;
const HANGER_Y = 2.16;

/** one door panel with its astragal, hanger plate, rollers and gibs */
export function DoorPanel({ sx }: { sx: 1 | -1 }) {
  const x = sx * (DOOR_W / 2);
  return (
    <>
      <Box size={[DOOR_W, DOOR_H, DOOR_T]} at={[x, DOOR_H / 2, DOOR_Z]} mat="stainless" edges />
      <Box size={[0.01, DOOR_H, 0.035]} at={[sx * 0.005, DOOR_H / 2, DOOR_Z]} mat="rubber" />
      <Box size={[0.3, 0.16, 0.01]} at={[x, HANGER_Y, DOOR_Z + 0.015]} />
      <BoltGrid at={[x, HANGER_Y, DOOR_Z + 0.021]} dir="+z" w={0.2} h={0.1} s={0.5} />
      {[-0.1, 0.1].map((dx) => (
        <Cyl key={dx} r={0.035} h={0.02} seg={14} axis="z" at={[x + dx, 2.22, DOOR_Z + 0.03]} mat="rubber" />
      ))}
      <Cyl r={0.02} h={0.02} seg={12} axis="z" at={[x, 2.135, DOOR_Z + 0.03]} mat="rubber" />
      {[-0.15, 0.15].map((dx) => (
        <Fragment key={dx}>
          <Box size={[0.03, 0.03, 0.02]} at={[x + dx, 0.015, DOOR_Z + 0.015]} mat="steelDark" />
          <Bolt at={[x + dx, 0.015, DOOR_Z + 0.026]} dir="+z" s={0.35} />
        </Fragment>
      ))}
      {sx > 0 && (
        <>
          <Box size={[0.05, 0.3, 0.06]} at={[0.35, 1.0, DOOR_Z + 0.05]} mat="steelDark" edges />
          {[-0.02, 0.02].map((dx) => (
            <Box key={dx} size={[0.01, 0.3, 0.04]} at={[0.35 + dx, 1.0, DOOR_Z + 0.09]} />
          ))}
          <Bolt at={[0.35, 1.12, DOOR_Z + 0.081]} dir="+z" s={0.4} />
          <Bolt at={[0.35, 0.88, DOOR_Z + 0.081]} dir="+z" s={0.4} />
        </>
      )}
    </>
  );
}

/** hanger track, header plate, transom and end stops */
export function DoorHeader() {
  return (
    <>
      <Box size={[1.8, 0.03, 0.02]} at={[0, TRACK_Y, DOOR_Z + 0.03]} mat="steelDark" />
      <Box size={[1.8, 0.15, 0.01]} at={[0, 2.2, DOOR_Z - 0.02]} edges />
      <BoltGrid at={[0, 2.26, DOOR_Z - 0.026]} dir="-z" w={1.6} h={0} n={[6, 1]} s={0.6} />
      <Box size={[0.84, 0.1, PANEL_T]} at={[0, 2.15, CAB_FRONT + PANEL_T / 2]} mat="cab" edges />
      {[-0.87, 0.87].map((x) => (
        <Box key={x} size={[0.03, 0.03, 0.03]} at={[x, TRACK_Y, DOOR_Z + 0.03]} mat="rubber" />
      ))}
    </>
  );
}

/** belt-driven operator on the car top: motor, pulleys, belt, arms and controller */
export function DoorOperator() {
  return (
    <>
      <Box size={[0.9, 0.02, 0.16]} at={[0.1, 2.27, 0.63]} edges />
      <BoltGrid at={[0.1, 2.28, 0.63]} dir="+y" w={0.8} h={0.1} s={0.7} />
      <Box size={[0.18, 0.06, 0.1]} at={[-0.05, 2.31, 0.63]} />
      <Cyl r={0.06} h={0.16} seg={20} axis="x" at={[-0.05, 2.36, 0.63]} mat="steelDark" />
      <Cyl r={0.03} h={0.03} seg={12} axis="x" at={[-0.145, 2.36, 0.63]} mat="steelDark" />
      <Box size={[0.08, 0.1, 0.1]} at={[0.05, 2.36, 0.68]} edges />
      {[-0.45, 0.05, 0.45].map((x) => (
        <Cyl key={x} r={0.05} h={0.02} seg={16} axis="z" at={[x, 2.36, 0.76]} mat="steelDark" />
      ))}
      {[2.41, 2.31].map((y) => (
        <Box key={y} size={[0.9, 0.006, 0.015]} at={[0, y, 0.76]} mat="rubber" />
      ))}
      <Box size={[0.02, 0.1, 0.02]} at={[0.31, 2.26, 0.76]} />
      <Box size={[0.02, 0.17, 0.02]} at={[-0.31, 2.325, 0.765]} />
      <Box size={[0.16, 0.12, 0.1]} at={[-0.4, 2.34, 0.63]} edges />
      <Box size={[0.08, 0.03, 0.004]} at={[-0.4, 2.36, 0.682]} mat="accent" castShadow={false} />
      <BoltGrid at={[-0.4, 2.34, 0.681]} dir="+z" w={0.12} h={0.08} s={0.4} />
      <Cyl r={0.01} h={0.3} seg={8} axis="x" at={[-0.55, 2.3, 0.63]} mat="rubber" castShadow={false} />
      <Cyl r={0.01} h={1.03} seg={8} axis="z" at={[-0.7, 2.3, 0.115]} mat="rubber" castShadow={false} />
      <Cyl r={0.01} h={0.35} seg={8} axis="x" at={[-0.525, 2.3, -0.4]} mat="rubber" castShadow={false} />
    </>
  );
}
