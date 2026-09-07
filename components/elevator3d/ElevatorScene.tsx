"use client";

import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { useMotionValueEvent, type MotionValue } from "framer-motion";
import { MaterialsProvider } from "./materials";
import { SceneProvider, useProgressFrame, useScene } from "./scene-context";
import { Fasteners } from "./Bolts";
import { cameraPose, PIT_FLOOR, SHAFT_TOP } from "./dims";
import Hoistway from "./parts/Hoistway";
import Rails from "./parts/Rails";
import Machine from "./parts/Machine";
import Car from "./parts/Car";
import Counterweight from "./parts/Counterweight";
import Ropes from "./parts/Ropes";
import Pit from "./parts/Pit";
import Labels from "./parts/Labels";
import Engraved from "./parts/Engraved";
import { blendPoses, doorPhase, tourPose, travelAt } from "./tour";
import { getRide } from "@/lib/ride";
import type { V3 } from "./dims";
import type { SiteNotes } from "@/lib/site-notes";

export type ElevatorSceneProps = {
  progress: MotionValue<number>;
  explode?: number;
  annotations?: boolean;
  mobile?: boolean;
  /** debug: skip the scroll camera rig (the caller controls the camera) */
  manualCamera?: boolean;
  /** letter the page text onto the parts and fly the camera from one to the next */
  notes?: SiteNotes;
  /** debug: render only these part modules (by name, lower-case) */
  only?: string[];
  children?: React.ReactNode;
};

const PARTS: Array<[string, React.ComponentType]> = [
  ["hoistway", Hoistway],
  ["rails", Rails],
  ["machine", Machine],
  ["car", Car],
  ["counterweight", Counterweight],
  ["ropes", Ropes],
  ["pit", Pit],
];

const rideFrom: { pos: V3; tgt: V3 } = { pos: [0, 0, 0], tgt: [0, 0, 0] };
const settleFrom: { pos: V3; tgt: V3 } = { pos: [0, 0, 0], tgt: [0, 0, 0] };
const copy3 = (to: V3, from: V3) => {
  to[0] = from[0];
  to[1] = from[1];
  to[2] = from[2];
};
const linPos: V3 = [0, 0, 0];
const linTgt: V3 = [0, 0, 0];

/** plain interpolation between two poses, for easing back after a ride */
function blendLinear(aPos: V3, aTgt: V3, bPos: V3, bTgt: V3, t: number, fov: number) {
  for (let k = 0; k < 3; k++) {
    linPos[k] = aPos[k] + (bPos[k] - aPos[k]) * t;
    linTgt[k] = aTgt[k] + (bTgt[k] - aTgt[k]) * t;
  }
  return { position: linPos, target: linTgt, fov };
}

/** re-render the (on-demand) canvas whenever scroll progress changes */
function InvalidateOnProgress({ progress }: { progress: MotionValue<number> }) {
  const invalidate = useThree((s) => s.invalidate);
  useMotionValueEvent(progress, "change", () => invalidate());
  return null;
}

