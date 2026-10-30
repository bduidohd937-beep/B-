import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Visual projectile uses the same exact ground endpoint that emits the noise event.
export default function ThrownCan({ projectile, active, onImpact }) {
  const mesh = useRef(null);
  const clock = useRef(0);
  const impacted = useRef(false);
  const duration = .88;
  const initial = useRef(new THREE.Vector3());
  const ending = useRef(new THREE.Vector3());

  useEffect(() => {
    clock.current = 0;
    impacted.current = false;
    if (projectile) {
      initial.current.fromArray(projectile.start);
      ending.current.fromArray(projectile.end);
      if (mesh.current) mesh.current.position.copy(initial.current);
    }
  }, [projectile?.id]);

  useFrame((_, delta) => {
    if (!mesh.current || !projectile || !active) return;
    clock.current += Math.min(delta, .05);
    const t = Math.min(clock.current / duration, 1);
    mesh.current.position.lerpVectors(initial.current, ending.current, t);
    mesh.current.position.y += 1.75 * Math.sin(t * Math.PI);
    if (t < 1) {
      mesh.current.rotation.set(Math.PI * .5 + clock.current * 8, clock.current * 5, clock.current * 4);
    } else {
      mesh.current.rotation.set(Math.PI / 2, .2, 0);
      if (!impacted.current) {
        impacted.current = true;
        onImpact(projectile.end);
      }
    }
  });
  if (!projectile) return null;
  return <group ref={mesh} position={projectile.start}>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[.16, .16, .38, 16]}/>
      <meshStandardMaterial color="#c6d0cd" roughness={.28} metalness={.75}/>
    </mesh>
    <mesh position={[0, 0, .012]} rotation={[Math.PI/2,0,0]}>
      <cylinderGeometry args={[.163,.163,.12,16]}/>
      <meshStandardMaterial color="#b44e42" roughness={.5} metalness={.3}/>
    </mesh>
    <pointLight intensity={.34} distance={2.3} color="#cad7d0"/>
  </group>;
}
