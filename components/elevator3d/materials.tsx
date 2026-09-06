"use client";

import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

/**
 * Theme-aware materials. Every material is a mix of the blueprint CSS
 * variables (--bp-paper / --bp-fill / --bp-fill-2 / --bp-line / --bp-accent),
 * so the 3D scene follows the light / dark theme exactly like the page.
 * Materials are shared (one instance per role) to keep draw-call state
 * changes and shader programs low.
 */

export type Palette = {
  paper: THREE.Color;
  fill: THREE.Color;
  fill2: THREE.Color;
  line: THREE.Color;
  accent: THREE.Color;
};

export type Materials = {
  /** painted steel: sling, brackets, bedplate, buffers, frames */
  steel: THREE.MeshStandardMaterial;
  /** darker machined steel: rails, bolts, sheaves, pulleys, ropes */
  steelDark: THREE.MeshStandardMaterial;
  /** brushed stainless: door panels, cab walls, COP face */
  stainless: THREE.MeshStandardMaterial;
  /** cab interior surfaces, ceiling, landing jambs */
  cab: THREE.MeshStandardMaterial;
  /** concrete: walls, slabs, pit */
  concrete: THREE.MeshStandardMaterial;
  /** cast iron filler weights */
  iron: THREE.MeshStandardMaterial;
  /** rubber / plastic: rollers, isolation pads, cable jackets */
  rubber: THREE.MeshStandardMaterial;
  /** accent: indicator lights, buttons, callouts */
  accent: THREE.MeshStandardMaterial;
  /** translucent panels: landing doors, counterweight screen */
  glass: THREE.MeshStandardMaterial;
  /** emissive light panels in the cab ceiling */
  light: THREE.MeshStandardMaterial;
  /** 1px outline lines (drawing look) */
  edge: THREE.LineBasicMaterial;
  /** stronger outline for silhouettes */
  edgeStrong: THREE.LineBasicMaterial;
  palette: Palette;
};

const FALLBACK: Record<keyof Palette, string> = {
  paper: "#eef3fb",
  fill: "#c9daf6",
  fill2: "#adc6ee",
  line: "#1d3f9e",
  accent: "#0e7490",
};

function cssColor(name: string, fallback: string) {
  if (typeof window === "undefined") return new THREE.Color(fallback);
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(v || fallback);
}

export function readPalette(): Palette {
  return {
    paper: cssColor("--bp-paper", FALLBACK.paper),
    fill: cssColor("--bp-fill", FALLBACK.fill),
    fill2: cssColor("--bp-fill-2", FALLBACK.fill2),
    line: cssColor("--bp-line", FALLBACK.line),
    accent: cssColor("--bp-accent", FALLBACK.accent),
  };
}

const mix = (a: THREE.Color, b: THREE.Color, t: number) => a.clone().lerp(b, t);

/** assign palette-derived colors to an existing material set */
function applyPalette(m: Materials, pal: Palette) {
  m.palette = pal;
  m.steel.color.copy(mix(pal.fill2, pal.line, 0.12));
  m.steelDark.color.copy(mix(pal.fill2, pal.line, 0.42));
  m.stainless.color.copy(mix(pal.paper, pal.fill2, 0.35));
  m.cab.color.copy(mix(pal.paper, pal.fill, 0.25));
  m.concrete.color.copy(mix(pal.paper, pal.fill, 0.55));
  m.iron.color.copy(mix(pal.fill2, pal.line, 0.55));
  m.rubber.color.copy(mix(pal.line, pal.fill2, 0.15));
  m.accent.color.copy(pal.accent);
  m.accent.emissive.copy(pal.accent);
  m.glass.color.copy(mix(pal.fill, pal.accent, 0.2));
  m.light.color.copy(pal.paper);
  m.light.emissive.copy(pal.paper);
  m.edge.color.copy(pal.line);
  m.edgeStrong.color.copy(pal.line);
}

export function createMaterials(pal: Palette): Materials {
  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const m: Materials = {
    steel: std({ metalness: 0.35, roughness: 0.55 }),
    steelDark: std({ metalness: 0.5, roughness: 0.45 }),
    stainless: std({ metalness: 0.6, roughness: 0.35 }),
    cab: std({ metalness: 0.05, roughness: 0.75 }),
    concrete: std({ metalness: 0, roughness: 0.95 }),
    iron: std({ metalness: 0.3, roughness: 0.8 }),
    rubber: std({ metalness: 0, roughness: 0.9 }),
    accent: std({ metalness: 0.1, roughness: 0.5, emissiveIntensity: 0.35 }),
    glass: std({
      metalness: 0.1,
      roughness: 0.2,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    light: std({ metalness: 0, roughness: 0.6, emissiveIntensity: 0.6 }),
    edge: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 }),
    edgeStrong: new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 }),
    palette: pal,
  };
  applyPalette(m, pal);
  return m;
}

const MaterialsContext = createContext<Materials | null>(null);

/**
 * Creates the shared material set once and re-tints it whenever the page
 * theme (`data-theme` on <html>) changes.
 */
export function MaterialsProvider({ children }: { children: ReactNode }) {
  const invalidate = useThree((s) => s.invalidate);
  const mats = useMemo(() => createMaterials(readPalette()), []);

  useEffect(() => {
    const update = () => {
      applyPalette(mats, readPalette());
      invalidate();
    };
    update();
    const mo = new MutationObserver(update);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, [mats, invalidate]);

  return <MaterialsContext.Provider value={mats}>{children}</MaterialsContext.Provider>;
}

export function useMats(): Materials {
  const m = useContext(MaterialsContext);
  if (!m) throw new Error("useMats must be used inside <MaterialsProvider>");
  return m;
}
