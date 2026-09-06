"use client";

import { Fragment, useRef } from "react";
import * as THREE from "three";
import { Box, Cyl } from "../prims";
import { Bolt } from "../Bolts";
import { useProgressFrame, useScene } from "../scene-context";
import {
  CABINET,
  LANDING_DEPTH,
  LDOOR_H,
  LDOOR_JAMB_X,
  LDOOR_OPEN_W,
  LDOOR_PANEL_Z,
  DOOR_OPEN,
  LDOOR_SILL_Z,
  LEVELS,
  PIT_FLOOR,
  SHAFT_BACK,
  SHAFT_FRONT,
  SHAFT_TOP,
  SHAFT_X,
  SLAB_T,
  TCABLE_WALL,
  WALL_T,
  FLOOR_H,
} from "../dims";

/**
 * The building around the elevator, drawn as a cutaway section: back wall,
 * pit / landing / overhead slabs, the four landing door assemblies with their
 * sills, hall fixtures and hanger tracks, the controller cabinet on the top
 * landing, the traveling-cable junction box and the shaft lighting. Fully
 * static — the front and right walls are omitted so the camera can look in.
 */

const OUT_X = SHAFT_X + WALL_T; // outer face of the side walls
const SLAB_Z0 = SHAFT_BACK - WALL_T;
const SLAB_Z1 = SHAFT_FRONT + LANDING_DEPTH;
const WALL_Y0 = PIT_FLOOR - 0.4;
const WALL_Y1 = SHAFT_TOP + SLAB_T + 0.2;
const JAMB_Z = LDOOR_PANEL_Z - 0.02;
const HEADER_Y = LDOOR_H + 0.075; // header centre above the opening
const TRACK_Z = LDOOR_PANEL_Z - 0.17; // hanger track, on the shaft side of the header
const CABINET_H = 2.0; // controller cabinet height

/**
 * Landing door assembly at level `L` (index `i` picks the hall button set).
 * The top landing's panels can slide: the camera-tour layout starts with the
 * car parked there, doors open, and closes them before it sets off.
 */
