import React, { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { gateBlocksPlayer } from './puzzle.js';
import { crouchReaction } from './stealth.js';
import { breathHearingRadius } from './survival.js';
import ListenerModel from './ListenerModel.jsx';
import {SAFE_METAL_HEARING_RADIUS} from './stageOneRules.js';
import { PILLARS,PARKED_CARS,terrainBlockedRadius,LISTENER_COLLISION_RADIUS } from './garageLayout.js';
import {sweepMove,segmentCrossesSolid} from './movementCollision.js';
import { SIREN_HEARING_RADIUS,RUSH_SECONDS,rushSpeed,LISTENER_REACTION_SECONDS } from './alarmRules.js';
import { CAR_ALARM_HEARING_RADIUS } from './vehiclePuzzle.js';
import {buildRoute} from './navigationGrid.js';
import {buildB2Route} from './b2Blockout.js';
import {passesParkedCar} from './chaseAudioRules.js';
import {canListenerCatch,reachableSoundTarget,shouldReplanOnStall} from './listenerContactRules.js';
import {
  FIRST_GUARD_HOME,FIRST_GUARD_PATROL,FIRST_GUARD_WALK_SPEED,
  FIRST_GUARD_ROUTE_REPLAN_SECONDS,FIRST_GUARD_LISTEN_SECONDS,
  FIRST_GUARD_STUCK_SECONDS,nextFirstGuardWaypoint,chooseClearStep
} from './firstFloorThreat.js';

// Loop 01 actively guards the breaker instead of standing 34m across the map.
// Loop 02 retains its established spawn and the Observer's separate role.
const BASE = new THREE.Vector3(FIRST_GUARD_HOME[0],0,FIRST_GUARD_HOME[1]);
const LOOP_BASE = new THREE.Vector3(-14,0,-7);
const PATROL = FIRST_GUARD_PATROL.map(([x,z])=>new THREE.Vector3(x,0,z));
const CARS=PARKED_CARS;
const obstructed=(x,z,powered=false,shortcutOpen=false)=>
  terrainBlockedRadius(x,z,LISTENER_COLLISION_RADIUS,powered,shortcutOpen);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

// Approximate sound obstruction by columns and cars, without a physics dependency.
// This affects only how the human PLAYER hears the creature, not the AI hearing logic.
function lineCrossesBox(from,to,cx,cz,halfX,halfZ){
 // Axis-aligned segment clipping without creating the old temporary 2D
 // slab arrays 20 times/sec for every car and concrete column.
 const dx=to.x-from.x,dz=to.z-from.z;
 let enter=0,exit=1;
 if(Math.abs(dx)<1e-6){
   if(from.x<cx-halfX||from.x>cx+halfX)return false;
 }else{
   const tx1=(cx-halfX-from.x)/dx,tx2=(cx+halfX-from.x)/dx;
   enter=Math.max(enter,Math.min(tx1,tx2));
   exit=Math.min(exit,Math.max(tx1,tx2));
   if(enter>exit)return false;
 }
 if(Math.abs(dz)<1e-6){
   if(from.z<cz-halfZ||from.z>cz+halfZ)return false;
 }else{
   const tz1=(cz-halfZ-from.z)/dz,tz2=(cz+halfZ-from.z)/dz;
   enter=Math.max(enter,Math.min(tz1,tz2));
   exit=Math.min(exit,Math.max(tz1,tz2));
   if(enter>exit)return false;
 }
 return exit>.03&&enter<.97;
}
function blockedToListener(creature,viewer){
  return PILLARS.some(([x,z])=>lineCrossesBox(creature,viewer,x,z,.85,.85))
    || CARS.some(([x,z])=>lineCrossesBox(creature,viewer,x,z,1.45,2.4));
}

// Hearing-only finite-state machine. It never reads the player's location to select a target:
// only explicit sound events provide destinations. Player position is checked for contact.
function Listener({active,events,playerRef,onCaught,onState,onSpatial,powered=false,shortcutOpen=false,shutterOpen=false,floor=1,levelSignal=0,deathPhase='alive'}) {
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
  const patrolIndex=useRef(1);
  const watchTime=useRef(0);
  const stuckTime=useRef(0);
  const lastGoalDistance=useRef(Infinity);
  const noProgressTime=useRef(0);
  const soundClock=useRef(0);
  const rushTime=useRef(0);
  const reactionTime=useRef(0);
  const listenerLocation=useRef(new THREE.Vector3());
  const listenerDirection=useRef(new THREE.Vector3());
  const modelMotion=useRef({state:'idle',speed:0,excitement:0});
  useEffect(()=>{
    if(group.current)group.current.position.copy(home);
    state.current=floor===1?'patrol':'idle';
    target.current.copy(home);
    patrolIndex.current=1;
    watchTime.current=0;stuckTime.current=0;
    lastGoalDistance.current=Infinity;noProgressTime.current=0;
    searchTime.current=0;
    cooldown.current=0;
    excitement.current=0;
    currentSpeed.current=1.2;
    rushTime.current=0;reactionTime.current=0;
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
      patrolIndex.current=1;
      watchTime.current=0;stuckTime.current=0;
      lastGoalDistance.current=Infinity;noProgressTime.current=0;
      excitement.current=0;currentSpeed.current=1.2;rushTime.current=0;reactionTime.current=0;
      modelMotion.current={state:'idle',speed:0,excitement:0};
      lastEvent.current=events.current.length?events.current[events.current.length-1].id:0;
      soundClock.current-=dt;
      if(soundClock.current<=0){onSpatial?.({active:false});soundClock.current=.18;}
      return;
    }
    cooldown.current=Math.max(0,cooldown.current-dt);
    if(floor===1&&state.current==='idle'){
      state.current='patrol';routeTime.current=0;
    }
    if(state.current==='watch'){
      watchTime.current=Math.max(0,watchTime.current-dt);
      if(watchTime.current===0){
        state.current='patrol';
        routeTime.current=0;
      }
    }
    // The log is capped at 32 entries. Iterate it in-place to avoid creating
    // a new filtered array every single renderer frame.
    const log=events.current;
    let newest=lastEvent.current;
    let heardSomething=false;
    for(let i=0;i<log.length;i++){
      const event=log[i];
      if(event.id<=newest)continue;
      if(!['step','jump','land','throw','horn','safe','switch','power','breath','decoy','gear','siren','item','flashlight','car-alarm','cctv','vehicle','key-insert','gate-motor'].includes(event.type))continue;
      const point=new THREE.Vector3(event.position[0],0,event.position[2]);
      const softStep=event.type==='step' && event.mode==='crouch';
      const distanceToSound=dist(pos,point); // Physical hearing still tests actual sound.
      const reachable=reachableSoundTarget(event.position,event.type,floor);
      if(reachable?.source==='breaker-face'){
        // The electronic alarm originates inside the solid cabinet but the
        // accessible face (+Z) is where a real person can operate it.
        point.set(reachable.x,0,reachable.z);
      }
      const reaction=event.type==='siren'||event.type==='car-alarm'
        ? (distanceToSound<=(event.type==='siren'?SIREN_HEARING_RADIUS:CAR_ALARM_HEARING_RADIUS)?'investigate':'none')
        : event.type==='safe'
           ?(distanceToSound<=SAFE_METAL_HEARING_RADIUS?'investigate':'none')
           : event.type==='breath'
          ? (distanceToSound<=breathHearingRadius(event.loudness)
            ? (distanceToSound<=1.7?'investigate':'listen')
            : 'none')
          : softStep ? crouchReaction(distanceToSound, excitement.current, event.loudness)
            : (distanceToSound <= (event.type==='horn'?44:Math.max(1.4,event.loudness*.28)) ? 'investigate' : 'none');
      if(reaction!=='none'){
        if(event.type==='siren'){
          rushTime.current=RUSH_SECONDS;
          reactionTime.current=LISTENER_REACTION_SECONDS;
        }
        if(event.type==='car-alarm')rushTime.current=Math.max(rushTime.current,5.8);
        target.current.copy(point); // Only sound-event position, never player tracking.
        state.current=reaction==='listen'?'listen':'investigate';
        searchTime.current=0;
        routeTime.current=0;
        lastGoalDistance.current=Infinity;noProgressTime.current=0;
        excitement.current=Math.min(100,Math.max(excitement.current,
          reaction==='listen'?Math.min(25,12+(event.loudness||8)):event.loudness || 0));
        heardSomething=true;
      }
    }
    if(log.length)lastEvent.current=log[log.length-1].id;
    // Loud noises produce fast investigations. The excitement fades gradually in silence,
    // even if the creature reaches the location it last heard.
    if(!heardSomething){
      excitement.current=Math.max(0,excitement.current-dt*(state.current==='investigate'?9:14));
    }
    rushTime.current=Math.max(0,rushTime.current-dt);
    reactionTime.current=Math.max(0,reactionTime.current-dt);
    const targetSpeed=reactionTime.current>0?0:state.current==='investigate'
      ?rushSpeed(rushTime.current,excitement.current,floor)
      :state.current==='patrol'?FIRST_GUARD_WALK_SPEED:
        state.current==='return'?1.45:state.current==='search'?.6:0;
    currentSpeed.current=THREE.MathUtils.damp(currentSpeed.current,targetSpeed,
      state.current==='investigate'&&rushTime.current>0?9:state.current==='investigate'?2.8:1.25,dt);
    const destination=state.current==='patrol'?PATROL[patrolIndex.current]:
      (state.current==='idle'||state.current==='return')?home:target.current;
    if(state.current==='investigate'||state.current==='return'||state.current==='patrol'){
      routeTime.current-=dt;
      if(routeTime.current<=0){
        route.current=floor===1 ? buildB2Route(pos,destination,{shortcutOpen,shutterOpen}) : buildRoute(pos,destination,powered,shortcutOpen);
        // Cached occupancy eliminates recurring grid collision checks; avoid
        // repathing every second unless a new noise resets routeTime to zero.
        routeTime.current=state.current==='patrol'?FIRST_GUARD_ROUTE_REPLAN_SECONDS:2.3;
      }
    }else{
      // Neither listening nor searching needs a full-map BFS every frame.
      route.current=[];
      routeTime.current=0;
    }
    while(route.current.length&&dist(pos,route.current[0])<.65){
      route.current.shift();
      lastGoalDistance.current=Infinity;noProgressTime.current=0;
    }
    const waypoint=route.current.length?route.current[0]:destination;
    const range=dist(pos,waypoint);
    const goalRange=dist(pos,destination);
    if(range>.6&&(state.current==='investigate'||state.current==='return'||state.current==='patrol')){
      const speed=currentSpeed.current;
      const dx=(waypoint.x-pos.x)/range*dt*speed;
      const dz=(waypoint.z-pos.z)/range*dt*speed;
      const [stepX,stepZ]=chooseClearStep(pos.x,pos.z,dx,dz,
        (x,z)=>obstructed(x,z,powered,shortcutOpen));
      // Sweep the entire physical creature footprint, preventing 3D body
      // phasing through concrete, parked cars, gate or breaker at high speed.
      const moved=sweepMove(pos.x,pos.z,stepX,stepZ,LISTENER_COLLISION_RADIUS,powered,shortcutOpen);
      pos.x=moved.x;pos.z=moved.z;
      // If the obstacle-grid path is stale, recalculate to a FREE cell
      // instead of endlessly leaning into a car, column or breaker cabinet.
      if(moved.moved<.0002){
        stuckTime.current+=dt;
        if(stuckTime.current>=FIRST_GUARD_STUCK_SECONDS){
          route.current=[];routeTime.current=0;stuckTime.current=0;
        }
      }else stuckTime.current=0;
      // Tangent steps can keep moving yet orbit the same blocked object.
      // Detect lack of progress toward the CURRENT waypoint, not just
      // zero displacement. Replan to the last HEARD location only.
      const remaining=dist(pos,waypoint);
      if(!Number.isFinite(lastGoalDistance.current)||
         remaining<lastGoalDistance.current-.14){
        lastGoalDistance.current=remaining;
        noProgressTime.current=0;
      }else{
        noProgressTime.current+=dt;
        if(shouldReplanOnStall(lastGoalDistance.current,remaining,noProgressTime.current)){
          route.current=[];routeTime.current=0;
          lastGoalDistance.current=Infinity;noProgressTime.current=0;
        }
      }
      group.current.rotation.y=Math.atan2(waypoint.x-pos.x,waypoint.z-pos.z);
    }
    if(goalRange<1.15&&state.current==='investigate'){state.current='search';searchTime.current=0;}
    else if(goalRange<1.15&&state.current==='return'){
      state.current=floor===1?'patrol':'idle';
      patrolIndex.current=1;
      route.current=[];routeTime.current=0;
    }else if(state.current==='patrol'){
      const next=nextFirstGuardWaypoint(patrolIndex.current,pos);
      if(next!==patrolIndex.current){
        patrolIndex.current=next;
        route.current=[];routeTime.current=0;
        // The guard listens instead of endlessly circling the only switch.
        // Noise still interrupts this pause and initiates a real investigation.
        if(floor===1){
          watchTime.current=FIRST_GUARD_LISTEN_SECONDS;
          state.current='watch';
        }
      }
    }
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
    if(player&&cooldown.current===0&&
       canListenerCatch(pos,player,(x,z)=>terrainBlockedRadius(x,z,0,powered,shortcutOpen))&&
       !segmentCrossesSolid(pos,player,powered,.15,shortcutOpen)){
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
        nearCar:passesParkedCar(pos.x,pos.z,CARS),
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
      onState(state.current,Math.round(excitement.current),Math.round(currentSpeed.current*10)/10, playerRef.current ? dist(pos,playerRef.current):Infinity);
    }
  });
  return <group ref={group} position={BASE.toArray()}>
    <ListenerModel motionRef={modelMotion}/>
  </group>;
}

export default React.memo(Listener);
