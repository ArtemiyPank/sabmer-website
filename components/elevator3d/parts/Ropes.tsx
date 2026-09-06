"use client";

import { useRef } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { useMats } from "../materials";
import { useProgressFrame } from "../scene-context";
import { Box, Cyl, Ring } from "../prims";
import { Bolt } from "../Bolts";
import {
  CWT_PULLEY_R,
  CWT_X,
  GOV_R,
  GOV_ROPE_X,
  GOV_TENSION_Y,
  GOV_X,
  GOV_Y,
  GOV_Z,
  HITCH_CAR_X,
  HITCH_CWT_X,
  HITCH_Y,
  PULLEY_R,
  PULLEY_X,
  PULLEY_Y,
  ROPE_DROP_X,
  ROPE_OFFSETS,
  ROPE_R,
  ROPE_Z,
  SHEAVE_C,
  SHEAVE_R,
  TCABLE_CAR,
  TCABLE_WALL,
  carY,
  cwtPulleyY,
  explosion,
} from "../dims";

/**
 * Ropes and cables of the hoistway — the only fully dynamic module:
 *
 *  - Hoist ropes: 4 steel wire ropes in 2:1 underslung roping. Both dead ends
 *    hang from the hitch plates under the bedplate (y = HITCH_Y). Car side:
 *    hitch -> down -> under the two car pulleys on the safety plank -> up ->
 *    over the traction sheave -> down -> under the counterweight pulley -> up
 *    -> hitch. Every run is one mesh holding the 4-rope bundle (unit length,
 *    scaled) and every wrap is a merged 4-rope torus arc; only y positions
 *    and lengths change per frame.
 *  - Governor rope: closed loop over the governor sheave (top) and the
 *    tension sheave (pit). The loop itself is static — the car's rope clamp
 *    (Car module) slides along its car-side run.
 *  - Traveling cable: flat cable from a hanger under the safety plank,
 *    hanging in a U-loop of fixed length and rising to the junction box on
 *    the left wall (Hoistway module). The loop bottom follows the car.
 *
 * Runs after the car / counterweight / machine frame callbacks (priority 0)
 * so it always poses against the pulley positions of the current frame.
 */

// ---- shared geometries (built once per module) ----------------------------------

/** 4-rope bundle along +y spanning y 0..1; ropes fanned out in z */
function bundleRun(): THREE.BufferGeometry {
  const parts = ROPE_OFFSETS.map((dz) => {
    const g = new THREE.CylinderGeometry(ROPE_R, ROPE_R, 1, 6);
    g.translate(0, 0.5, dz);
    return g;
  });
  return mergeGeometries(parts, false)!;
}

/** 4-rope wrap on a pulley of radius R: `arc` radians from +x toward +y (CCW seen from +z) */
function bundleWrap(R: number, arc: number): THREE.BufferGeometry {
  const parts = ROPE_OFFSETS.map((dz) => {
    const g = new THREE.TorusGeometry(R, ROPE_R, 6, 24, arc);
    g.translate(0, 0, dz);
    return g;
  });
  return mergeGeometries(parts, false)!;
}

const RUN = bundleRun();
const WRAP_CAR = bundleWrap(PULLEY_R, Math.PI / 2); // quarter wrap under each car pulley
const WRAP_SHEAVE = bundleWrap(SHEAVE_R, Math.PI); // half wrap over the traction sheave
const WRAP_CWT = bundleWrap(CWT_PULLEY_R, Math.PI); // half wrap under the cwt pulley

// traveling cable: flat ribbon, width along x (face toward the camera), unit length along +y
const TC_W = 0.06;
const TC_T = 0.012;
const RIBBON = new THREE.BoxGeometry(TC_W, 1, TC_T);
RIBBON.translate(0, 0.5, 0);

const GOV_ROPE_R = 0.005;
const MIN_LEN = 0.001;

// ---- traveling cable loop ------------------------------------------------------------
// U-loop in the plane z = TCABLE_CAR[2]: straight down from the car anchor, a
// semicircle of radius TC_R centred between the anchor and the wall, straight up
// to the junction box. Fixed cable length TC_LEN gives the loop height per frame:
//   (yA - yLow) + pi*TC_R + (yWall - yLow) = TC_LEN
// (loop bottom at p = 0: y 3.55; at p = 1 with full explosion: y -1.60, above the pit floor).
const TC_LEN = 14.8;
const TC_R = (TCABLE_CAR[0] - TCABLE_WALL[0]) / 2; // 0.375
const TC_CX = (TCABLE_CAR[0] + TCABLE_WALL[0]) / 2; // -0.825
const TC_N = 12; // chords per semicircle
const TC_CHORD = 2 * TC_R * Math.sin(Math.PI / (2 * TC_N));
const TC_LAP = 0.008; // overrun at the far end of each piece: hides the wedge gaps at the joints
const TC_WALL_CLAMP_Y = 11.7; // support clamp below the junction box gland (box 11.88..12.12)

