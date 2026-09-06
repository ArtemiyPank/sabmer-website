"use client";

import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { createInstances } from "@react-three/drei";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { useMats } from "./materials";
import type { V3 } from "./dims";

/**
 * Bolt-level detail without bolt-level draw calls: every hex bolt and every
 * nut in the scene is one instance of a shared InstancedMesh. `<Bolt>` /
 * `<Nut>` can be placed anywhere below `<Fasteners>` (inside moving or
 * exploding groups — drei tracks their world matrices every frame).
 *
 * Local frame of a fastener: +y is the bolt axis pointing OUT of the part
 * (head visible), the shank goes into the part along -y. `dir` picks the
 * outward direction in the parent's frame. Sizes are exaggerated ~2x so
 * fasteners stay visible at hoistway scale (scale 1 ≈ M20 head).
 */

const [BoltInstances, BoltInstance] = createInstances();
const [NutInstances, NutInstance] = createInstances();

export const BOLT_HEAD_R = 0.024; // hex head circumradius
export const BOLT_HEAD_H = 0.016;
export const WASHER_R = 0.032;
export const WASHER_T = 0.004;
export const SHANK_R = 0.011;
export const SHANK_L = 0.045;

function boltGeometry() {
  const head = new THREE.CylinderGeometry(BOLT_HEAD_R, BOLT_HEAD_R, BOLT_HEAD_H, 6);
  head.translate(0, WASHER_T + BOLT_HEAD_H / 2, 0);
  const washer = new THREE.CylinderGeometry(WASHER_R, WASHER_R, WASHER_T, 14);
  washer.translate(0, WASHER_T / 2, 0);
  const shank = new THREE.CylinderGeometry(SHANK_R, SHANK_R, SHANK_L, 8);
  shank.translate(0, -SHANK_L / 2, 0);
  return mergeGeometries([head, washer, shank], false)!;
}

function nutGeometry() {
  const nut = new THREE.CylinderGeometry(BOLT_HEAD_R, BOLT_HEAD_R, BOLT_HEAD_H * 1.1, 6);
  nut.translate(0, WASHER_T + (BOLT_HEAD_H * 1.1) / 2, 0);
  const washer = new THREE.CylinderGeometry(WASHER_R, WASHER_R, WASHER_T, 14);
  washer.translate(0, WASHER_T / 2, 0);
  // thread end protruding through the nut
  const stud = new THREE.CylinderGeometry(SHANK_R * 0.9, SHANK_R * 0.9, BOLT_HEAD_H * 1.1 + 0.012, 8);
  stud.translate(0, WASHER_T + (BOLT_HEAD_H * 1.1 + 0.012) / 2 - 0.004, 0);
  return mergeGeometries([nut, washer, stud], false)!;
}

/** wraps the scene: provides the shared bolt / nut instanced meshes */
export function Fasteners({ children, limit = 4000 }: { children: ReactNode; limit?: number }) {
  const m = useMats();
  const boltGeom = useMemo(() => boltGeometry(), []);
  const nutGeom = useMemo(() => nutGeometry(), []);
  return (
    <BoltInstances limit={limit} geometry={boltGeom} material={m.steelDark} castShadow frustumCulled={false}>
      <NutInstances limit={Math.ceil(limit / 2)} geometry={nutGeom} material={m.steelDark} castShadow frustumCulled={false}>
        {children}
      </NutInstances>
    </BoltInstances>
  );
}

export type Dir = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";

const DIR_ROT: Record<Dir, V3> = {
  "+y": [0, 0, 0],
  "-y": [Math.PI, 0, 0],
  "+x": [0, 0, -Math.PI / 2],
  "-x": [0, 0, Math.PI / 2],
  "+z": [Math.PI / 2, 0, 0],
  "-z": [-Math.PI / 2, 0, 0],
};

type FastenerProps = {
  /** position of the part surface the fastener sits on */
  at: V3;
  /** outward direction of the bolt axis (head side) */
  dir?: Dir;
  /** 1 ≈ M20, 0.6 ≈ M12, 1.5 ≈ M30 */
  s?: number;
};

export function Bolt({ at, dir = "+y", s = 1 }: FastenerProps) {
  return <BoltInstance position={at} rotation={DIR_ROT[dir]} scale={s} />;
}

export function Nut({ at, dir = "+y", s = 1 }: FastenerProps) {
  return <NutInstance position={at} rotation={DIR_ROT[dir]} scale={s} />;
}

/**
 * Bolt pattern on a rectangle: `n` = [cols, rows] spread over `w` x `h`
 * around `at`, on the plane facing `dir`. `u`/`v` are the in-plane axes.
 */
export function BoltGrid({
  at,
  dir,
  w,
  h,
  n = [2, 2],
  s = 1,
  nuts = false,
}: FastenerProps & { dir: Dir; w: number; h: number; n?: [number, number]; nuts?: boolean }) {
  const axis = dir[1];
  // in-plane axes for each facing direction
  const [u, v]: [V3, V3] =
    axis === "x" ? [[0, 0, 1], [0, 1, 0]] : axis === "y" ? [[1, 0, 0], [0, 0, 1]] : [[1, 0, 0], [0, 1, 0]];
  const items: V3[] = [];
  const [cols, rows] = n;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const a = cols === 1 ? 0 : (i / (cols - 1) - 0.5) * w;
      const b = rows === 1 ? 0 : (j / (rows - 1) - 0.5) * h;
      items.push([at[0] + u[0] * a + v[0] * b, at[1] + u[1] * a + v[1] * b, at[2] + u[2] * a + v[2] * b]);
    }
  }
  const F = nuts ? Nut : Bolt;
  return (
    <>
      {items.map((p, i) => (
        <F key={i} at={p} dir={dir} s={s} />
      ))}
    </>
  );
}

/** bolts on a circle (flange / hub pattern) in the plane facing `dir` */
export function BoltRing({
  at,
  dir,
  R,
  count,
  s = 1,
  nuts = false,
  phase = 0,
}: FastenerProps & { dir: Dir; R: number; count: number; nuts?: boolean; phase?: number }) {
  const axis = dir[1];
  const [u, v]: [V3, V3] =
    axis === "x" ? [[0, 0, 1], [0, 1, 0]] : axis === "y" ? [[1, 0, 0], [0, 0, 1]] : [[1, 0, 0], [0, 1, 0]];
  const F = nuts ? Nut : Bolt;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = phase + (i / count) * Math.PI * 2;
        const ca = Math.cos(a) * R;
        const sa = Math.sin(a) * R;
        const p: V3 = [at[0] + u[0] * ca + v[0] * sa, at[1] + u[1] * ca + v[1] * sa, at[2] + u[2] * ca + v[2] * sa];
        return <F key={i} at={p} dir={dir} s={s} />;
      })}
    </>
  );
}
