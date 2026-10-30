// Observer is distinct from the Listener: it reacts to visible movement,
// never to sound. Stopping and hiding behind solid obstacles both defeat sight.
export const OBSERVER_VIEW_DISTANCE=19;
export const OBSERVER_DOT_THRESHOLD=.46;
export function motionExposure({distance,dot,speed,blocked=false,crouched=false}){
  if(blocked||distance>OBSERVER_VIEW_DISTANCE||dot<OBSERVER_DOT_THRESHOLD||speed<.16)return 0;
  const close=1+Math.max(0,11-distance)*.065;
  return (crouched?.45:1)*(speed>4?2.0:speed>2?1.22:.73)*close;
}
export function sightBlocked(from,to,pillars,cars){
  const boxes=[...pillars.map(([x,z])=>[x,z,.87,.87]),...cars.map(([x,z])=>[x,z,1.5,2.5])];
  const dx=to.x-from.x,dz=to.z-from.z;
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