/** static pose of chord k: start point x, y offset from yLow, rotation so local +y follows the chord */
const TC_ARC = Array.from({ length: TC_N }, (_, k) => {
  const a0 = -(k * Math.PI) / TC_N;
  const a1 = -((k + 1) * Math.PI) / TC_N;
  const dx = TC_R * (Math.cos(a1) - Math.cos(a0));
  const dy = TC_R * (Math.sin(a1) - Math.sin(a0));
  return { x: TC_CX + TC_R * Math.cos(a0), dy: TC_R * Math.sin(a0), rot: Math.atan2(dy, dx) - Math.PI / 2 };
});

/** vertical piece: position = bottom point, scale.y = length */
function pose(m: THREE.Mesh | null, y: number, len: number) {
  if (!m) return;
  m.position.y = y;
  m.scale.y = Math.max(len, MIN_LEN);
}

function setY(o: THREE.Object3D | null, y: number) {
  if (o) o.position.y = y;
}

export default function Ropes() {
  const m = useMats();
  const clamp = useRef<THREE.Group>(null);
  // hoist rope pieces in rope order (the sheave wrap is static)
  const carEnd = useRef<THREE.Mesh>(null); // 1. dead end -> left car pulley
  const wrapL = useRef<THREE.Mesh>(null); // 2. under the left car pulley
  const under = useRef<THREE.Mesh>(null); // 3. across under the car
  const wrapR = useRef<THREE.Mesh>(null); // 4. under the right car pulley
  const carDrop = useRef<THREE.Mesh>(null); // 5. up to the sheave
  const cwtDrop = useRef<THREE.Mesh>(null); // 7. sheave -> cwt pulley
  const wrapCwt = useRef<THREE.Mesh>(null); // 8. under the cwt pulley
  const cwtEnd = useRef<THREE.Mesh>(null); // 9. up to the cwt-side dead end
  // traveling cable pieces; the semicircle chords are the children of one group
  const tcCar = useRef<THREE.Mesh>(null);
  const tcWall = useRef<THREE.Mesh>(null);
  const tcArc = useRef<THREE.Group>(null);

  useProgressFrame((p, explode) => {
    const e = explosion(p, explode);
    const yp = carY(p) + PULLEY_Y + e.plank[1];
    const yc = cwtPulleyY(p);
    const ys = SHEAVE_C[1];

    // 2:1 hoist ropes (tangent points of the vertical runs are at the pulley centre heights)
    pose(carEnd.current, yp, HITCH_Y - yp);
    setY(wrapL.current, yp);
    setY(under.current, yp - PULLEY_R);
    setY(wrapR.current, yp);
    pose(carDrop.current, yp, ys - yp);
    pose(cwtDrop.current, yc, ys - yc);
    setY(wrapCwt.current, yc);
    pose(cwtEnd.current, yc, HITCH_Y - yc);

    // traveling cable: anchor follows the car and the safety plank explosion
    const yA = carY(p) + TCABLE_CAR[1] + e.plank[1];
    let yLow = (yA + TCABLE_WALL[1] + Math.PI * TC_R - TC_LEN) / 2;
    if (yLow > yA) yLow = yA;
    pose(tcCar.current, yLow - TC_LAP, yA - yLow + TC_LAP);
    pose(tcWall.current, yLow - TC_LAP, TCABLE_WALL[1] - yLow + TC_LAP);
    const chords = tcArc.current?.children;
    if (chords) for (let k = 0; k < chords.length; k++) chords[k].position.y = yLow + TC_ARC[k].dy;
    setY(clamp.current, yA);
  }, 0);

  const rope = m.steelDark;
  return (
    <group>
      {/* ---- hoist ropes, plane z = ROPE_Z ---- */}
      <mesh ref={carEnd} geometry={RUN} material={rope} position={[HITCH_CAR_X, 0, ROPE_Z]} castShadow frustumCulled={false} />
      <mesh
        ref={wrapL}
        geometry={WRAP_CAR}
        material={rope}
        position={[-PULLEY_X, 0, ROPE_Z]}
        rotation={[0, 0, Math.PI]}
        castShadow
        frustumCulled={false}
      />
      <mesh
        ref={under}
        geometry={RUN}
        material={rope}
        position={[-PULLEY_X, 0, ROPE_Z]}
        rotation={[0, 0, -Math.PI / 2]}
        scale={[1, 2 * PULLEY_X, 1]}
        castShadow
        frustumCulled={false}
      />
      <mesh
        ref={wrapR}
        geometry={WRAP_CAR}
        material={rope}
        position={[PULLEY_X, 0, ROPE_Z]}
        rotation={[0, 0, 1.5 * Math.PI]}
        castShadow
        frustumCulled={false}
      />
      <mesh ref={carDrop} geometry={RUN} material={rope} position={[ROPE_DROP_X, 0, ROPE_Z]} castShadow frustumCulled={false} />
      <mesh geometry={WRAP_SHEAVE} material={rope} position={SHEAVE_C} castShadow frustumCulled={false} />
      <mesh
        ref={cwtDrop}
        geometry={RUN}
        material={rope}
        position={[SHEAVE_C[0] + SHEAVE_R, 0, ROPE_Z]}
        castShadow
        frustumCulled={false}
      />
      <mesh
        ref={wrapCwt}
        geometry={WRAP_CWT}
        material={rope}
        position={[CWT_X, 0, ROPE_Z]}
        rotation={[0, 0, Math.PI]}
        castShadow
        frustumCulled={false}
      />
      <mesh ref={cwtEnd} geometry={RUN} material={rope} position={[HITCH_CWT_X, 0, ROPE_Z]} castShadow frustumCulled={false} />

      {/* ---- governor rope loop, plane z = GOV_Z ---- */}
      {GOV_ROPE_X.map((x) => (
        <Cyl
          key={x}
          r={GOV_ROPE_R}
          h={GOV_Y - GOV_TENSION_Y}
          seg={6}
          at={[x, (GOV_Y + GOV_TENSION_Y) / 2, GOV_Z]}
          mat="steelDark"
          receiveShadow={false}
        />
      ))}
      <Ring R={GOV_R} r={GOV_ROPE_R} arc={Math.PI} tube={6} seg={24} at={[GOV_X, GOV_Y, GOV_Z]} mat="steelDark" receiveShadow={false} />
      <Ring
        R={GOV_R}
        r={GOV_ROPE_R}
        arc={Math.PI}
        tube={6}
        seg={24}
        at={[GOV_X, GOV_TENSION_Y, GOV_Z]}
        rot={[0, 0, Math.PI]}
        mat="steelDark"
        receiveShadow={false}
      />

      {/* ---- traveling cable, plane z = TCABLE_CAR[2] ---- */}
      <mesh
        ref={tcCar}
        geometry={RIBBON}
        material={m.rubber}
        position={[TCABLE_CAR[0], 0, TCABLE_CAR[2]]}
        castShadow
        frustumCulled={false}
      />
      <group ref={tcArc}>
        {TC_ARC.map((s, k) => (
          <mesh
            key={k}
            geometry={RIBBON}
            material={m.rubber}
            position={[s.x, 0, TCABLE_CAR[2]]}
            rotation={[0, 0, s.rot]}
            scale={[1, TC_CHORD + TC_LAP, 1]}
            castShadow
            frustumCulled={false}
          />
        ))}
      </group>
      <mesh
        ref={tcWall}
        geometry={RIBBON}
        material={m.rubber}
        position={[TCABLE_WALL[0], 0, TCABLE_WALL[2]]}
        castShadow
        frustumCulled={false}
      />

      {/* cable hanger on the car: leg plate bolted to the safety plank's front web
          (car z 0.135), arm out to the anchor, strain-relief clamp around the cable */}
      <group ref={clamp} position={[TCABLE_CAR[0], 0, TCABLE_CAR[2]]}>
        <Box size={[0.04, 0.12, 0.02]} at={[-0.01, 0.08, -0.305]} />
        <Bolt at={[-0.01, 0.12, -0.295]} dir="+z" s={0.5} />
        <Bolt at={[-0.01, 0.04, -0.295]} dir="+z" s={0.5} />
        <Box size={[0.04, 0.03, 0.315]} at={[-0.01, 0.035, -0.1375]} />
        <Box size={[0.08, 0.04, 0.04]} />
        <Bolt at={[-0.028, 0, 0.02]} dir="+z" s={0.45} />
        <Bolt at={[0.028, 0, 0.02]} dir="+z" s={0.45} />
      </group>

      {/* wall support clamp under the junction box gland, anchored into the wall plane */}
      <group position={[TCABLE_WALL[0], TC_WALL_CLAMP_Y, TCABLE_WALL[2]]}>
        <Box size={[0.1, 0.04, 0.09]} />
        <Bolt at={[0.05, 0, -0.03]} dir="+x" s={0.6} />
        <Bolt at={[0.05, 0, 0.03]} dir="+x" s={0.6} />
      </group>
    </group>
  );
}
