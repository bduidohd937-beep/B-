import { GATE_Z } from './puzzle.js';

// Physically mounted keyed interlock on the RIGHT side of the service shutter.
export const SECURITY_KEY_READER=Object.freeze([4.25,1.45,GATE_Z+2.25]);
export const SECURITY_READER_RADIUS=2.3;
export const KEY_HOLD_SECONDS=3.25;
export const SHUTTER_RAISE_SECONDS=5.25;
export const SHUTTER_PASS_SECONDS=2.45;
// Brief high-volume siren; after starting, the player may leave and hide.
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
export function freshGateAuthentication(){
 return {phase:'locked',hold:0,elapsed:0};
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
     return {state:{phase:'open',hold:KEY_HOLD_SECONDS,elapsed:SHUTTER_RAISE_SECONDS},event:'open'};
   return {state:{...state,elapsed},event:null};
 }
 if(!hasKey||!near||!holding){
   return {state:freshGateAuthentication(),
      event:state.phase==='authenticating'?'cancel':null};
 }
 const hold=Math.min(KEY_HOLD_SECONDS,state.hold+seconds);
 if(hold>=KEY_HOLD_SECONDS){
   return {state:{phase:'opening',hold:KEY_HOLD_SECONDS,elapsed:0},event:'alarm'};
 }
 return {state:{phase:'authenticating',hold,elapsed:0},
   event:state.phase==='locked'?'insert':null};
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
