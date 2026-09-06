"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useProgressFrame, useScene } from "../scene-context";
import { DOOR_OPEN, PULLEY_R, TRAVEL, carY, explosion } from "../dims";
import { CarPulley, Crosshead, Plank, RollerShoe, SafetyGear, Stile } from "./Car.sling";
import { BackWall, Ceiling, Platform, Return, SideWall } from "./Car.cab";
import { DoorHeader, DoorOperator, DoorPanel } from "./Car.doors";

/**
 * The elevator car: sling (crosshead, stiles, safety plank with the 2:1
 * pulleys, guide shoes and safety gear), platform, cab panels, ceiling with
 * the car top equipment, doors and door operator.
 *
 * The root group follows carY(p); every sub-assembly sits in its own group
 * that is offset per frame by the matching field of `explosion(p, explode)`,
 * so the car comes apart as the page is scrolled.
 */

export default function Car() {
  // the camera-tour layout runs the doors on its own schedule (a working car,
  // not an exploded one); otherwise they part with the exploded view
  const { doors } = useScene();
  const root = useRef<THREE.Group>(null);
  const crosshead = useRef<THREE.Group>(null);
  const stileL = useRef<THREE.Group>(null);
  const stileR = useRef<THREE.Group>(null);
  const plank = useRef<THREE.Group>(null);
  const floor = useRef<THREE.Group>(null);
  const ceiling = useRef<THREE.Group>(null);
  const wallL = useRef<THREE.Group>(null);
  const wallR = useRef<THREE.Group>(null);
  const wallBack = useRef<THREE.Group>(null);
  const returnL = useRef<THREE.Group>(null);
  const returnR = useRef<THREE.Group>(null);
  const header = useRef<THREE.Group>(null);
  const doorL = useRef<THREE.Group>(null);
  const doorR = useRef<THREE.Group>(null);
  const operator = useRef<THREE.Group>(null);
  const shoeTL = useRef<THREE.Group>(null);
  const shoeTR = useRef<THREE.Group>(null);
  const shoeBL = useRef<THREE.Group>(null);
  const shoeBR = useRef<THREE.Group>(null);
  const safetyL = useRef<THREE.Group>(null);
  const safetyR = useRef<THREE.Group>(null);
  const pulL = useRef<THREE.Group>(null);
  const pulR = useRef<THREE.Group>(null);

  useProgressFrame((p, explode) => {
    if (root.current) root.current.position.y = carY(p);
    const e = explosion(p, explode);
    crosshead.current?.position.set(...e.crosshead);
    stileL.current?.position.set(...e.stileL);
    stileR.current?.position.set(...e.stileR);
    plank.current?.position.set(...e.plank);
    floor.current?.position.set(...e.floor);
    ceiling.current?.position.set(...e.ceiling);
    wallL.current?.position.set(...e.wallL);
    wallR.current?.position.set(...e.wallR);
    wallBack.current?.position.set(...e.wallBack);
    returnL.current?.position.set(...e.returnL);
    returnR.current?.position.set(...e.returnR);
    header.current?.position.set(...e.header);
    if (doors) {
      const open = doors(p) * DOOR_OPEN;
      doorL.current?.position.set(-open, 0, 0);
      doorR.current?.position.set(open, 0, 0);
    } else {
      doorL.current?.position.set(...e.doorL);
      doorR.current?.position.set(...e.doorR);
    }
    operator.current?.position.set(...e.operator);
    // guide shoes and safety gear slide further out along the rails
    if (shoeTL.current) shoeTL.current.position.x = -e.shoeOut;
    if (shoeTR.current) shoeTR.current.position.x = e.shoeOut;
    if (shoeBL.current) shoeBL.current.position.x = -e.shoeOut;
    if (shoeBR.current) shoeBR.current.position.x = e.shoeOut;
    safetyL.current?.position.set(-e.safetyOut, -0.75 * e.safetyOut, 0);
    safetyR.current?.position.set(e.safetyOut, -0.75 * e.safetyOut, 0);
    const a = (-TRAVEL * p) / PULLEY_R;
    if (pulL.current) pulL.current.rotation.z = a;
    if (pulR.current) pulR.current.rotation.z = a;
  });

  return (
    <group ref={root}>
      <group ref={crosshead}>
        <Crosshead />
        <RollerShoe ref={shoeTL} sx={-1} top />
        <RollerShoe ref={shoeTR} sx={1} top />
      </group>
      <group ref={stileL}>
        <Stile sx={-1} />
      </group>
      <group ref={stileR}>
        <Stile sx={1} />
      </group>
      <group ref={plank}>
        <Plank />
        <CarPulley ref={pulL} sx={-1} />
        <CarPulley ref={pulR} sx={1} />
        <RollerShoe ref={shoeBL} sx={-1} top={false} />
        <RollerShoe ref={shoeBR} sx={1} top={false} />
        <SafetyGear ref={safetyL} sx={-1} />
        <SafetyGear ref={safetyR} sx={1} />
      </group>
      <group ref={floor}>
        <Platform />
      </group>
      <group ref={ceiling}>
        <Ceiling />
      </group>
      <group ref={wallL}>
        <SideWall sx={-1} />
      </group>
      <group ref={wallR}>
        <SideWall sx={1} />
      </group>
      <group ref={wallBack}>
        <BackWall />
      </group>
      <group ref={returnL}>
        <Return sx={-1} />
      </group>
      <group ref={returnR}>
        <Return sx={1} />
      </group>
      <group ref={header}>
        <DoorHeader />
      </group>
      <group ref={doorL}>
        <DoorPanel sx={-1} />
      </group>
      <group ref={doorR}>
        <DoorPanel sx={1} />
      </group>
      <group ref={operator}>
        <DoorOperator />
      </group>
    </group>
  );
}
