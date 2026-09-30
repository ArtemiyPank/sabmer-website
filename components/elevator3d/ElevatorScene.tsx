"use client";

import { Suspense, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMotionValueEvent, type MotionValue } from "framer-motion";
import { MaterialsProvider } from "./materials";
import { SceneProvider, useProgressFrame, useScene } from "./scene-context";
import { Fasteners } from "./Bolts";
import { InstancedBoxes } from "./prims";
import { cameraPose, PIT_FLOOR, SHAFT_TOP } from "./dims";
import Hoistway from "./parts/Hoistway";
import Rails from "./parts/Rails";
import Machine from "./parts/Machine";
import Car from "./parts/Car";
import Counterweight from "./parts/Counterweight";
import Ropes from "./parts/Ropes";
import Pit from "./parts/Pit";
import Engraved from "./parts/Engraved";

/**
 * The numbered callouts over the parts, fetched only when something asks for
 * them — which on the site is never: the tour renders the scene with
 * `annotations={false}` and the copy is lettered onto the machine instead.
 * They are for the debug harness at /debug3d, which production does not serve
 * at all, so every visitor was carrying the drafting labels for a drawing they
 * are not shown.
 */
const Labels = dynamic(() => import("./parts/Labels"), { ssr: false });
import { blendPoses, doorPhase, tourPose, travelAt } from "./tour";
import { getRide } from "@/lib/ride";
import { markSceneReady } from "@/lib/scene-ready";
import { RIDE, SCENE } from "@/lib/tuning";
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
  const invalidate = useThree((s) => s.invalidate);
  // pose the camera held when a ride began, and the one it holds now: a ride
  // flies straight from the first to the destination, and if the visitor
  // interrupts it the camera eases back onto the scroll pose instead of
  // snapping there
  // the id of the ride the flight was set up for; -1 when not flying. Keyed on
  // the id rather than on "was riding", because two presses in a row can
  // happen without a frame in between, and the camera has to leave from where
  // the last one left it, not from where the first one started.
  const rideId = useRef(-1);
  const held = useRef<{ pos: V3; tgt: V3 }>({ pos: [0, 0, 0], tgt: [0, 0, 0] });
  const settleUntil = useRef(0);


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
    // while a trip is running the camera flies straight to its destination
    // rather than walking through every stop the page scrolls past
    const flying = ride.flying;
    let pose = tourPose(flying ? ride.to : scroll, explode, aspect, mobile);

    if (flying) {
      if (rideId.current !== ride.id) {
        rideId.current = ride.id;
        copy3(rideFrom.pos, held.current.pos);
        copy3(rideFrom.tgt, held.current.tgt);
      }
      pose = blendPoses(rideFrom.pos, rideFrom.tgt, pose.position, pose.target, ride.t, pose.fov);
    } else if (rideId.current !== -1) {
      // the ride ended: keep where the flight left off and ease back on
      rideId.current = -1;
      settleUntil.current = state.clock.elapsedTime * 1000 + RIDE.settleMs;
      copy3(settleFrom.pos, held.current.pos);
      copy3(settleFrom.tgt, held.current.tgt);
    }

    const nowMs = state.clock.elapsedTime * 1000;
    if (!ride.flying && nowMs < settleUntil.current) {
      const t = 1 - (settleUntil.current - nowMs) / RIDE.settleMs;
      const e = t * t * (3 - 2 * t);
      pose = blendLinear(settleFrom.pos, settleFrom.tgt, pose.position, pose.target, e, pose.fov);
    }

    if (ride.flying || nowMs < settleUntil.current) invalidate();

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

/**
 * Says so once the scene has drawn a frame with the machine in it: mounted
 * inside the same Suspense as the parts, so it cannot fire over an empty
 * shaft, and after the camera rig, whose pose that first frame sets.
 */
function FirstFrame() {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    // the frame this runs in is drawn right after it; one more tick and the
    // picture is on the screen
    requestAnimationFrame(markSceneReady);
  });
  return null;
}

function Lights() {
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
      // Phones are 2-3x and rendering below their pixel ratio is what makes
      // the drawing look soft, but a third of a pixel of extra sharpness costs
      // more than twice the fill: 2x with multisampling reads crisper than 3x
      // without, and the outlines are what the look rests on.
      dpr={mobile ? SCENE.dprMobile : SCENE.dpr}
      // No shadow pass. It draws the whole scene a second time every frame —
      // about half of the frame's draw calls — and a blueprint reads from its
      // outlines and flat tints, not from cast shadows.
      shadows={false}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.NoToneMapping,
      }}
      camera={SCENE.camera}
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
            <InstancedBoxes>
            <Fasteners>
              {PARTS.filter(([name]) => !only || only.includes(name)).map(([name, Part]) => (
                <Part key={name} />
              ))}
              {annotations && (!only || only.includes("labels")) && <Labels />}
              {notes && <Engraved notes={notes} />}
              {children}
              <FirstFrame />
            </Fasteners>
            </InstancedBoxes>
          </Suspense>
        </MaterialsProvider>
      </SceneProvider>
    </Canvas>
  );
}
