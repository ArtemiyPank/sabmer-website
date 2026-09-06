"use client";

import { Suspense, useMemo } from "react";
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
import NoteLeaders from "./parts/NoteLeaders";
import Engraved from "./parts/Engraved";
import { doorPhase, tourPose } from "./tour";
import type { SiteNotes } from "@/lib/site-notes";

export type ElevatorSceneProps = {
  progress: MotionValue<number>;
  explode?: number;
  annotations?: boolean;
  mobile?: boolean;
  /** debug: skip the scroll camera rig (the caller controls the camera) */
  manualCamera?: boolean;
  /** sideways pan of the drawing in metres (see cameraPose) */
  pan?: number;
  /** draw drafting leaders from the page's [data-note] sections to their parts */
  leaders?: boolean;
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

/** re-render the (on-demand) canvas whenever scroll progress changes */
function InvalidateOnProgress({ progress }: { progress: MotionValue<number> }) {
  const invalidate = useThree((s) => s.invalidate);
  useMotionValueEvent(progress, "change", () => invalidate());
  return null;
}

/** deterministic scroll-driven camera: follows the car, pulls back at the end */
function CameraRig({ pan, tour }: { pan: number; tour: boolean }) {
  const { mobile } = useScene();
  useProgressFrame((p, explode, state) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const { width, height } = state.size;
    const aspect = width / Math.max(height, 1);
    const pose = tour ? tourPose(p, explode, aspect, mobile) : cameraPose(p, aspect, mobile, pan);
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
  pan = 0,
  leaders = false,
  notes,
  only,
  children,
}: ElevatorSceneProps) {
  // the camera tour shows a working elevator: assembled, with doors that open
  // and close on their own schedule
  const settings = useMemo(
    () => ({ progress, explode, annotations, mobile, doors: notes ? doorPhase : undefined }),
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
          {!manualCamera && <CameraRig pan={pan} tour={!!notes} />}
          <Lights />
          <Suspense fallback={null}>
            <Fasteners>
              {PARTS.filter(([name]) => !only || only.includes(name)).map(([name, Part]) => (
                <Part key={name} />
              ))}
              {annotations && (!only || only.includes("labels")) && <Labels />}
              {leaders && <NoteLeaders />}
              {notes && <Engraved notes={notes} />}
              {children}
            </Fasteners>
          </Suspense>
        </MaterialsProvider>
      </SceneProvider>
    </Canvas>
  );
}
