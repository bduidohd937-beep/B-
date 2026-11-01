import {advancePresence, PRESENCE_START_X, PRESENCE_DOOR_X} from './presence.js';

// No wallhack. The office and hallway are distinct spaces: only an exposed
// corridor player can be spotted. Door/lock protect the office regardless of
// distance. The room and corridor are currently a single straight axis.
export const SPEAKER_X=12.75;
export const SPEAKER_Z=1.5;
export const COVER={minX:7.55,maxX:8.50,minZ:2.05,maxZ:2.60};
export const ENEMY_CHASE_SPEED=2.28;
export const ENEMY_WALK_SPEED=1.12;
export const PLAYER_RUN_SPEED=3.55;

export function createResponse() {
  return {locked:false, speakerCooldown:0, speakerPulse:0, heardPulse:0, lastNoise:0, reportedReady:true};
}
export function canLockDoor(door) {
  return door.phase==='closed' && Math.abs(door.angle)<.08;
}
export function toggleSecurityLock(response,door) {
  if (!response.locked && !canLockDoor(door)) return false;
  response.locked=!response.locked;
  return true;
}
export function activateSpeaker(response) {
  if(response.speakerCooldown>0)return false;
  response.speakerPulse++;
  response.reportedReady=false;
  response.speakerCooldown=16;
  return true;
}
export function inHall(player) {
  return Boolean(player && player.x>=3.56 && player.x<=14.08 &&
    player.z>=.62 && player.z<=2.69);
}
export function concealed(player,crouching,creature) {
  return Boolean(crouching && player && creature?.x>9.45 && player.x>=COVER.minX &&
    player.x<=COVER.maxX && player.z>=COVER.minZ && player.z<=COVER.maxZ);
}
export function canSeePlayer(p,player,opts={}) {
  if(!inHall(player) || concealed(player,opts.crouching,p)) return false;
  const d=Math.hypot(p.x-player.x,p.z-player.z);
  // Presence must face the target. A player who is directly beside it can
  // still be spotted, but it never sees through the closed office wall.
  const facing = p.phase==='withdraw'||p.phase==='divert' ? player.x>=p.x : player.x<=p.x;
  return d<=1.7 || (d<=5.4 && facing);
}
function stepEvent(p,oldX,events){
  const travel=Math.abs(p.x-oldX);
  p.distanceSinceStep+=travel;
  if(p.distanceSinceStep>=.79){
    p.distanceSinceStep-=.79;
    events.push({type:'step',x:p.x,z:p.z});
  }
}
function moveToward(p,target,speed,dt,events){
  const oldX=p.x;
  const dx=target-p.x;
  p.x+=Math.sign(dx)*Math.min(Math.abs(dx),speed*dt);
  stepEvent(p,oldX,events);
}
function enter(p,phase,events){
  if(p.phase===phase)return;
  p.phase=phase;
  p.t=0;
  events.push({type:'phase',phase,x:p.x,z:p.z});
}
export function advanceEncounter(p,seconds,options={}) {
  const dt=Math.min(Math.max(seconds||0,0),.05),events=[];
  const response=options.response;
  if(response) response.speakerCooldown=Math.max(0,response.speakerCooldown-dt);
  if(p.phase==='dormant'||p.phase==='departed'||p.phase==='caught')return events;
  const player=options.player;
  const seen=canSeePlayer(p,player,options);
  // A real, positioned speaker sound has higher priority except when the
  // creature already has line of sight within arm's reach.
  if(response && response.speakerPulse!==response.heardPulse){
    response.heardPulse=response.speakerPulse;
    events.push({type:'speaker',x:SPEAKER_X,z:SPEAKER_Z});
    if(p.phase!=='watch' && (!seen || Math.hypot(p.x-player.x,p.z-player.z)>2.0)){
      p.targetX=SPEAKER_X;
      enter(p,'divert',events);
    }
  }
  const noise=options.noise;
  if(noise && response && noise.seq!==response.lastNoise){
    response.lastNoise=noise.seq;
    const d=Math.hypot(p.x-noise.x,p.z-noise.z);
    if(d<=noise.range && p.phase!=='divert' && p.phase!=='chase'){
      p.targetX=Math.max(PRESENCE_DOOR_X,Math.min(PRESENCE_START_X,noise.x));
      enter(p,'investigate',events);
    }
  }
  if(seen && p.phase!=='watch' && p.phase!=='chase' && p.phase!=='divert'){
    p.lastSeenX=player.x;
    enter(p,'chase',events);
    events.push({type:'alert',x:p.x,z:p.z});
  }
  if(p.phase==='chase'){
    p.t+=dt;
    if(!seen){
      p.lostSight=(p.lostSight||0)+dt;
      if(p.lostSight>=.85){
        p.targetX=Math.max(PRESENCE_DOOR_X,Math.min(PRESENCE_START_X,p.lastSeenX||p.x));
        p.lostSight=0;
        enter(p,'search',events);
      }
    }else{
      p.lostSight=0;p.lastSeenX=player.x;
    }
    if(p.phase==='chase'){
      const x=player?player.x:p.x;
      // Never cross the door into the office. The threat can only seize
      // a player who remains outside the actual security-room threshold.
      const destination=Math.max(PRESENCE_DOOR_X,Math.min(PRESENCE_START_X,x));
      moveToward(p,destination,ENEMY_CHASE_SPEED,dt,events);
      if(seen && player && Math.hypot(p.x-player.x,p.z-player.z)<.65){
        enter(p,'caught',events);
        events.push({type:'caught',x:p.x,z:p.z});
      }
    }
  }else if(p.phase==='divert'){
    p.t+=dt;
    moveToward(p,SPEAKER_X,ENEMY_WALK_SPEED*1.32,dt,events);
    if(Math.abs(p.x-SPEAKER_X)<.03 && p.t>3.5)enter(p,'withdraw',events);
  }else if(p.phase==='investigate'||p.phase==='search'){
    p.t+=dt;
    const goal=Math.max(PRESENCE_DOOR_X,Math.min(PRESENCE_START_X,p.targetX??p.x));
    moveToward(p,goal,ENEMY_WALK_SPEED,dt,events);
    if(Math.abs(p.x-goal)<.05 && p.t>=3.4) enter(p,'withdraw',events);
  }else{
    events.push(...advancePresence(p,dt,{...options,
      doorClosed: options.doorClosed!==false
    }));
    // An unprotected player in the corridor can be noticed during approach
    // and withdrawal, not only after a scripted doorstep moment.
    if(canSeePlayer(p,player,options)&&p.phase!=='watch'&&p.phase!=='departed'){
      p.lastSeenX=player.x;
      enter(p,'chase',events);
      events.push({type:'alert',x:p.x,z:p.z});
    }
  }
  if(!p.glimpsed && player && inHall(player)
    && Math.hypot(player.x-p.x,player.z-p.z)<6.2){
    p.glimpsed=true;
    events.push({type:'glimpse',x:p.x,z:p.z});
  }
  return events;
}

export function resetResponseAfterCapture(response){
  // The CCTV evidence stays recorded; only encounter state resets.
  response.locked=false;
  response.speakerCooldown=0;
  response.speakerPulse=0;
  response.heardPulse=0;
  response.lastNoise=0;
  response.reportedReady=true;
}
