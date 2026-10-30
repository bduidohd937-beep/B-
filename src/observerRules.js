import { GATE_Z,GATE_HALF_OPENING } from './puzzle.js';
// Observer is distinct from the Listener: it reacts to visible movement,
// never to sound. Stopping and hiding behind solid obstacles both defeat sight.
export const OBSERVER_VIEW_DISTANCE=24;
export const OBSERVER_DOT_THRESHOLD=.32;
export const OBSERVER_LOSE_SIGHT_SECONDS=1.3;
export const OBSERVER_PURSUIT_SPEED=4.6;
export function motionExposure({distance,dot,speed,blocked=false,crouched=false}){
  if(blocked||distance>OBSERVER_VIEW_DISTANCE||dot<OBSERVER_DOT_THRESHOLD||speed<.16)return 0;
  // Visible, but not an instant death sentence: roughly one second of
  // walking or half a second of sprinting is needed for full acquisition.
  const close=1+Math.max(0,12-distance)*.055;
  const motion=speed>4?2.05:speed>2?1.18:.77;
  return (crouched?.48:1)*motion*close;
}
export function sightBlocked(from,to,pillars,cars,gatePowered=false){
  // Closed security divider blocks sight as well as movement.
  const dz=to.z-from.z;
  if(Math.abs(dz)>1e-8){
    const cross=(GATE_Z-from.z)/dz;
    if(cross>.025&&cross<.975){
      const crossX=from.x+(to.x-from.x)*cross;
      if(!gatePowered||Math.abs(crossX)>=GATE_HALF_OPENING)return true;
    }
  }
  const boxes=[...pillars.map(([x,z])=>[x,z,.87,.87]),...cars.map(([x,z])=>[x,z,1.5,2.5])];
  const dx=to.x-from.x;
  return boxes.some(([x,z,halfX,halfZ])=>{
    let enter=0,exit=1;
    for(const [p,d,min,max] of [[from.x,dx,x-halfX,x+halfX],[from.z,dz,z-halfZ,z+halfZ]]){
      if(Math.abs(d)<1e-7){if(p<min||p>max)return false;}
      else {
        const a=(min-p)/d,b=(max-p)/d;
        enter=Math.max(enter,Math.min(a,b));
        exit=Math.min(exit,Math.max(a,b));
        if(enter>exit)return false;
      }
    }
    return enter<=exit&&exit>.025&&enter<.975;
  });
}
export function tickObservation(suspicion,rate,dt){
  return Math.max(0,Math.min(1.25,suspicion+(rate>0?rate*dt:-.7*dt)));
}

export const OBSERVER_PATROL=Object.freeze([
 [14,-12],[14,-22],[18,-31],[15,-22],[14,-12],[18,-2]
]);
export function patrolWaypoint(index=0){
 return OBSERVER_PATROL[Math.abs(Math.floor(index))%OBSERVER_PATROL.length];
}
