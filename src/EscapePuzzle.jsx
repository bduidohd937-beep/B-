import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { panelPosition, GATE_Z, GATE_HALF_OPENING, POWER_PANEL } from './puzzle.js';
import { GARAGE_HEIGHT } from './garageLayout.js';
import { SECURITY_KEY_READER,gateLiftRatio,SHUTTER_FULL_LIFT } from './exitAuthorization.js';

// The security partition is an IN-LEVEL maintenance divider, not an outer boundary.
// Its collision agrees with the shared world rule even across the wide foggy garage.
export default function EscapePuzzle({ powered, floor=1,hasKey=false,authentication=null }) {
  const second=floor===2;
  const panel=panelPosition(floor);
  const shutter = useRef(null);
  const openHeight = useRef(0);
  useFrame((_, dt) => {
    if (!shutter.current) return;
    const target=second
      ?gateLiftRatio(authentication)*SHUTTER_FULL_LIFT
      :(powered?SHUTTER_FULL_LIFT:0);
    openHeight.current = THREE.MathUtils.damp(openHeight.current, target, second?11:2.4, Math.min(dt, .06));
    shutter.current.position.y = openHeight.current;
  });

  const sideWidth = 64 - GATE_HALF_OPENING;
  const sideCenter = (64 + GATE_HALF_OPENING) / 2;
  return <group>
    {/* Near end of parking level: fixed concrete partitions and powered shutter. */}
    {[-1, 1].map(side => <mesh key={side} position={[side * sideCenter, GARAGE_HEIGHT/2, GATE_Z]}>
      <boxGeometry args={[sideWidth, GARAGE_HEIGHT+.2, 1.25]}/>
      <meshStandardMaterial color="#596065" roughness={.95}/>
    </mesh>)}
    <group ref={shutter}>
      <mesh position={[0,GARAGE_HEIGHT/2,GATE_Z]}>
        <boxGeometry args={[GATE_HALF_OPENING*2,GARAGE_HEIGHT+.12,.42]}/>
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
    <group position={[0,GARAGE_HEIGHT-.62,GATE_Z+.3]}>
      <mesh><boxGeometry args={[5.8,.47,.13]}/><meshStandardMaterial color={powered?'#14594c':'#672d2b'} emissive={powered?'#1b7658':'#8d2927'} emissiveIntensity={1.4}/></mesh>
      <Text position={[0,0,.08]} fontSize={.27} color="#e1e9e0">
        {second?'B2 — SERVICE':powered?'EMERGENCY EXIT':'B2 — EXIT'}
      </Text>
      <pointLight position={[0,-.5,1]} intensity={powered?1.2:.75} color={powered?'#57bb8c':second?'#e35073':'#de514d'} distance={7}/>
    </group>
    {/* On loop 02 the emergency broadcast breaker is gone. The vehicle
         transponder is the ONLY way to open the service shutter here. */}
    {!second&&<group>
    {/* First-floor power breaker keeps the V0.11 red emergency siren. */}
    <group position={[panel[0],0,panel[1]]}>
      <mesh position={[0,.91,.18]}><boxGeometry args={[1.15,1.85,.65]}/><meshStandardMaterial color="#495355" metalness={.45} roughness={.6}/></mesh>
      <mesh position={[0,1.53,.53]}><boxGeometry args={[.82,.54,.05]}/><meshStandardMaterial color="#101719" roughness={.45}/></mesh>
      <mesh position={[0,1.52,.565]}><boxGeometry args={[.36,.25,.025]}/><meshBasicMaterial color={powered?'#4fcc9d':'#d6453e'}/></mesh>
      <mesh position={[0,.85,.57]}><boxGeometry args={[.46,.16,.13]}/><meshStandardMaterial color={powered?'#54b894':'#b14d44'} emissive={powered?'#296e50':'#5d1b1b'} emissiveIntensity={.7}/></mesh>
      <Text position={[0,1.94,.55]} fontSize={.18} color="#f3d0b0">EMERGENCY POWER</Text>
      <Text position={[0,1.20,.57]} fontSize={.15} color="#d8e3dc">{powered?'POWER ONLINE':'NO SIGNAL'}</Text>
      <pointLight position={[0,1.62,.65]} intensity={powered?1.4:1.1} color={powered?'#55bb8e':second?'#d82a72':'#cb4640'} distance={8}/>
    </group>

    </group>}
    {/* The second loop still has a physical cabinet at the old breaker
         coordinates, but its circuits are burnt out and it cannot be used.
         This mirrors shared terrain collision and avoids invisible blockers. */}
    {second&&<group position={[POWER_PANEL[0],0,POWER_PANEL[1]]}>
      <mesh position={[0,.98,0]}>
        <boxGeometry args={[2.14,1.96,1.42]}/>
        <meshStandardMaterial color="#343b3b" roughness={.95} metalness={.23}/>
      </mesh>
      <mesh position={[0,1.26,.73]}>
        <boxGeometry args={[1.39,.60,.02]}/>
        <meshStandardMaterial color="#1a2023" roughness={.94}/>
      </mesh>
      <mesh position={[.44,1.36,.745]}>
        <boxGeometry args={[.22,.09,.012]}/>
        <meshBasicMaterial color="#494441"/>
      </mesh>
    </group>}
    {/* A physical keyed interlock mounted BEFORE the second-loop shutter.
         Player reaches it from the front side (z > GATE_Z); neither the
         token nor any UI marker is a magical remote door opener. */}
    {second&&<group position={SECURITY_KEY_READER}>
      <mesh position={[0,-.66,0]}>
        <boxGeometry args={[.88,1.5,.53]}/>
        <meshStandardMaterial color="#41494d" roughness={.75} metalness={.48}/>
      </mesh>
      <mesh position={[0,.22,.29]}>
        <boxGeometry args={[.68,.52,.12]}/>
        <meshStandardMaterial color="#202c2e" metalness={.4} roughness={.7}/>
      </mesh>
      <mesh position={[0,.24,.36]}>
        <boxGeometry args={[.26,.07,.015]}/>
        <meshStandardMaterial color="#b6a277" metalness={.7} roughness={.5}/>
      </mesh>
      <mesh position={[-.22,.12,.36]}>
        <cylinderGeometry args={[.047,.047,.03,12]}/>
        <meshBasicMaterial color={powered?'#6de3ad':authentication?.phase==='opening'?'#e6a047':hasKey?'#cfb778':'#df504b'}/>
      </mesh>
      <mesh position={[.19,.10,.36]}>
        <boxGeometry args={[.19,.19,.022]}/>
        <meshStandardMaterial color={hasKey?'#baa476':'#6c7272'} metalness={.68} roughness={.55}/>
      </mesh>
      {/* Only physical lock slot and status LEDs: no large floating
           instructional text that gives away the puzzle. */}
      <pointLight position={[0,.25,.45]} intensity={.36} distance={3.7}
        color={powered?'#5de4b2':authentication?.phase==='opening'?'#f1ab68':'#d65e62'} decay={2}/>
    </group>}
    {/* The impossible corridor: a short visual teaser beyond the barrier. */}
    {[-3.6,3.6].map(x=><mesh key={x} position={[x,GARAGE_HEIGHT/2,-43]}>
      <boxGeometry args={[.20,GARAGE_HEIGHT+.1,11]}/>
      <meshStandardMaterial color="#343c40"/>
    </mesh>)}
    <mesh position={[0,GARAGE_HEIGHT-.07,-43]}>
      <boxGeometry args={[7.2,.18,11]}/>
      <meshStandardMaterial color="#364046"/>
    </mesh>
    <mesh position={[0,GARAGE_HEIGHT-.28,-44]}>
      <boxGeometry args={[.8,.07,1.7]}/>
      <meshBasicMaterial color="#869f93" toneMapped={false}/>
    </mesh>
  </group>;
}
