import {gazeFocus} from './interactions.js';
import {gatePassable} from './exitAuthorization.js';

// Chapter 1 / Stage 01 vertical slice. Coordinates deliberately reuse the
// current garage rather than breaking the tested 0.12 collision grid.
export const STAGE_ONE_TERMINAL=Object.freeze([-18,1.65,11]);
export const STAGE_ONE_VEHICLE=Object.freeze([-34,1.15,-12.7]);
export const STAGE_ONE_SAFE=Object.freeze([-22,1.45,13.7]);
export const STAGE_ONE_SAFE_CENTER=Object.freeze([-22,13]);
export const STAGE_ONE_SAFE_STEPS=3;
export const SAFE_LATCH_HOLD_SECONDS=1.65;
const LOCATIONS=Object.freeze([
  {kind:'record',position:STAGE_ONE_TERMINAL},
  {kind:'vehicle',position:STAGE_ONE_VEHICLE},
  {kind:'safe',position:STAGE_ONE_SAFE}
]);
export function findStageOneInteraction(eye,look){
  if(!eye||!look)return null;
  return LOCATIONS.filter(o=>gazeFocus(eye,look,o.position,
    {radius:3.15,minDot:.64}))
    .sort((a,b)=>Math.hypot(a.position[0]-eye[0],a.position[2]-eye[2])-
      Math.hypot(b.position[0]-eye[0],b.position[2]-eye[2]))[0]||null;
}
export function freshStageOne(){
  return {record:false,vehicle:false,tumblers:0,key:false};
}
// Completed tumblers persist when the player retreats to avoid the Listener.
// No code brute-force and no invisible instant key: each physical press
// unlocks one mechanism AFTER both documentary clues are found.
export function applyStageOneAction(previous,kind){
  const current=previous||freshStageOne();
  if(kind==='record')return {state:{...current,record:true},event:'record',noise:17};
  if(kind==='vehicle'){
    if(!current.record)return {state:current,event:'need-record',noise:0};
    return {state:{...current,vehicle:true},event:'vehicle',noise:34};
  }
  if(kind==='safe'){
    if(!current.vehicle)return {state:current,event:'need-clue',noise:0};
    if(current.key)return {state:current,event:'already-open',noise:0};
    const tumblers=Math.min(STAGE_ONE_SAFE_STEPS,current.tumblers+1);
    const key=tumblers===STAGE_ONE_SAFE_STEPS;
    return {state:{...current,tumblers,key},
      event:key?'key':'tumbler',noise:68};
  }
  return {state:current,event:'invalid',noise:0};
}
export function stageOneObjective(state,power=false,gate=null){
  if(gatePassable(gate))return '비상 셔터가 열린다. 지금 나가야 한다.';
  if(!state?.record)return '경비 근무 기록을 확인하라.';
  if(!state?.vehicle)return '기록에 남은 317번 차량을 조사하라.';
  if(!state?.key)return '경비실 금고에서 비상 열쇠를 회수하라.';
  if(!power)return '비상 전원을 복구하라.';
  return '출입 단말기에 열쇠를 삽입하라.';
}
export function stageOneGateReady(state,power){
  return Boolean(state?.key&&power);
}
export function stageOneGateOpen(state,power,gate){
  return stageOneGateReady(state,power)&&gatePassable(gate);
}
