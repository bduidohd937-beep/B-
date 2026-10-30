import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { motionExposure,sightBlocked,tickObservation } from './observerRules.js';
import { gateBlocksPlayer } from './puzzle.js';

const HOME=new THREE.Vector3(-14,0,-6);
const PILLARS=Array.from({length:6},(_,i)=>-28+i*9).flatMap(z=>[-10,10].map(x=>[x,z]));
const CARS=[[-6,-20],[-6,-3],[-6,14],[6,-24],[6,-7],[6,11]];
function blocked(x,z,powered){
  return PILLARS.some(([a,b])=>Math.abs(x-a)<1.2&&Math.abs(z-b)<1.2)
    || CARS.some(([a,b])=>Math.abs(x-a)<1.85&&Math.abs(z-b)<2.8)
    || gateBlocksPlayer(x,z,powered);
}
function moveSafely(pos,target,speed,dt,powered){
  const dx=target.x-pos.x,dz=target.z-pos.z,range=Math.hypot(dx,dz);
  if(range<.35)return false;
  const mx=dx/range*speed*dt,mz=dz/range*speed*dt;
  for(const [sx,sz] of [[mx,mz],[-mz,mx],[mz,-mx],[mx,0],[0,mz]]){
    if(!blocked(pos.x+sx,pos.z+sz,powered)){
      pos.x+=sx;pos.z+=sz;
      return true;
    }
  }
  return false;
}
function Observer({active,floor,playerRef,powered=false,onCaught,onState}){
  const body=useRef(),head=useRef(),left=useRef(),right=useRef(),lens=useRef(),beam=useRef();
  const mode=useRef('scan'),suspicion=useRef(0),lost=useRef(0),search=useRef(0);
  const target=useRef(HOME.clone()),clock=useRef(0),statusClock=useRef(0);
  const activeRef=useRef(active);
  activeRef.current=active;
  useEffect(()=>{
    if(body.current)body.current.position.copy(HOME);
    mode.current='scan';suspicion.current=0;lost.current=0;search.current=0;
    target.current.copy(HOME);clock.current=0;
  },[floor]);
  useFrame((_,raw)=>{
    if(!body.current)return;
    const dt=Math.min(.06,raw);
    if(!active){return;}
    clock.current+=dt;
    const pos=body.current.position;
    const player=playerRef.current;
    if(!player)return;
    const dx=player.x-pos.x,dz=player.z-pos.z;
    const distance=Math.hypot(dx,dz);
    // In idle, a slow scanning beam provides a clear warning before a chase.
    if(mode.current==='scan'){
      body.current.rotation.y=Math.sin(clock.current*.72)*.69;
    }
    const angle=body.current.rotation.y;
    const dot=(dx*Math.sin(angle)+dz*Math.cos(angle))/Math.max(.001,distance);
    const inSight=distance<=19 && dot>.46 &&
      !sightBlocked(pos,player,PILLARS,CARS);
    const rate=motionExposure({
      distance,dot,speed:player.speed||0,blocked:!inSight,crouched:Boolean(player.crouched)
    });
    suspicion.current=tickObservation(suspicion.current,rate,dt);
    if(rate>0){
      // Only the last MOVING location becomes a target. Remaining still causes loss.
      target.current.set(player.x,0,player.z);
      lost.current=0;
      if(suspicion.current>=1){
        mode.current='chase';
      }else if(mode.current!=='chase')mode.current='alert';
    }else{
      lost.current+=dt;
      if(mode.current==='alert'&&suspicion.current<=.05)mode.current='scan';
    }

    if(mode.current==='chase'){
      if(lost.current>1.4){mode.current='search';search.current=0;}
      else{
        const walked=moveSafely(pos,target.current,3.35,dt,powered);
        if(walked)body.current.rotation.y=Math.atan2(target.current.x-pos.x,target.current.z-pos.z);
      }
    }else if(mode.current==='search'){
      search.current+=dt;
      body.current.rotation.y+=dt*.95;
      if(search.current>=3.2){mode.current='return';}
    }else if(mode.current==='return'){
      if(!moveSafely(pos,HOME,1.25,dt,powered)){mode.current='scan';}
      body.current.rotation.y=Math.atan2(HOME.x-pos.x,HOME.z-pos.z);
      if(Math.hypot(HOME.x-pos.x,HOME.z-pos.z)<.55){mode.current='scan';suspicion.current=0;}
    }else if(mode.current==='alert'){
      // Frozen while assessing the movement; don't teleport.
      body.current.rotation.y=THREE.MathUtils.damp(
        body.current.rotation.y,Math.atan2(target.current.x-pos.x,target.current.z-pos.z),1.8,dt
      );
    }
    if(distance<1.18){
      mode.current='attack';
      onCaught();
    }
    const status=mode.current;
    if(head.current){
      head.current.rotation.y=status==='scan'?Math.sin(clock.current*1.9)*.32:0;
      head.current.rotation.z=status==='alert'?Math.sin(clock.current*18)*.07:Math.sin(clock.current*2)*.025;
    }
    if(left.current)left.current.rotation.x=status==='chase'?Math.sin(clock.current*8)*.5:.08;
    if(right.current)right.current.rotation.x=status==='chase'?-Math.sin(clock.current*8)*.5:.08;
    if(lens.current){
      const color=status==='chase'||status==='attack'?'#ff3a51':
        status==='alert'?'#edb451':'#99a9bb';
      lens.current.color.set(color);
    }
    if(beam.current){
      beam.current.material.opacity=status==='chase'?.115:status==='alert'?.075:.027;
    }
    statusClock.current-=dt;
    if(statusClock.current<=0){
      onState?.(status,Math.round(suspicion.current*100),Math.round(distance*2)/2);
      statusClock.current=.16;
    }
  });
  return <group ref={body} position={[-14,0,-6]}>
    {/* An original industrial motion-observer silhouette, visually unlike the ear-headed Listener. */}
    <mesh position={[0,1.52,0]} rotation={[.17,0,0]} scale={[.36,.82,.3]}>
      <dodecahedronGeometry args={[1,0]}/>
      <meshStandardMaterial color="#404953" roughness={.86} metalness={.28}/>
    </mesh>
    <mesh position={[0,2.66,.14]} scale={[.4,.42,.29]}>
      <boxGeometry args={[1,1,1]}/>
      <meshStandardMaterial color="#252a31" metalness={.66} roughness={.53}/>
    </mesh>
    <group ref={head} position={[0,2.70,.43]}>
      <mesh position={[0,0,.09]}><boxGeometry args={[.52,.25,.13]}/><meshStandardMaterial color="#0d1116" metalness={.6}/></mesh>
      <mesh position={[0,0,.19]}><sphereGeometry args={[.115,14,12]}/><meshBasicMaterial ref={lens} color="#98aabe" toneMapped={false}/></mesh>
      <mesh position={[0,0,.255]}><ringGeometry args={[.14,.18,16]}/><meshBasicMaterial color="#9ca1a0"/></mesh>
    </group>
    {/* Angled angular arms, unlike the thin Listener limbs. */}
    {[-1,1].map(side=><group key={side} ref={side<0?left:right} position={[side*.44,2.12,.02]}>
      <mesh position={[side*.17,-.43,.07]} rotation={[0,0,-side*.25]}>
        <boxGeometry args={[.18,.92,.18]}/><meshStandardMaterial color="#4f5962" metalness={.3}/>
      </mesh>
      <mesh position={[side*.32,-1.17,.14]} rotation={[0,0,side*.13]}>
        <boxGeometry args={[.12,.80,.13]}/><meshStandardMaterial color="#262f35"/>
      </mesh>
      <mesh position={[side*.32,-1.62,.17]}><boxGeometry args={[.21,.25,.18]}/><meshStandardMaterial color="#66787b"/></mesh>
    </group>)}
    {[-.20,.20].map((x,i)=><group key={x} position={[x,.90,0]}>
      <mesh position={[0,-.26,0]}><boxGeometry args={[.19,.79,.19]}/><meshStandardMaterial color="#3a434b"/></mesh>
      <mesh position={[0,-.76,.16]}><boxGeometry args={[.15,.58,.16]}/><meshStandardMaterial color="#59626a"/></mesh>
    </group>)}
    {/* Low-opacity cone is a visual tell, not a light or collision volume. */}
    <mesh ref={beam} position={[0,2.65,5.1]} rotation={[-Math.PI/2,0,0]}>
      <coneGeometry args={[5.1,10.2,16,1,true]}/>
      <meshBasicMaterial color="#a4bfd1" transparent opacity={.025} depthWrite={false} side={THREE.DoubleSide}/>
    </mesh>
    <pointLight position={[0,2.64,.6]} color="#a9bcca" intensity={.48} distance={6}/>
  </group>;
}
export default React.memo(Observer);
