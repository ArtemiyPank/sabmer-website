"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { useMats, type Materials } from "./materials";
import { useScene } from "./scene-context";
import type { V3 } from "./dims";

/**
 * Small primitive components used by every part module. Unit geometries are
 * shared module-wide and scaled per mesh, so a scene with thousands of
 * boxes / cylinders allocates only a handful of buffers. Each primitive can
 * draw its outline (`edges`) for the technical-drawing look.
 */

export type MatName = Exclude<keyof Materials, "edge" | "edgeStrong" | "palette">;

/**
 * Outlines are one extra (transparent) draw call per mesh — on phones they
 * cost about a quarter of the frame and are barely a pixel wide, so they are
 * dropped there.
 */
function useEdges(edges: boolean | undefined) {
  const { mobile } = useScene();
  return !!edges && !mobile;
}

type Common = {
  at?: V3;
  /** Euler rotation (rad) */
  rot?: V3;
  mat?: MatName;
  edges?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_BOX_EDGES = new THREE.EdgesGeometry(UNIT_BOX);

const cylCache = new Map<string, { geom: THREE.CylinderGeometry; edges: THREE.EdgesGeometry }>();
/** unit cylinder (r = 1, h = 1, axis = y) with `seg` radial segments */
export function unitCyl(seg: number, open = false) {
  const key = `${seg}:${open ? 1 : 0}`;
  let c = cylCache.get(key);
  if (!c) {
    const geom = new THREE.CylinderGeometry(1, 1, 1, seg, 1, open);
    // 15° threshold keeps only the cap rims (and the hex/oct edges) as lines
    c = { geom, edges: new THREE.EdgesGeometry(geom, seg <= 8 ? 15 : 60) };
    cylCache.set(key, c);
  }
  return c;
}

/** axis-aligned box: size = [w, h, d] */
export function Box({
  size,
  at = [0, 0, 0],
  rot,
  mat = "steel",
  edges = false,
  castShadow = true,
  receiveShadow = true,
}: Common & { size: V3 }) {
  const m = useMats();
  const showEdges = useEdges(edges);
  return (
    <mesh
      geometry={UNIT_BOX}
      material={m[mat]}
      position={at}
      rotation={rot}
      scale={size}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      {showEdges && <lineSegments geometry={UNIT_BOX_EDGES} material={m.edge} />}
    </mesh>
  );
}

/**
 * Cylinder along the local axis. `axis` rotates the unit y-cylinder so that
 * its length runs along x, y or z.
 */
export function Cyl({
  r,
  h,
  seg = 24,
  axis = "y",
  at = [0, 0, 0],
  rot,
  mat = "steel",
  edges = false,
  castShadow = true,
  receiveShadow = true,
}: Common & { r: number; h: number; seg?: number; axis?: "x" | "y" | "z" }) {
  const m = useMats();
  const showEdges = useEdges(edges);
  const { geom, edges: eg } = unitCyl(seg);
  const axisRot: V3 = axis === "x" ? [0, 0, -Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  const inner = (
    <mesh
      geometry={geom}
      material={m[mat]}
      rotation={axisRot}
      scale={[r, h, r]}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      {showEdges && <lineSegments geometry={eg} material={m.edge} />}
    </mesh>
  );
  return rot ? (
    <group position={at} rotation={rot}>
      {inner}
    </group>
  ) : (
    <group position={at}>{inner}</group>
  );
}

/** hexagonal prism (nut / bolt head shape) — a 6-segment cylinder */
export function Hex(props: Omit<Parameters<typeof Cyl>[0], "seg">) {
  return <Cyl {...props} seg={6} />;
}

/** torus (pulley rims, rope wraps, rings). Axis = normal of the ring plane. */
export function Ring({
  R,
  r,
  arc = Math.PI * 2,
  seg = 32,
  tube = 10,
  axis = "z",
  at = [0, 0, 0],
  rot,
  mat = "steel",
  castShadow = true,
  receiveShadow = true,
}: Common & { R: number; r: number; arc?: number; seg?: number; tube?: number; axis?: "x" | "y" | "z" }) {
  const m = useMats();
  const geom = useMemo(() => new THREE.TorusGeometry(R, r, tube, seg, arc), [R, r, tube, seg, arc]);
  const axisRot: V3 = axis === "x" ? [0, Math.PI / 2, 0] : axis === "y" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <group position={at} rotation={rot}>
      <mesh geometry={geom} material={m[mat]} rotation={axisRot} castShadow={castShadow} receiveShadow={receiveShadow} />
    </group>
  );
}

/**
 * C-channel (structural steel) with its length along `axis`. The web sits on
 * the `open` side's opposite face; flanges point toward `open`.
 *   h = section height, b = flange width, t = plate thickness
 */
export function Channel({
  length,
  h,
  b,
  t = 0.01,
  axis = "x",
  open = "+z",
  at = [0, 0, 0],
  rot,
  mat = "steel",
  edges = true,
}: Common & {
  length: number;
  h: number;
  b: number;
  t?: number;
  axis?: "x" | "y" | "z";
  open?: "+x" | "-x" | "+y" | "-y" | "+z" | "-z";
}) {
  // build in local space: length along x, height along y, flanges toward +z
  const sign = open.startsWith("-") ? -1 : 1;
  const openAxis = open[1] as "x" | "y" | "z";
  // local frame: length -> x, height -> y, open -> z. Compose a rotation that
  // maps that frame onto the requested world axes.
  const rotation = useMemo(() => {
    const ex = new THREE.Vector3(axis === "x" ? 1 : 0, axis === "y" ? 1 : 0, axis === "z" ? 1 : 0);
    const ez = new THREE.Vector3(openAxis === "x" ? sign : 0, openAxis === "y" ? sign : 0, openAxis === "z" ? sign : 0);
    const ey = new THREE.Vector3().crossVectors(ez, ex);
    const mtx = new THREE.Matrix4().makeBasis(ex, ey, ez);
    return new THREE.Euler().setFromRotationMatrix(mtx);
  }, [axis, openAxis, sign]);
  return (
    <group position={at} rotation={rot}>
      <group rotation={rotation}>
        <Box size={[length, h, t]} at={[0, 0, -b / 2 + t / 2]} mat={mat} edges={edges} />
        <Box size={[length, t, b]} at={[0, h / 2 - t / 2, 0]} mat={mat} edges={edges} />
        <Box size={[length, t, b]} at={[0, -h / 2 + t / 2, 0]} mat={mat} edges={edges} />
      </group>
    </group>
  );
}

/** I-beam with its length along `axis` (web vertical in local y) */
export function IBeam({
  length,
  h,
  b,
  t = 0.012,
  axis = "x",
  at = [0, 0, 0],
  rot,
  mat = "steel",
  edges = true,
}: Common & { length: number; h: number; b: number; t?: number; axis?: "x" | "y" | "z" }) {
  const axisRot: V3 = axis === "y" ? [0, 0, Math.PI / 2] : axis === "z" ? [0, -Math.PI / 2, 0] : [0, 0, 0];
  return (
    <group position={at} rotation={rot}>
      <group rotation={axisRot}>
        <Box size={[length, h - 2 * t, t]} mat={mat} edges={edges} />
        <Box size={[length, t, b]} at={[0, h / 2 - t / 2, 0]} mat={mat} edges={edges} />
        <Box size={[length, t, b]} at={[0, -h / 2 + t / 2, 0]} mat={mat} edges={edges} />
      </group>
    </group>
  );
}

/**
 * T-section guide rail standing along y. `blade` is the direction the blade
 * points (toward the guided car / counterweight); the foot is a plate
 * perpendicular to it at the opposite side.
 *   bladeH = distance foot -> tip, footW = foot width, t = thickness
 */
export function TRail({
  height,
  bladeH,
  footW,
  t,
  blade,
  at,
  mat = "steelDark",
  edges = true,
}: {
  height: number;
  bladeH: number;
  footW: number;
  t: number;
  blade: "+x" | "-x" | "+z" | "-z";
  /** position of the blade tip's bottom end */
  at: V3;
  mat?: MatName;
  edges?: boolean;
}) {
  const sign = blade.startsWith("-") ? -1 : 1;
  const alongX = blade.endsWith("x");
  // blade tip at local origin; the section extends opposite to `blade`
  const bladeCenter: V3 = alongX ? [-sign * bladeH / 2, height / 2, 0] : [0, height / 2, -sign * bladeH / 2];
  const footCenter: V3 = alongX ? [-sign * (bladeH - t / 2), height / 2, 0] : [0, height / 2, -sign * (bladeH - t / 2)];
  return (
    <group position={at}>
      <Box size={alongX ? [bladeH, height, t] : [t, height, bladeH]} at={bladeCenter} mat={mat} edges={edges} />
      <Box size={alongX ? [t, height, footW] : [footW, height, t]} at={footCenter} mat={mat} edges={edges} />
    </group>
  );
}

/** coil spring: helix tube along local y, from y = 0 to y = h */
export function Spring({
  R,
  r,
  h,
  turns = 6,
  at = [0, 0, 0],
  rot,
  mat = "steelDark",
}: Common & { R: number; r: number; h: number; turns?: number }) {
  const m = useMats();
  const geom = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const n = Math.ceil(turns * 16);
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * R, (i / n) * h, Math.sin(a) * R));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, r, 6, false);
  }, [R, r, h, turns]);
  return (
    <group position={at} rotation={rot}>
      <mesh geometry={geom} material={m[mat]} castShadow />
    </group>
  );
}

/** rectangular plate with a border outline; shorthand for a thin Box */
export function Plate(props: Common & { w: number; h: number; t?: number; normal?: "x" | "y" | "z" }) {
  const { w, h, t = 0.01, normal = "z", ...rest } = props;
  const size: V3 = normal === "x" ? [t, h, w] : normal === "y" ? [w, t, h] : [w, h, t];
  return <Box size={size} edges {...rest} />;
}
