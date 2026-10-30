import React, { useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { phantomVisibility, shadowVisibility, planarDistance, shouldPlayPhantomCue, shouldGlitchExit } from './horrorRules.js';
import * as THREE from 'three';

// The second B2 floor intentionally copies the first floor's layout so
// collision/navigation rules remain honest. The distortions are visual only.
const GHOSTS=[[-12,-5,0.12],[13,6,-.2],[-13,-29,.18]];
const SHADOW=[15,-31];
export default function DistortedB2({onEvent}) {
  const {camera}=useThree();
  const signs=useRef([]);
  const glow=useRef();
  const ghostBodies=useRef([]);
  const ghostCabins=useRef([]);
  const specterBody=useRef();
  const specterHead=useRef();
  const exitSign=useRef();
  const heard=useRef(new Set());
  const forward=useRef(new THREE.Vector3());
  useFrame((state)=>{
    const t=state.clock.elapsedTime;
    signs.current.forEach((mesh,i)=>{
      if(!mesh)return;
      mesh.rotation.z=Math.sin(t*.7+i*.88)*.045;
      mesh.position.y=2.8+Math.sin(t*1.23+i)*.08;
    });
    // No React state updates inside this loop: modify existing Three.js material refs.
    if(glow.current)glow.current.intensity=1.45+Math.sin(t*3.15)*.45;
    let closest=Infinity;
    for(let i=0;i<GHOSTS.length;i++){
      const [x,z]=GHOSTS[i];
      const distance=planarDistance(camera.position.x,camera.position.z,x,z);
      closest=Math.min(closest,distance);
      const visibility=phantomVisibility(distance);
      if(ghostBodies.current[i])ghostBodies.current[i].material.opacity=.22*visibility;
      if(ghostCabins.current[i])ghostCabins.current[i].material.opacity=.18*visibility;
    }
    if(shouldPlayPhantomCue(closest,heard.current.has('phantom'))){
      heard.current.add('phantom');
      onEvent?.('phantom');
    }
    const falseExitDistance=planarDistance(camera.position.x,camera.position.z,0,-18);
    if(shouldGlitchExit(falseExitDistance,heard.current.has('false-exit'))){
      heard.current.add('false-exit');
      onEvent?.('false-exit');
    }
    if(exitSign.current){
      // A failing EXIT sign flickers, but never moves the real exit.
      const jitter=falseExitDistance<13 && Math.sin(t*16.7)*Math.sin(t*5.3)>.63;
      exitSign.current.material.emissiveIntensity=jitter?.05:1.2;
    }
    camera.getWorldDirection(forward.current);
    const dx=SHADOW[0]-camera.position.x;
    const dz=SHADOW[1]-camera.position.z;
    const distance=Math.hypot(dx,dz);
    const dot=(dx*forward.current.x+dz*forward.current.z)/Math.max(.001,distance);
    const shadow=shadowVisibility(distance,dot);
    if(specterBody.current)specterBody.current.material.opacity=.8*shadow;
    if(specterHead.current)specterHead.current.material.opacity=.9*shadow;
  });
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
    {GHOSTS.map(([x,z,r],i)=><group key={i} position={[x,0,z]} rotation={[0,r,0]}>
      <mesh ref={node=>{ghostBodies.current[i]=node}} position={[0,.39,0]}>
        <boxGeometry args={[2.35,.75,4.25]}/>
        <meshStandardMaterial color="#0a0b10" transparent opacity={.2} roughness={1} depthWrite={false}/>
      </mesh>
      <mesh ref={node=>{ghostCabins.current[i]=node}} position={[0,1.0,-.1]} scale={[.85,.25,.85]}>
        <boxGeometry args={[2,1,3]}/>
        <meshStandardMaterial color="#520d22" transparent opacity={.18} emissive="#8d1d30" emissiveIntensity={.25} depthWrite={false}/>
      </mesh>
    </group>)}
    {/* Faked exit arrow pointing back at the player. */}
    <group position={[0,2.7,-18]}>
      <mesh ref={exitSign}><boxGeometry args={[5.2,.8,.19]}/><meshStandardMaterial color="#3b1b25" emissive="#4c0819" emissiveIntensity={1.2}/></mesh>
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
      <mesh ref={specterBody} position={[0,1.52,0]} scale={[.24,1.36,.18]}>
        <sphereGeometry args={[1,8,12]}/>
        <meshStandardMaterial color="#030507" transparent opacity={.8}/>
      </mesh>
      <mesh ref={specterHead} position={[0,2.56,0]} scale={[.18,.28,.17]}>
        <sphereGeometry args={[1,10,10]}/>
        <meshStandardMaterial color="#040708" transparent opacity={.9} roughness={1}/>
      </mesh>
    </group>
  </group>;
}