function Landing({ L, i }: { L: number; i: number }) {
  const top = i === LEVELS.length - 1;
  const { doors } = useScene();
  const panels = useRef<THREE.Group>(null);
  useProgressFrame((p) => {
    const g = panels.current;
    if (!g || !doors) return;
    const open = top ? doors(p) * DOOR_OPEN : 0;
    for (let k = 0; k < g.children.length; k++) {
      g.children[k].position.x = k === 0 ? -open : open;
    }
  });
  const transomY0 = L + LDOOR_H + 0.15;
  const transomY1 = L + (top ? 2.9 : FLOOR_H - SLAB_T);
  return (
    <group position={[0, L, 0]}>
      {/* frame: jambs, header, transom panel up to the next slab */}
      {[-1, 1].map((sx) => (
        <Fragment key={sx}>
          <Box size={[0.1, LDOOR_H, 0.24]} at={[sx * LDOOR_JAMB_X, LDOOR_H / 2, JAMB_Z]} edges />
          <Bolt at={[sx * LDOOR_JAMB_X, 0.4, JAMB_Z + 0.12]} dir="+z" s={0.8} />
          <Bolt at={[sx * LDOOR_JAMB_X, 1.7, JAMB_Z + 0.12]} dir="+z" s={0.8} />
        </Fragment>
      ))}
      <Box size={[LDOOR_OPEN_W + 0.2, 0.15, 0.24]} at={[0, HEADER_Y, JAMB_Z]} edges />
      {[-0.4, -0.13, 0.13, 0.4].map((dx) => (
        <Bolt key={dx} at={[dx, HEADER_Y, JAMB_Z + 0.12]} dir="+z" s={0.8} />
      ))}
      <Box
        size={[1.2, transomY1 - transomY0, 0.03]}
        at={[0, (transomY0 + transomY1) / 2 - L, SHAFT_FRONT]}
        mat="glass"
        castShadow={false}
      />

      {/* translucent panels with their meeting-edge strips */}
      <group ref={panels}>
        {[-1, 1].map((sx) => (
          <group key={sx}>
            <Box size={[0.45, LDOOR_H, 0.03]} at={[sx * 0.225, LDOOR_H / 2, LDOOR_PANEL_Z]} mat="glass" castShadow={false} />
            <Box size={[0.012, LDOOR_H, 0.035]} at={[sx * 0.004, LDOOR_H / 2, LDOOR_PANEL_Z]} mat="stainless" />
          </group>
        ))}
      </group>

      {/* hanger track behind the header: track, hanger plates and rollers per panel */}
      <Box size={[1.3, 0.05, 0.04]} at={[0, LDOOR_H + 0.05, TRACK_Z]} mat="steelDark" />
      {[-1, 1].map((sx) =>
        [0.12, 0.34].map((d) => (
          <Fragment key={`${sx}${d}`}>
            <Box size={[0.08, 0.13, 0.01]} at={[sx * d, LDOOR_H - 0.02, LDOOR_PANEL_Z - 0.02]} />
            <Box size={[0.08, 0.01, 0.15]} at={[sx * d, LDOOR_H + 0.04, TRACK_Z + 0.085]} />
            <Cyl r={0.025} h={0.02} seg={12} axis="z" at={[sx * d, LDOOR_H + 0.075, TRACK_Z]} mat="steelDark" />
          </Fragment>
        ))
      )}
      <Box size={[0.1, 0.08, 0.06]} at={[0.32, LDOOR_H + 0.11, TRACK_Z - 0.05]} mat="steelDark" edges />

      {/* landing sill on the slab, with its support angle and bolts */}
      <Box
        size={[1.2, 0.03, LDOOR_SILL_Z[1] - LDOOR_SILL_Z[0]]}
        at={[0, 0.015, (LDOOR_SILL_Z[0] + LDOOR_SILL_Z[1]) / 2]}
        mat="stainless"
        edges
      />
      <Box size={[1.2, 0.06, 0.12]} at={[0, -0.03, LDOOR_SILL_Z[0] + 0.06]} mat="steelDark" />
      {[-0.45, 0, 0.45].map((dx) => (
        <Bolt key={dx} at={[dx, -0.03, LDOOR_SILL_Z[0]]} dir="-z" s={0.7} />
      ))}

      {/* hall call station and lantern on the landing side */}
      <Box size={[0.5, LDOOR_H + 0.15, 0.03]} at={[0.85, (LDOOR_H + 0.15) / 2, SHAFT_FRONT]} mat="glass" castShadow={false} />
      <Box size={[0.1, 0.16, 0.01]} at={[0.75, 1.1, SHAFT_FRONT + 0.015]} mat="stainless" />
      {(i === 0 ? [1.14] : top ? [1.06] : [1.14, 1.06]).map((y) => (
        <Cyl key={y} r={0.018} h={0.008} seg={12} axis="z" at={[0.75, y, SHAFT_FRONT + 0.024]} mat="accent" />
      ))}
      <Bolt at={[0.75, 1.175, SHAFT_FRONT + 0.02]} dir="+z" s={0.5} />
      <Bolt at={[0.75, 1.025, SHAFT_FRONT + 0.02]} dir="+z" s={0.5} />
      <Box size={[0.3, 0.08, 0.04]} at={[0, LDOOR_H + 0.25, SHAFT_FRONT + 0.02]} mat="steelDark" edges />
      <Box size={[0.22, 0.03, 0.005]} at={[0, LDOOR_H + 0.25, SHAFT_FRONT + 0.043]} mat="light" castShadow={false} />

      {/* level datum mark on the landing slab edge */}
      <Box size={[0.6, 0.006, 0.02]} at={[-1.1, 0.003, SHAFT_FRONT + 0.3]} mat="steelDark" castShadow={false} />
    </group>
  );
}

