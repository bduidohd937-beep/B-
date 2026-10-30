import React, { useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// The second B2 floor intentionally copies the first floor's layout so
// collision/navigation rules remain honest. The distortions are visual only.
export default function DistortedB2() {
  const signs=useRef([]);
  const glow=useRef();
  useFrame((state)=>{
    const t=state.clock.elapsedTime;
    signs.current.forEach((mesh,i)=>{
      if(!mesh)return;
      mesh.rotation.z=Math.sin(t*.7+i*.88)*.045;
      mesh.position.y=2.8+Math.sin(t*1.23+i)*.08;
    });
    if(glow.current)glow.current.intensity=1.6+Math.sin(t*3.15)*.65;
  });
  const ghosts=[[-12,-5,0.12],[13,6,-.2],[-13,-29,.18]];
  return <group>
    {/* Same floor, wrong geometry: repetitions and impossible fluorescent shadows. */}
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.012,-7]}>
      <planeGeometry args={[38,80]}/>
      <meshStandardMaterial color="#351b22" transparent opacity={.28} roughness={1} depthWrite={false}/>
    </mesh>
    {[-28,-19,-10,-1,8,17].map((z,i)=>
      <group key={z} position={[i%2===0?-10:10,0,z]}>
        <mesh position={[.28,2.25,.45]} scale={[1.0,4.7,.16]} rotation={[0,.09,0]}>
          <boxGeometry args={[1,1,1]}/>
          <meshStandardMaterial color="#13181d" transparent opacity={.50} depthWrite={false}/>
        </mesh>
        <mesh position={[0,1.7,1.05]}>
          <boxGeometry args={[.9,.09,.018]}/>
          <meshBasicMaterial color="#b23c46" transparent opacity={.65}/>
        </mesh>
      </group>
    )}
    {[-31,-14,3,20].map((z,i)=>
      <group key={z} position={[i%2===0?-13.6:13.6,0,z]}>
        <group position={[0,2.8,0]} ref={el=>{signs.current[i]=el;}}>
          <mesh>
            <boxGeometry args={[2.45,.77,.08]}/>
            <meshStandardMaterial color="#1b171e" emissive="#a21b32" emissiveIntensity={.68}/>
          </mesh>
          <Text position={[0,.01,.06]} fontSize={.46} color="#f2aaad">B2</Text>
          <Text position={[0,-.55,.06]} fontSize={.12} color="#be606b">YOU ARE STILL HERE</Text>
        </group>
      </group>
    )}
    {/* Phantom parked-car shadows that vanish when approached (no collision). */}
    {ghosts.map(([x,z,r],i)=><group key={i} position={[x,0,z]} rotation={[0,r,0]}>
      <mesh position={[0,.39,0]}>
        <boxGeometry args={[2.35,.75,4.25]}/>
        <meshStandardMaterial color="#0a0b10" transparent opacity={.2} roughness={1} depthWrite={false}/>
      </mesh>
      <mesh position={[0,1.0,-.1]} scale={[.85,.25,.85]}>
        <boxGeometry args={[2,1,3]}/>
        <meshStandardMaterial color="#520d22" transparent opacity={.18} emissive="#8d1d30" emissiveIntensity={.25} depthWrite={false}/>
      </mesh>
    </group>)}
    {/* Faked exit arrow pointing back at the player. */}
    <group position={[0,2.7,-18]}>
      <mesh><boxGeometry args={[5.2,.8,.19]}/><meshStandardMaterial color="#3b1b25" emissive="#4c0819" emissiveIntensity={1.2}/></mesh>
      <Text position={[0,.01,.12]} fontSize={.34} color="#f5a8aa">EXIT ↓  B2</Text>
    </group>
    <group position={[0,4.28,-14]}>
      <pointLight ref={glow} intensity={1.6} distance={21} color="#b14150" decay={2}/>
      <mesh position={[0,-.05,0]}>
        <boxGeometry args={[.78,.06,2.8]}/>
        <meshBasicMaterial color="#a44750" toneMapped={false}/>
      </mesh>
    </group>
    {/* Distorted CCTV shadow of someone who is not present. */}
    <group position={[15,0,-31]}>
      <mesh position={[0,1.52,0]} scale={[.24,1.36,.18]}>
        <sphereGeometry args={[1,8,12]}/>
        <meshStandardMaterial color="#030507" transparent opacity={.8}/>
      </mesh>
      <mesh position={[0,2.56,0]} scale={[.18,.28,.17]}>
        <sphereGeometry args={[1,10,10]}/>
        <meshStandardMaterial color="#040708" roughness={1}/>
      </mesh>
    </group>
  </group>;
}
