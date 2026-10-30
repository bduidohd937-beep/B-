import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { panelPosition, GATE_Z, GATE_HALF_OPENING } from './puzzle.js';

// The room is deliberately small: a risky, noisy switch near the listener,
// then a full-width security partition that cannot be bypassed at the map edge.
export default function EscapePuzzle({ powered, floor=1 }) {
  const second=floor===2;
  const panel=panelPosition(floor);
  const shutter = useRef(null);
  const openHeight = useRef(0);
  useFrame((_, dt) => {
    if (!shutter.current) return;
    openHeight.current = THREE.MathUtils.damp(openHeight.current, powered ? 4.25 : 0, 2.4, Math.min(dt, .06));
    shutter.current.position.y = openHeight.current;
  });

  const sideWidth = 20.6 - GATE_HALF_OPENING;
  const sideCenter = (20.6 + GATE_HALF_OPENING) / 2;
  return <group>
    {/* Near end of parking level: fixed concrete partitions and powered shutter. */}
    {[-1, 1].map(side => <mesh key={side} position={[side * sideCenter, 2.05, GATE_Z]}>
      <boxGeometry args={[sideWidth, 4.2, 1.25]}/>
      <meshStandardMaterial color="#596065" roughness={.95}/>
    </mesh>)}
    <group ref={shutter}>
      <mesh position={[0,2.06,GATE_Z]}>
        <boxGeometry args={[GATE_HALF_OPENING*2,4.12,.42]}/>
        <meshStandardMaterial color="#505d64" metalness={.62} roughness={.46}/>
      </mesh>
      {Array.from({length:8},(_,i)=><mesh key={i} position={[0,.42+i*.43,GATE_Z+.23]}>
        <boxGeometry args={[GATE_HALF_OPENING*2,.045,.018]}/>
        <meshBasicMaterial color="#303b40"/>
      </mesh>)}
      <mesh position={[0,1.7,GATE_Z+.25]}>
        <boxGeometry args={[.20,2.5,.055]}/>
        <meshStandardMaterial color="#a9a695" roughness={.55}/>
      </mesh>
    </group>
    {/* Lit gate sign; it changes only after real power restoration. */}
    <group position={[0,4.30,GATE_Z+.3]}>
      <mesh><boxGeometry args={[5.8,.47,.13]}/><meshStandardMaterial color={powered?'#14594c':'#672d2b'} emissive={powered?'#1b7658':'#8d2927'} emissiveIntensity={1.4}/></mesh>
      <Text position={[0,0,.08]} fontSize={.27} color="#e1e9e0">{powered?(second?'NO EXIT — B2':'EMERGENCY EXIT — OPEN'):(second?'B2 — AGAIN':'EMERGENCY EXIT — LOCKED')}</Text>
      <pointLight position={[0,-.5,1]} intensity={powered?1.2:.75} color={powered?'#57bb8c':second?'#e35073':'#de514d'} distance={7}/>
    </group>
    {/* Distribution box: visible red beacon beside the creature's initial territory. */}
    <group position={[panel[0],0,panel[1]]}>
      <mesh position={[0,.91,.18]}><boxGeometry args={[1.15,1.85,.65]}/><meshStandardMaterial color="#495355" metalness={.45} roughness={.6}/></mesh>
      <mesh position={[0,1.53,.53]}><boxGeometry args={[.82,.54,.05]}/><meshStandardMaterial color="#101719" roughness={.45}/></mesh>
      <mesh position={[0,1.52,.565]}><boxGeometry args={[.36,.25,.025]}/><meshBasicMaterial color={powered?'#4fcc9d':'#d6453e'}/></mesh>
      <mesh position={[0,.85,.57]}><boxGeometry args={[.46,.16,.13]}/><meshStandardMaterial color={powered?'#54b894':'#b14d44'} emissive={powered?'#296e50':'#5d1b1b'} emissiveIntensity={.7}/></mesh>
      <Text position={[0,1.94,.55]} fontSize={.18} color="#f3d0b0">{second?'EMERGENCY BROADCAST':'EMERGENCY POWER'}</Text>
      <Text position={[0,1.20,.57]} fontSize={.15} color="#d8e3dc">{powered?(second?'SIGNAL RESTORED':'POWER ONLINE'):(second?'HOLD E — RESET':'HOLD E TO RESTART')}</Text>
      <pointLight position={[0,1.62,.65]} intensity={powered?1.4:1.1} color={powered?'#55bb8e':second?'#d82a72':'#cb4640'} distance={8}/>
    </group>
    {/* The impossible corridor: a short visual teaser beyond the barrier. */}
    {[-3.6,3.6].map(x=><mesh key={x} position={[x,2,-43]}>
      <boxGeometry args={[.20,4.2,11]}/>
      <meshStandardMaterial color="#343c40"/>
    </mesh>)}
    <mesh position={[0,4.22,-43]}>
      <boxGeometry args={[7.2,.18,11]}/>
      <meshStandardMaterial color="#364046"/>
    </mesh>
    <mesh position={[0,4.05,-44]}>
      <boxGeometry args={[.8,.07,1.7]}/>
      <meshBasicMaterial color="#869f93" toneMapped={false}/>
    </mesh>
  </group>;
}
