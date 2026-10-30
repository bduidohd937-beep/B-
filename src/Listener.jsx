import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gateBlocksPlayer } from './puzzle.js';
import { crouchReaction } from './stealth.js';
import ListenerModel from './ListenerModel.jsx';

const BASE = new THREE.Vector3(-13, 0, -25);
const LOOP_BASE = new THREE.Vector3(9, 0, -24);
const PILLARS = Array.from({length:6},(_,i)=>-28+i*9).flatMap(z=>[-10,10].map(x=>[x,z]));
const CARS = [[-6,-20],[-6,-3],[-6,14],[6,-24],[6,-7],[6,11]];
const obstructed=(x,z,powered=false)=>PILLARS.some(([px,pz])=>Math.abs(x-px)<1.15&&Math.abs(z-pz)<1.15)
 || CARS.some(([cx,cz])=>Math.abs(x-cx)<1.8&&Math.abs(z-cz)<2.8)
 || gateBlocksPlayer(x,z,powered);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// Approximate sound obstruction by columns and cars, without a physics dependency.
// This affects only how the human PLAYER hears the creature, not the AI hearing logic.
function lineCrossesBox(from,to,cx,cz,halfX,halfZ){
  const dx=to.x-from.x,dz=to.z-from.z;
  let enter=0,exit=1;
  for(const [p,d,min,max] of [
    [from.x,dx,cx-halfX,cx+halfX],
    [from.z,dz,cz-halfZ,cz+halfZ]
  ]){
    if(Math.abs(d)<1e-6){
      if(p<min||p>max)return false;
    }else{
      const t1=(min-p)/d,t2=(max-p)/d;
      enter=Math.max(enter,Math.min(t1,t2));
      exit=Math.min(exit,Math.max(t1,t2));
      if(enter>exit)return false;
    }
  }
  return exit>.03 && enter<.97;
}
function blockedToListener(creature,viewer){
  return PILLARS.some(([x,z])=>lineCrossesBox(creature,viewer,x,z,.85,.85))
    || CARS.some(([x,z])=>lineCrossesBox(creature,viewer,x,z,1.45,2.4));
}

const STEP=2;
const cols=18,rows=42;
const toGrid=(x,z)=>[Math.max(0,Math.min(cols-1,Math.round((x+17)/STEP))),Math.max(0,Math.min(rows-1,Math.round((z+44)/STEP)))];
const toWorld=(gx,gz)=>[-17+gx*STEP,-44+gz*STEP];
const key=(x,z)=>x+z*cols;
function buildRoute(from,to,powered){
  const [sx,sz]=toGrid(from.x,from.z),[tx,tz]=toGrid(to.x,to.z);
  const start=key(sx,sz),goal=key(tx,tz);
  const q=[start],parents=new Map([[start,-1]]);
  for(let i=0;i<q.length;i++){
    const k=q[i];if(k===goal)break;
    const x=k%cols,z=Math.floor(k/cols);
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const nx=x+dx,nz=z+dz;
      if(nx<0||nz<0||nx>=cols||nz>=rows)continue;
      const id=key(nx,nz);if(parents.has(id))continue;
      const [wx,wz]=toWorld(nx,nz);
      if(obstructed(wx,wz,powered))continue;
      parents.set(id,k);q.push(id);
    }
  }
  if(!parents.has(goal))return [];
  const result=[];let current=goal;
  while(current!==start&&result.length<cols*rows){
    const gx=current%cols,gz=Math.floor(current/cols);
    const [x,z]=toWorld(gx,gz);result.push({x,z});
    current=parents.get(current);
  }
  return result.reverse();
}


