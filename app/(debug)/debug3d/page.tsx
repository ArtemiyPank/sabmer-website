"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useMotionValue } from "framer-motion";
import ElevatorScene from "@/components/elevator3d/ElevatorScene";

/**
 * Debug harness for the 3D hoistway (dev only; not linked from the site).
 *   /debug3d?part=car,ropes&p=0.5&explode=1&theme=dark&cam=fit&az=35&el=12&zoom=1
 *   cam=rig uses the real scroll camera; cam=fit frames the rendered parts.
 *   mobile=1 renders the mobile variant (no shadows / annotations).
 */

function FitCamera({ az, el, zoom, target }: { az: number; el: number; zoom: number; target?: THREE.Vector3 }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const box = useRef(new THREE.Box3());
  useFrame(() => {
    box.current.setFromObject(scene, true);
    if (box.current.isEmpty()) return;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.current.getSize(size);
    box.current.getCenter(center);
    if (target) center.copy(target);
    const radius = Math.max(size.x, size.y, size.z) * 0.55;
    const dist = (radius / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * zoom;
    const a = THREE.MathUtils.degToRad(az);
    const e = THREE.MathUtils.degToRad(el);
    camera.position.set(
      center.x + dist * Math.cos(e) * Math.sin(a),
      center.y + dist * Math.sin(e),
      center.z + dist * Math.cos(e) * Math.cos(a)
    );
    camera.lookAt(center);
  }, 0);
  return null;
}

/** renderer statistics of the last frame, written straight into the DOM */
function Stats() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  useFrame(() => {
    const el = document.getElementById("stats");
    if (!el) return;
    // counters hold the previous frame; on-demand rendering may stop after
    // the first one, so ask for one more frame until something was drawn
    if (gl.info.render.calls === 0) invalidate();
    let meshes = 0;
    let lines = 0;
    let instances = 0;
    scene.traverse((o) => {
      if ((o as THREE.InstancedMesh).isInstancedMesh) instances += (o as THREE.InstancedMesh).count;
      else if ((o as THREE.Mesh).isMesh) meshes++;
      else if ((o as THREE.LineSegments).isLineSegments) lines++;
    });
    const r = gl.info.render;
    el.textContent = `meshes=${meshes} lines=${lines} instances=${instances} calls=${r.calls} tris=${r.triangles}`;
  }, 0);
  return null;
}

function Harness() {
  const sp = useSearchParams();
  const num = (k: string, d: number) => {
    const v = parseFloat(sp.get(k) ?? "");
    return Number.isFinite(v) ? v : d;
  };
  const part = sp.get("part");
  const only = useMemo(() => (part && part !== "all" ? part.split(",") : undefined), [part]);
  const theme = sp.get("theme") ?? "light";
  const cam = sp.get("cam") ?? "fit";
  const mobile = sp.get("mobile") === "1";
  const p = num("p", 0);
  const progress = useMotionValue(p);
  useEffect(() => progress.set(p), [p, progress]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const target = sp.has("ty")
    ? new THREE.Vector3(num("tx", 0), num("ty", 0), num("tz", 0))
    : undefined;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bp-paper)",
        backgroundImage: `linear-gradient(var(--bp-grid-major) 1px, transparent 1px),
          linear-gradient(90deg, var(--bp-grid-major) 1px, transparent 1px),
          linear-gradient(var(--bp-grid) 1px, transparent 1px),
          linear-gradient(90deg, var(--bp-grid) 1px, transparent 1px)`,
        backgroundSize: "125px 125px, 125px 125px, 25px 25px, 25px 25px",
      }}
    >
      <ElevatorScene
        progress={progress}
        explode={num("explode", 1)}
        annotations={!mobile && sp.get("labels") !== "0"}
        mobile={mobile}
        manualCamera={cam !== "rig"}
        only={only}
      >
        {cam !== "rig" && <FitCamera az={num("az", 35)} el={num("el", 12)} zoom={num("zoom", 1)} target={target} />}
        <Stats />
      </ElevatorScene>
      <div
        data-testid="ready"
        style={{ position: "fixed", left: 8, bottom: 8, font: "12px monospace", color: "var(--bp-line)" }}
      >
        p={p} explode={num("explode", 1)} part={part ?? "all"} cam={cam} <span id="stats" />
      </div>
    </div>
  );
}

export default function Debug3DPage() {
  return (
    <Suspense fallback={null}>
      <Harness />
    </Suspense>
  );
}
