import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Short first-person collapse after the listening creature catches the player.
// The original player rig still owns normal movement, look and respawn.
export default function DeathCamera({ phase, onComplete }) {
  const { camera } = useThree();
  const elapsed = useRef(0);
  const entered = useRef(false);
  const completed = useRef(false);
  const initial = useRef({ y:1.7,roll:0,pitch:0 });

  useFrame((_, dt) => {
    if (phase !== 'dying') {
      if (phase === 'alive') {
        elapsed.current = 0;
        entered.current = false;
        completed.current = false;
      }
      return;
    }
    if (!entered.current) {
      entered.current = true;
      initial.current = {
        y:camera.position.y,
        roll:camera.rotation.z,
        pitch:camera.rotation.x
      };
    }
    elapsed.current += Math.min(dt, .06);
    const t = THREE.MathUtils.clamp(elapsed.current / 1.55,0,1);
    const collapse = 1 - Math.pow(1-t, 2.4);
    const shudder = Math.sin(elapsed.current*39)*Math.pow(1-t,2)*.055;
    camera.position.y = THREE.MathUtils.lerp(initial.current.y,.34,collapse);
    camera.rotation.z = initial.current.roll + collapse*.92 + shudder;
    camera.rotation.x = initial.current.pitch - collapse*.27 + shudder*.35;
    if (t >= 1 && !completed.current) {
      completed.current = true;
      onComplete();
    }
  });
  return null;
}