export default function Hoistway() {
  return (
    <group>
      {/* ---- back wall with construction joints ---- */}
      <Box
        size={[2 * OUT_X, WALL_Y1 - WALL_Y0, WALL_T]}
        at={[0, (WALL_Y0 + WALL_Y1) / 2, SHAFT_BACK - WALL_T / 2]}
        mat="concrete"
        edges
      />
      {[...LEVELS, SHAFT_TOP].map((y) => (
        <Box key={y} size={[2 * SHAFT_X, 0.01, 0.006]} at={[0, y, SHAFT_BACK + 0.003]} mat="steelDark" castShadow={false} />
      ))}
      {[-SHAFT_X, SHAFT_X].map((x) => (
        <Box
          key={x}
          size={[0.01, SHAFT_TOP - PIT_FLOOR, 0.006]}
          at={[x, (SHAFT_TOP + PIT_FLOOR) / 2, SHAFT_BACK + 0.003]}
          mat="steelDark"
          castShadow={false}
        />
      ))}

      {/* ---- pit slab with the sump recess, overhead slab ---- */}
      <Box
        size={[2 * OUT_X, 0.3, SLAB_Z1 - SLAB_Z0]}
        at={[0, PIT_FLOOR - 0.15, (SLAB_Z0 + SLAB_Z1) / 2]}
        mat="concrete"
        edges
        receiveShadow
      />
      <Box size={[0.4, 0.05, 0.4]} at={[-0.3, PIT_FLOOR - 0.024, 0.85]} mat="steelDark" />
      <Box
        size={[2 * OUT_X, SLAB_T, SLAB_Z1 - SLAB_Z0]}
        at={[0, SHAFT_TOP + SLAB_T / 2, (SLAB_Z0 + SLAB_Z1) / 2]}
        mat="concrete"
        edges
      />

      {/* ---- landing slabs (the top one is deeper: it carries the cabinet) ---- */}
      {LEVELS.map((L, i) => {
        const depth = LANDING_DEPTH + (i === LEVELS.length - 1 ? 0.4 : 0);
        return (
          <Fragment key={L}>
            <Box
              size={[2 * OUT_X, SLAB_T, depth]}
              at={[0, L - SLAB_T / 2, SHAFT_FRONT + depth / 2]}
              mat="concrete"
              edges
              receiveShadow
            />
            <Box size={[2 * OUT_X, 0.02, 0.03]} at={[0, L - SLAB_T - 0.01, SHAFT_FRONT + depth]} mat="steelDark" castShadow={false} />
          </Fragment>
        );
      })}

      {LEVELS.map((L, i) => (
        <Landing key={L} L={L} i={i} />
      ))}

      {/* ---- controller cabinet on the top landing ---- */}
      <group position={CABINET}>
        <Box size={[0.5, CABINET_H, 0.3]} at={[0, CABINET_H / 2 + 0.04, 0]} edges />
        <Box size={[0.46, CABINET_H - 0.1, 0.01]} at={[0, CABINET_H / 2 + 0.04, 0.155]} mat="steelDark" />
        {[-0.7, 0, 0.7].map((dy) => (
          <Box key={dy} size={[0.03, 0.08, 0.04]} at={[-0.23, CABINET_H / 2 + 0.04 + dy, 0.16]} mat="steelDark" />
        ))}
        <Cyl r={0.01} h={0.16} at={[0.2, CABINET_H / 2 + 0.04, 0.175]} mat="stainless" />
        <Cyl r={0.015} h={0.02} seg={12} axis="z" at={[0.2, CABINET_H / 2 - 0.16, 0.17]} mat="stainless" />
        {[0, 1, 2, 3, 4].map((k) => (
          <Box key={k} size={[0.3, 0.012, 0.006]} at={[0, 0.35 + k * 0.04, 0.166]} mat="steelDark" castShadow={false} />
        ))}
        <Box size={[0.16, 0.05, 0.005]} at={[0, CABINET_H - 0.15, 0.163]} mat="accent" castShadow={false} />
        <Box size={[0.54, 0.04, 0.34]} at={[0, 0.02, 0]} mat="steelDark" edges />
        {[-0.22, 0.22].map((dx) =>
          [-0.14, 0.14].map((dz) => <Bolt key={`${dx}${dz}`} at={[dx, 0.04, dz]} s={0.9} />)
        )}
        {/* conduit up and into the shaft through the front wall plane */}
        <Cyl r={0.03} h={0.9} seg={12} at={[0.15, CABINET_H + 0.49, 0]} mat="steelDark" />
        <Cyl
          r={0.03}
          h={CABINET[2] - SHAFT_FRONT + 0.1}
          seg={12}
          axis="z"
          at={[0.15, CABINET_H + 0.9, (SHAFT_FRONT - 0.1 - CABINET[2]) / 2]}
          mat="steelDark"
        />
        <Box size={[0.08, 0.03, 0.05]} at={[0.15, CABINET_H + 0.15, 0]} />
        <Bolt at={[0.15, CABINET_H + 0.15, 0.026]} dir="+z" s={0.5} />
        <Box size={[0.08, 0.03, 0.05]} at={[0.15, CABINET_H + 0.75, 0]} />
        <Bolt at={[0.15, CABINET_H + 0.75, 0.026]} dir="+z" s={0.5} />
      </group>

      {/* ---- traveling-cable junction box on the left wall plane ---- */}
      <group position={[-SHAFT_X, TCABLE_WALL[1], TCABLE_WALL[2]]}>
        <Box size={[0.16, 0.24, 0.24]} at={[0.08, 0, 0]} mat="steelDark" edges />
        <Box size={[0.01, 0.2, 0.2]} at={[0.165, 0, 0]} />
        {[-0.07, 0.07].map((dy) =>
          [-0.07, 0.07].map((dz) => <Bolt key={`${dy}${dz}`} at={[0.17, dy, dz]} dir="+x" s={0.5} />)
        )}
        <Box size={[0.06, SHAFT_TOP - TCABLE_WALL[1] - 0.12, 0.06]} at={[0.05, (SHAFT_TOP - TCABLE_WALL[1] + 0.12) / 2, 0]} mat="steelDark" />
        <Cyl r={0.03} h={0.05} seg={12} at={[0.05, -0.145, 0]} mat="steelDark" />
      </group>

      {/* ---- pit fittings and shaft lights on the back wall ---- */}
      <Box size={[0.1, 0.12, 0.06]} at={[-0.9, PIT_FLOOR + 1.2, SHAFT_BACK + 0.03]} edges />
      <Cyl r={0.03} h={0.03} seg={12} axis="z" at={[-0.9, PIT_FLOOR + 1.2, SHAFT_BACK + 0.075]} mat="accent" />
      <Box size={[0.1, 0.14, 0.05]} at={[-0.9, PIT_FLOOR + 0.85, SHAFT_BACK + 0.025]} mat="steelDark" />
      <Bolt at={[-0.9, PIT_FLOOR + 0.91, SHAFT_BACK + 0.05]} dir="+z" s={0.5} />
      <Bolt at={[-0.9, PIT_FLOOR + 0.79, SHAFT_BACK + 0.05]} dir="+z" s={0.5} />
      {[PIT_FLOOR + 1.6, 4.5, 8.0, 11.5].map((y) => (
        <Fragment key={y}>
          <Box size={[0.05, 0.5, 0.05]} at={[0.2, y, SHAFT_BACK + 0.025]} mat="steelDark" />
          <Box size={[0.03, 0.44, 0.02]} at={[0.2, y, SHAFT_BACK + 0.055]} mat="light" castShadow={false} />
        </Fragment>
      ))}
    </group>
  );
}