// Hearing-only finite-state machine. It never reads the player's location to select a target:
// only explicit sound events provide destinations. Player position is checked for contact.
export default function Listener({active,events,playerRef,onCaught,onState,onSpatial,powered=false,floor=1,levelSignal=0,deathPhase='alive'}) {
  const {camera}=useThree();
  const home=floor===2?LOOP_BASE:BASE;
  const group=useRef(null);
  const lastEvent=useRef(0);
  const state=useRef('idle');
  const target=useRef(BASE.clone());
  const searchTime=useRef(0);
  const cooldown=useRef(0);
  const statusTime=useRef(0);
  const excitement=useRef(0);
  const currentSpeed=useRef(1.2);
  const route=useRef([]);
  const routeTime=useRef(0);
  const soundClock=useRef(0);
  const listenerLocation=useRef(new THREE.Vector3());
  const listenerDirection=useRef(new THREE.Vector3());
  const modelMotion=useRef({state:'idle',speed:0,excitement:0});
  useEffect(()=>{
    if(group.current)group.current.position.copy(home);
    state.current='idle';
    target.current.copy(home);
    searchTime.current=0;
    cooldown.current=0;
    excitement.current=0;
    currentSpeed.current=1.2;
    route.current=[];
    routeTime.current=0;
    modelMotion.current={state:'idle',speed:0,excitement:0};
    lastEvent.current=events.current.length?events.current[events.current.length-1].id:0;
  },[floor,levelSignal,events,home]);
  useFrame((_,rawDelta)=>{
    if(!group.current)return;
    const dt=Math.min(rawDelta,.06);
    const pos=group.current.position;
    if(!active){
      if(deathPhase==='dying'){
        // Remain at the point of capture, looking at the collapsing player.
        const player=playerRef.current;
        if(player)group.current.rotation.y=Math.atan2(player.x-pos.x,player.z-pos.z);
        modelMotion.current={state:'attack',speed:0,excitement:100};
        soundClock.current-=dt;
        if(soundClock.current<=0){onSpatial?.({active:false});soundClock.current=.18;}
        return;
      }
      state.current='idle';pos.copy(home);route.current=[];routeTime.current=0;
      excitement.current=0;currentSpeed.current=1.2;
      modelMotion.current={state:'idle',speed:0,excitement:0};
      lastEvent.current=events.current.length?events.current[events.current.length-1].id:0;
      soundClock.current-=dt;
      if(soundClock.current<=0){onSpatial?.({active:false});soundClock.current=.18;}
      return;
    }
    cooldown.current=Math.max(0,cooldown.current-dt);
    const recent=events.current.filter(e=>e.id>lastEvent.current);
    if(recent.length)lastEvent.current=recent[recent.length-1].id;
    let heardSomething=false;
    for(const event of recent){
      if(!['step','jump','land','throw','horn','switch','power'].includes(event.type))continue;
      const point=new THREE.Vector3(event.position[0],0,event.position[2]);
      const softStep=event.type==='step' && event.mode==='crouch';
      const distanceToSound=dist(pos,point);
      const reaction=softStep ? crouchReaction(distanceToSound, excitement.current, event.loudness)
        : (distanceToSound <= (event.type==='horn'?44:Math.max(1.4,event.loudness*.28)) ? 'investigate' : 'none');
      if(reaction!=='none'){
        target.current.copy(point); // Only sound-event position, never player tracking.
        state.current=reaction==='listen'?'listen':'investigate';
        searchTime.current=0;
        routeTime.current=0;
        excitement.current=Math.min(100,Math.max(excitement.current,
          reaction==='listen'?Math.min(25,12+(event.loudness||8)):event.loudness || 0));
        heardSomething=true;
      }
    }
    // Loud noises produce fast investigations. The excitement fades gradually in silence,
    // even if the creature reaches the location it last heard.
    if(!heardSomething){
      excitement.current=Math.max(0,excitement.current-dt*(state.current==='investigate'?9:14));
    }
    const targetSpeed=state.current==='investigate'
      ?1.2+4.5*excitement.current/100
      :state.current==='return'?1.45:state.current==='search'?.6:0;
    currentSpeed.current=THREE.MathUtils.damp(currentSpeed.current,targetSpeed,
      state.current==='investigate'?2.8:1.25,dt);
    const destination=(state.current==='idle'||state.current==='return')?home:target.current;
    routeTime.current-=dt;
    if(routeTime.current<=0){
      route.current=buildRoute(pos,destination,powered);
      routeTime.current=1;
    }
    while(route.current.length&&dist(pos,route.current[0])<.65)route.current.shift();
    const waypoint=route.current.length?route.current[0]:destination;
    const range=dist(pos,waypoint);
    const goalRange=dist(pos,destination);
    if(range>.6&&(state.current==='investigate'||state.current==='return')){
      const speed=currentSpeed.current;
      const dx=(waypoint.x-pos.x)/range*dt*speed;
      const dz=(waypoint.z-pos.z)/range*dt*speed;
      if(!obstructed(pos.x+dx,pos.z+dz,powered)){pos.x+=dx;pos.z+=dz;}
      else {
        // Steer around parked cars and columns without passing through them.
        const side=state.current==='investigate'?-1:1;
        const sx=-dz*side,sz=dx*side;
        if(!obstructed(pos.x+sx,pos.z+sz,powered)){pos.x+=sx;pos.z+=sz;}
        else if(!obstructed(pos.x+dx,pos.z,powered)){pos.x+=dx;}
        else if(!obstructed(pos.x,pos.z+dz,powered)){pos.z+=dz;}
      }
      group.current.rotation.y=Math.atan2(destination.x-pos.x,destination.z-pos.z);
    }
    if(goalRange<1.15&&state.current==='investigate'){state.current='search';searchTime.current=0;}
    else if(goalRange<1.15&&state.current==='return'){state.current='idle';}
    if(state.current==='search'){
      searchTime.current+=dt;
      group.current.rotation.y+=dt*.6;
      if(searchTime.current>4.5){state.current='return';}
    }
    if(state.current==='listen'){
      // Stand still and rotate toward last-heard sound rather than sliding closer.
      // Moving away silently remains a viable option.
      const facing=Math.atan2(target.current.x-pos.x,target.current.z-pos.z);
      group.current.rotation.y=THREE.MathUtils.damp(group.current.rotation.y,facing,5.8,dt);
      searchTime.current+=dt;
      if(searchTime.current>1.6){state.current='return';}
    }
    const player=playerRef.current;
    let capturedNow=false;
    if(player&&cooldown.current===0&&dist(pos,player)<1.28){
      cooldown.current=4;
      state.current='return';target.current.copy(home);
      capturedNow=true;
      group.current.rotation.y=Math.atan2(player.x-pos.x,player.z-pos.z);
      modelMotion.current={state:'attack',speed:0,excitement:100};
      onCaught();
    }
    // Audio follows the camera and creature about 20 times a second.
    soundClock.current-=dt;
    if(soundClock.current<=0){
      camera.getWorldPosition(listenerLocation.current);
      camera.getWorldDirection(listenerDirection.current);
      const viewer=listenerLocation.current;
      onSpatial?.({
        active:true,
        listenerPosition:[viewer.x,viewer.y,viewer.z],
        forward:listenerDirection.current.toArray(),
        creaturePosition:[pos.x,1.3,pos.z],
        occluded:blockedToListener(pos,viewer),
        state:state.current,
        speed:currentSpeed.current,
        excitement:excitement.current
      });
      soundClock.current=.05;
    }
    if(!capturedNow){
      modelMotion.current={state:state.current,speed:currentSpeed.current,excitement:excitement.current};
    }
    statusTime.current+=dt;
    if(statusTime.current>.3){
      statusTime.current=0;
      onState(state.current,Math.round(excitement.current),Math.round(currentSpeed.current*10)/10);
    }
  });
  return <group ref={group} position={[-13,0,-25]}>
    <ListenerModel motionRef={modelMotion}/>
  </group>;
}
