import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BASE = new THREE.Vector3(-13, 0, -25);
const PILLARS = Array.from({length:6},(_,i)=>-28+i*9).flatMap(z=>[-10,10].map(x=>[x,z]));
const CARS = [[-6,-20],[-6,-3],[-6,14],[6,-24],[6,-7],[6,11]];
const obstructed=(x,z)=>PILLARS.some(([px,pz])=>Math.abs(x-px)<1.15&&Math.abs(z-pz)<1.15)
 || CARS.some(([cx,cz])=>Math.abs(x-cx)<1.8&&Math.abs(z-cz)<2.8);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// Hearing-only finite-state machine. It never reads the player's location to select a target:
// only explicit sound events provide destinations. Player position is checked for contact.
export default function Listener({active,events,playerRef,onCaught,onState}) {
  const group=useRef(null);
  const lastEvent=useRef(0);
  const state=useRef('idle');
  const target=useRef(BASE.clone());
  const searchTime=useRef(0);
  const cooldown=useRef(0);
  const statusTime=useRef(0);
  useFrame((_,rawDelta)=>{
    if(!group.current)return;
    const dt=Math.min(rawDelta,.06);
    const pos=group.current.position;
    if(!active){state.current='idle';pos.copy(BASE);lastEvent.current=events.current.length?events.current[events.current.length-1].id:0;return;}
    cooldown.current=Math.max(0,cooldown.current-dt);
    const recent=events.current.filter(e=>e.id>lastEvent.current);
    if(recent.length)lastEvent.current=recent[recent.length-1].id;
    for(const event of recent){
      if(!['step','jump','land','throw','horn'].includes(event.type))continue;
      const point=new THREE.Vector3(event.position[0],0,event.position[2]);
      const hearingRadius=event.type==='horn'?44:Math.max(1.4,event.loudness*.28);
      // A pillar/car blocks the direct path but only attenuates the sound.
      if(dist(pos,point)<=hearingRadius){
        target.current.copy(point);
        state.current='investigate';
        searchTime.current=0;
      }
    }
    const destination=(state.current==='idle'||state.current==='return')?BASE:target.current;
    const range=dist(pos,destination);
    if(range>.6){
      const speed=state.current==='investigate'?2.9:1.4;
      const dx=(destination.x-pos.x)/range*dt*speed;
      const dz=(destination.z-pos.z)/range*dt*speed;
      if(!obstructed(pos.x+dx,pos.z+dz)){pos.x+=dx;pos.z+=dz;}
      else {
        // Steer around parked cars and columns without passing through them.
        const side=state.current==='investigate'?-1:1;
        const sx=-dz*side,sz=dx*side;
        if(!obstructed(pos.x+sx,pos.z+sz)){pos.x+=sx;pos.z+=sz;}
        else if(!obstructed(pos.x+dx,pos.z)){pos.x+=dx;}
        else if(!obstructed(pos.x,pos.z+dz)){pos.z+=dz;}
      }
      group.current.rotation.y=Math.atan2(destination.x-pos.x,destination.z-pos.z);
    } else if(state.current==='investigate'){state.current='search';searchTime.current=0;}
    else if(state.current==='return'&&dist(pos,BASE)<.7){state.current='idle';}
    if(state.current==='search'){
      searchTime.current+=dt;
      group.current.rotation.y+=dt*.6;
      if(searchTime.current>4.5){state.current='return';}
    }
    const player=playerRef.current;
    if(player&&cooldown.current===0&&dist(pos,player)<1.28){
      cooldown.current=4;
      state.current='return';target.current.copy(BASE);
      onCaught();
    }
    statusTime.current+=dt;
    if(statusTime.current>.3){statusTime.current=0;onState(state.current);}
  });
  return <group ref={group} position={[-13,0,-25]}>
    <mesh position={[0,.82,0]} rotation={[.13,0,-.12]}>
      <capsuleGeometry args={[.37,.7,5,10]}/>
      <meshStandardMaterial color="#111515" roughness={1}/>
    </mesh>
    <mesh position={[0,1.57,.1]} scale={[1.05,.7,1]}>
      <sphereGeometry args={[.32,14,12]}/>
      <meshStandardMaterial color="#181e1d" roughness={.9}/>
    </mesh>
    {[-.39,.39].map(x=><group key={x}>
      <mesh position={[x,1.59,.15]} rotation={[0,0,x*-.4]}>
        <sphereGeometry args={[.19,10,10]}/>
        <meshStandardMaterial color="#373f3b" roughness={.95}/>
      </mesh>
      <mesh position={[x*.42,.33,0]} rotation={[0,0,x*.3]}>
        <capsuleGeometry args={[.12,.5,4,8]}/>
        <meshStandardMaterial color="#0d1010"/>
      </mesh>
      <mesh position={[x*1.45,.97,.05]} rotation={[0,0,x*.4]}>
        <capsuleGeometry args={[.1,.95,4,8]}/>
        <meshStandardMaterial color="#111413"/>
      </mesh>
    </group>)}
  </group>;
}