/** deterministic scroll-driven camera: follows the car, pulls back at the end */
function CameraRig({ tour }: { tour: boolean }) {
  const { mobile } = useScene();
  // pose the camera held when a ride began, and the one it holds now: a ride
  // flies straight from the first to the destination, and if the visitor
  // interrupts it the camera eases back onto the scroll pose instead of
  // snapping there
  const riding = useRef(false);
  const held = useRef<{ pos: V3; tgt: V3 }>({ pos: [0, 0, 0], tgt: [0, 0, 0] });
  const settleUntil = useRef(0);
  const SETTLE = 450;

  useProgressFrame((p, explode, state, scroll) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const { width, height } = state.size;
    const aspect = width / Math.max(height, 1);
    if (!tour) {
      const pose = cameraPose(p, aspect, mobile);
      camera.position.set(...pose.position);
      camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
      return;
    }

    const ride = getRide();
    let pose = tourPose(ride.active ? ride.to : scroll, explode, aspect, mobile);

    if (ride.active) {
      if (!riding.current) {
        copy3(rideFrom.pos, held.current.pos);
        copy3(rideFrom.tgt, held.current.tgt);
        riding.current = true;
      }
      pose = blendPoses(rideFrom.pos, rideFrom.tgt, pose.position, pose.target, ride.t, pose.fov);
    } else if (riding.current) {
      // the ride ended early: keep where the flight left off and ease back on
      riding.current = false;
      settleUntil.current = state.clock.elapsedTime * 1000 + SETTLE;
      copy3(settleFrom.pos, held.current.pos);
      copy3(settleFrom.tgt, held.current.tgt);
    }

    const nowMs = state.clock.elapsedTime * 1000;
    if (!ride.active && nowMs < settleUntil.current) {
      const t = 1 - (settleUntil.current - nowMs) / SETTLE;
      const e = t * t * (3 - 2 * t);
      pose = blendLinear(settleFrom.pos, settleFrom.tgt, pose.position, pose.target, e, pose.fov);
    }

    copy3(held.current.pos, pose.position);
    copy3(held.current.tgt, pose.target);
    camera.position.set(...pose.position);
    camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
    if (camera.fov !== pose.fov) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }
  }, 0);
  return null;
}

function Lights() {
  const { mobile } = useScene();
  const mid = (PIT_FLOOR + SHAFT_TOP) / 2;
  // the key light aims at the middle of the hoistway; its target object has
  // to live in the scene graph for three to pick up the position
  const target = useMemo(() => new THREE.Object3D(), []);
  return (
    <>
      <hemisphereLight args={["#ffffff", "#8fa8d8", 0.85]} position={[0, 20, 0]} />
      <ambientLight intensity={0.35} />
      <primitive object={target} position={[0, mid, 0]} />
      <directionalLight
        position={[9, mid + 14, 12]}
        target={target}
        intensity={1.7}
        castShadow={!mobile}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
        shadow-camera-near={2}
        shadow-camera-far={60}
      />
      {/* soft fill from the open front-left so shadowed faces keep their tint */}
      <directionalLight position={[-8, mid + 4, 10]} intensity={0.45} />
    </>
  );
}

/**
 * The whole hoistway. Rendering is on-demand: frames are produced only when
 * scroll progress, theme or viewport size change, which keeps the page idle
 * (and phones cool) while the user reads.
 */
export default function ElevatorScene({
  progress,
  explode = 1,
  annotations = true,
  mobile = false,
  manualCamera = false,
  notes,
  only,
  children,
}: ElevatorSceneProps) {
  // the camera tour shows a working elevator: assembled, with doors that open
  // and close on their own schedule
  const settings = useMemo(
    () => ({
      progress,
      explode,
      annotations,
      mobile,
      doors: notes ? doorPhase : undefined,
      travel: notes ? travelAt : undefined,
    }),
    [progress, explode, annotations, mobile, notes]
  );
  return (
    <Canvas
      frameloop="demand"
      // phones are 2-3x: rendering below their pixel ratio is what makes the
      // drawing look soft, and the scene only draws while the page scrolls
      dpr={mobile ? [1.5, 3] : [1, 2]}
      shadows={!mobile}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.NoToneMapping,
      }}
      camera={{ fov: 32, near: 0.5, far: 120, position: [12, 10, 22] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <SceneProvider value={settings}>
        <MaterialsProvider>
          <InvalidateOnProgress progress={progress} />
          {/* mounted before the parts: its priority-0 callback has to pose the camera
              before drei's <Html> (also priority 0) projects the callouts */}
          {!manualCamera && <CameraRig tour={!!notes} />}
          <Lights />
          <Suspense fallback={null}>
            <Fasteners>
              {PARTS.filter(([name]) => !only || only.includes(name)).map(([name, Part]) => (
                <Part key={name} />
              ))}
              {annotations && (!only || only.includes("labels")) && <Labels />}
              {notes && <Engraved notes={notes} />}
              {children}
            </Fasteners>
          </Suspense>
        </MaterialsProvider>
      </SceneProvider>
    </Canvas>
  );
}
