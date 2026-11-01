// First encounter is one physical actor with a deterministic, auditable route.
// It uses existing corridor geometry and deliberately provides no chase or death.
export const PRESENCE_START_X = 12.65;
export const PRESENCE_DOOR_X = 4.16;
export const PRESENCE_Z = 1.48;
export const PHASES = Object.freeze(['dormant','watch','approach','doorstep','withdraw','departed']);

export function createPresence() {
  return {phase:'dormant', x:PRESENCE_START_X, z:PRESENCE_Z, t:0,
    distanceSinceStep:0, handleTurn:0, revealed:false, glimpsed:false};
}

export function beginPresence(p) {
  if (p.phase!=='dormant') return false;
  p.phase='watch';p.x=PRESENCE_START_X;p.t=0;p.distanceSinceStep=0;
  p.handleTurn=0;p.revealed=true;
  return true;
}

// Advance in-place to avoid per-frame allocations. Return only physically
// grounded sound/visibility cues; no teleports, wall detection or fake pursuit.
export function advancePresence(p, seconds, opts = {}) {
  const events=[];
  if(p.phase==='dormant'||p.phase==='departed')return events;
  const dt=Math.min(Math.max(0,seconds),.05);
  const oldX=p.x, previous=p.phase;
  p.t+=dt;
  if(p.phase==='watch') {
    if(p.t>=4.5){p.phase='approach';p.t=0;}
  } else if(p.phase==='approach') {
    p.x=Math.max(PRESENCE_DOOR_X,p.x-dt*.93);
    if(p.x<=PRESENCE_DOOR_X){p.phase='doorstep';p.t=0;}
  } else if(p.phase==='doorstep') {
    p.handleTurn = opts.doorClosed === false ? 0 : Math.sin(Math.min(1,p.t/3.1)*Math.PI)**2;
    if(p.t>=3.1){p.phase='withdraw';p.t=0;p.handleTurn=0;}
  } else if(p.phase==='withdraw') {
    p.x=Math.min(PRESENCE_START_X,p.x+dt*1.28);
    if(p.x>=PRESENCE_START_X){p.phase='departed';p.t=0;}
  }
  const traveled=Math.abs(p.x-oldX);
  if(traveled>0) {
    p.distanceSinceStep+=traveled;
    if(p.distanceSinceStep >= .79){
      p.distanceSinceStep-=.79;
      events.push({type:'step',x:p.x,z:p.z});
    }
  }
  if(previous!==p.phase) {
    events.push({type:'phase',phase:p.phase,x:p.x,z:p.z});
    if(p.phase==='doorstep'&&opts.doorClosed!==false)events.push({type:'handle',x:3.18,z:1.04});
    if(p.phase==='withdraw')events.push({type:'leave',x:p.x,z:p.z});
  }
  const player=opts.player;
  if(!p.glimpsed && player && player.x>3.35 && player.x<8.6
    && Math.hypot(player.x-p.x,player.z-p.z)<6.2) {
    p.glimpsed=true;
    events.push({type:'glimpse',x:p.x,z:p.z});
  }
  return events;
}
