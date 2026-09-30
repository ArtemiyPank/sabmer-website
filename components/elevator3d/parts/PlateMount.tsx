"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { useMats } from "../materials";
import { useScene } from "../scene-context";

/**
 * What holds a plate to the machine when the plate cannot lie flat on it.
 *
 * The Work plate stands nine centimetres off the car's flank — forward of
 * where the governor rope crosses the shot — and was drawn as a sheet with no
 * thickness and nothing behind it. Parked square on, that passes; the moment
 * the camera swings away the gap opens up, and the plate reads as hanging in
 * the air. It overhangs the front corner of the car too, so the panel is only
 * behind part of it.
 *
 * So it is built the way such a sign would be: a board with some thickness,
 * two flat bars across its back that carry the overhang, and four standoffs
 * from the bars to the car panel, each on a foot, placed only where the panel
 * actually is. Four screws at the corners of the face say it is fixed there
 * even when the camera is square on and nothing behind it can be seen.
 *
 * Plate-local frame: the lettered face is the plane z = 0 facing +z, so the
 * surface the plate is fixed to lies at z = -depth. One merged geometry and
 * its outline — two draw calls for the lot, where drawing the pieces one by
 * one would cost a dozen (see the note on draw calls in ../prims.tsx).
 */

/** gap between the lettered sheet and the board behind it */
const SHEET_GAP = 0.003;
const BOARD_T = 0.012;
const BAR_H = 0.04;
const BAR_T = 0.012;
/** how far the bars sit in from the top and bottom edges */
const BAR_IN = 0.12;
const STANDOFF_R = 0.011;
const FOOT = 0.05;
const FOOT_T = 0.004;
const SCREW_R = 0.008;
const SCREW_T = 0.004;
/** how far the corner screws sit in from each edge */
const SCREW_IN = 0.028;

function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  return new THREE.BoxGeometry(w, h, d).translate(x, y, z);
}

/** a cylinder whose axis runs along z, from z0 to z1 */
function rod(r: number, x: number, y: number, z0: number, z1: number, seg: number) {
  return new THREE.CylinderGeometry(r, r, Math.abs(z1 - z0), seg)
    .rotateX(Math.PI / 2)
    .translate(x, y, (z0 + z1) / 2);
}

export default function PlateMount({
  w,
  h,
  depth,
  posts,
}: {
  /** plate size, metres */
  w: number;
  h: number;
  /** distance from the lettered face back to the surface it is fixed to */
  depth: number;
  /** where along the plate's width the standoffs go, metres from its centre */
  posts: number[];
}) {
  const m = useMats();
  const { mobile } = useScene();

  const { geometry, edges } = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const boardBack = SHEET_GAP + BOARD_T;
    parts.push(box(w, h, BOARD_T, 0, 0, -(SHEET_GAP + BOARD_T / 2)));

    const barZ = -(boardBack + BAR_T / 2);
    const bars = [h / 2 - BAR_IN, -(h / 2 - BAR_IN)];
    for (const y of bars) parts.push(box(w - 0.06, BAR_H, BAR_T, 0, y, barZ));

    // a standoff that would miss the plate is left out rather than drawn
    // hanging off its edge — the plate is cut to its copy, so its width varies
    const inside = posts.filter((x) => Math.abs(x) <= w / 2 - 0.04);
    for (const y of bars) {
      for (const x of inside) {
        parts.push(rod(STANDOFF_R, x, y, -(boardBack + BAR_T), -(depth - FOOT_T), 10));
        parts.push(box(FOOT, FOOT, FOOT_T, x, y, -(depth - FOOT_T / 2)));
      }
    }

    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const x = sx * (w / 2 - SCREW_IN);
        const y = sy * (h / 2 - SCREW_IN);
        parts.push(rod(SCREW_R, x, y, 0, SCREW_T, 12));
      }
    }

    const geometry = mergeGeometries(parts, false)!;
    parts.forEach((g) => g.dispose());
    // rims and box edges only: a cylinder's own facets are 30-odd degrees apart
    // and would draw every standoff as a bundle of lines
    const edges = new THREE.EdgesGeometry(geometry, 40);
    return { geometry, edges };
  }, [w, h, depth, posts]);

  useEffect(
    () => () => {
      geometry.dispose();
      edges.dispose();
    },
    [geometry, edges]
  );

  return (
    <mesh geometry={geometry} material={m.steelDark}>
      <lineSegments geometry={edges} material={mobile ? m.edgeStrong : m.edge} />
    </mesh>
  );
}
