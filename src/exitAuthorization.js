import { GATE_Z } from './puzzle.js';

// Physically mounted keyed interlock on the RIGHT side of the service shutter.
export const SECURITY_KEY_READER=Object.freeze([4.25,1.45,GATE_Z+2.25]);
export const SECURITY_READER_RADIUS=2.3;
export const KEY_HOLD_SECONDS=3.25;
export const SHUTTER_RAISE_SECONDS=5.25;
export const SHUTTER_PASS_SECONDS=2.45;
// Instant high-volume siren on FIRST key turn; the shutter motor starts only after the hold.
export const EXIT_ALARM_SECONDS=9;
export const EXIT_ALARM_LOUDNESS=100;

export const CCTV_MAX_DISTANCE=3.2;
export function canReadCctv(x,z,station){
 return Number.isFinite(x)&&Number.isFinite(z)&&Array.isArray(station)&&
   Math.hypot(x-station[0],z-station[2])<=CCTV_MAX_DISTANCE;
}
export function canUseKeyReader(x,z){
 return Number.isFinite(x)&&Number.isFinite(z)&&
   Math.hypot(x-SECURITY_KEY_READER[0],z-SECURITY_KEY_READER[2])<=SECURITY_READER_RADIUS;
}
// A real keyed reader faces +Z. Starting a turn requires looking at the
// lock on its front, but once inserted the player may watch for the Listener.
export const READER_FRONT_Z=.22;
export const READER_FACING_DOT=.67;
export function canHoldKeyReader(x,z){
 return canUseKeyReader(x,z)&&z>=SECURITY_KEY_READER[2]+READER_FRONT_Z
   &&Math.abs(x-SECURITY_KEY_READER[0])<=1.9;
}
export function canStartKeyReader(eye,look){
 if(!Array.isArray(eye)||!Array.isArray(look)||eye.length<3||look.length<3)return false;
 const [x,y,z]=eye;
 if(!canHoldKeyReader(x,z)||!Number.isFinite(y))return false;
 const [px,py,pz]=SECURITY_KEY_READER;
 const vx=px-x,vy=(py+.25)-y,vz=(pz+.36)-z;
 const len=Math.hypot(vx,vy,vz)*Math.hypot(look[0],look[1],look[2]);
 return len>.001&&Number.isFinite(len)&&
   (vx*look[0]+vy*look[1]+vz*look[2])/len>=READER_FACING_DOT;
}
export function freshGateAuthentication(){
 return {phase:'locked',hold:0,elapsed:0,alarmRaised:false};
}
export function advanceGateAuthentication(previous,{
 dt=0,active=true,hasKey=false,near=false,holding=false
}={}){
 const state=previous||freshGateAuthentication();
 if(!active)return {state,event:null};
 const seconds=Math.min(.075,Math.max(0,Number.isFinite(dt)?dt:0));
 if(state.phase==='open')return {state,event:null};
 if(state.phase==='opening'){
   const elapsed=Math.min(SHUTTER_RAISE_SECONDS,state.elapsed+seconds);
   if(elapsed>=SHUTTER_RAISE_SECONDS)
     return {state:{phase:'open',hold:KEY_HOLD_SECONDS,elapsed:SHUTTER_RAISE_SECONDS,alarmRaised:true},event:'open'};
   return {state:{...state,elapsed},event:null};
 }
 if(!hasKey||!near||!holding){
   // Losing the key hold cancels authentication but cannot silence an already
   // triggered industrial alarm. The player must retry the full hold.
   return {state:{phase:'locked',hold:0,elapsed:0,alarmRaised:Boolean(state.alarmRaised)},
      event:state.phase==='authenticating'?'cancel':null};
 }
 const hold=Math.min(KEY_HOLD_SECONDS,state.hold+seconds);
 if(hold>=KEY_HOLD_SECONDS){
   return {state:{phase:'opening',hold:KEY_HOLD_SECONDS,elapsed:0,alarmRaised:true},event:'motor'};
 }
 const firstInsertion=!state.alarmRaised;
 return {state:{phase:'authenticating',hold,elapsed:0,alarmRaised:true},
   event:firstInsertion?'alarm':state.phase==='locked'?'insert':null};
}
export function gatePassable(state){
 return Boolean(state&&(state.phase==='open'||
   state.phase==='opening'&&state.elapsed>=SHUTTER_PASS_SECONDS));
}
export function gateLiftRatio(state){
 if(!state)return 0;
 if(state.phase==='open')return 1;
 if(state.phase==='opening')return Math.max(0,Math.min(1,state.elapsed/SHUTTER_RAISE_SECONDS));
 return 0;
}
export function keyHoldProgress(state){
 return state?.phase==='authenticating'
  ?Math.max(0,Math.min(1,state.hold/KEY_HOLD_SECONDS)):
  state?.phase==='opening'||state?.phase==='open'?1:0;
}
