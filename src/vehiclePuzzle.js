import { gazeFocus } from './interactions.js';
import {gatePassable} from './exitAuthorization.js';

// Entirely fictional CCTV footage and parked vehicles, deterministic across
// respawns so clues can be learned rather than brute-forced by random spawns.
export const CCTV_STATION=Object.freeze([-18,1.6,11]);
export const CAMERA_LOG=Object.freeze({
 camera:'B2 / CAM-C',
 time:'03:17:17',
 bay:'C-17',
 detail:'푸른색 세단 · 번호 끝 두 자리 17 · 마지막 진입 기록 없음',
 discrepancy:'출입 기록 03:17:17 / 차량 등록 DB 조회 실패',
});
export const VEHICLES=Object.freeze([
 Object.freeze({
  id:'c17',plate:'317',color:'slate',correct:true,
  position:Object.freeze([-34,-16]),
  inspect:Object.freeze([-34,1.22,-12.7]),
  bay:'C-17'
 }),
 Object.freeze({
  id:'c13',plate:'371',color:'charcoal',correct:false,
  position:Object.freeze([-34,3]),
  inspect:Object.freeze([-34,1.22,6.3]),
  bay:'C-13'
 }),
 Object.freeze({
  id:'d09',plate:'713',color:'silver',correct:false,
  position:Object.freeze([34,-12]),
  inspect:Object.freeze([34,1.22,-8.7]),
  bay:'D-09'
 })
]);
export const CAR_ALARM_NOISE=98;
export const CAR_ALARM_HEARING_RADIUS=72;
export const CAR_ALARM_SECONDS=5.5;
export const CCTV_READ_NOISE=17;
export const CORRECT_TRUNK_NOISE=35;
export const VEHICLE_RADIUS=3.1;
export const VEHICLE_FOCUS=.65;

// No context-free magic E prompts: locate a *physical* model and look at it.
// Gaze is checked by the same pure geometry rule used for regular pickups.
export function findMysteryInteraction(eye,forward,{floor=2,solved=false}={}){
 if(floor!==2||!eye||!forward)return null;
 const objects=[
  {kind:'cctv',id:'station',position:CCTV_STATION},
  ...VEHICLES.filter(v=>!solved||v.correct).map(v=>({
    kind:'vehicle',id:v.id,position:v.inspect,plate:v.plate,bay:v.bay
  }))
 ];
 return objects.filter(o=>gazeFocus(eye,forward,o.position,
   {radius:VEHICLE_RADIUS,minDot:VEHICLE_FOCUS}))
  .sort((a,b)=>Math.hypot(...a.position.map((v,i)=>v-eye[i]))-
    Math.hypot(...b.position.map((v,i)=>v-eye[i])))[0]||null;
}
export function initialVehiclePuzzle(){
 return {reviewed:false,solved:false,mistakes:0,lastAlarmId:null};
}
export function examineVehicle(state,id){
 const previous=state||initialVehiclePuzzle();
 const car=VEHICLES.find(v=>v.id===id);
 if(!car)return {state:previous,outcome:'invalid',car:null};
 if(previous.solved)return {state:previous,outcome:'already-solved',car};
 if(!previous.reviewed)return {state:previous,outcome:'need-cctv',car};
 if(car.correct)return {
  state:{...previous,solved:true},outcome:'transponder',car
 };
 return {
  state:{...previous,mistakes:previous.mistakes+1,lastAlarmId:car.id},
  outcome:'alarm',car
 };
}
export function reviewCctv(state){
 return {...(state||initialVehiclePuzzle()),reviewed:true};
}
export function carObjective(state,authentication){
 if(!state?.reviewed)return '이번 B2의 방송 배전반은 반응하지 않는다. 경비용 CCTV 관제대를 찾아 기록을 확인하라.';
 if(!state?.solved)return 'CCTV 기록: C-17 / 파란 세단 / 번호 끝자리 17. 주차 차량의 번호판을 살펴라.';
 if(!authentication||authentication?.phase==='locked')return '317번 차량에서 출입키를 찾았다. 중앙 서비스 셔터 옆 보안 단말기에 키를 삽입하라.';
 if(authentication?.phase==='authenticating')return '키를 돌려 인증하는 중이다. E를 계속 누르고 있어야 한다.';
 if(authentication?.phase==='opening')return '비상 사이렌 작동! 셔터가 올라간다. 숨었다가 통과하라.';
 return '출입구가 열렸다. 청음자와 관조자를 피해 셔터를 통과하라.';
}
export function vehicleGateOpen(floor,firstPowered,state,authentication){
 return floor===2?Boolean(state?.solved)&&gatePassable(authentication):Boolean(firstPowered);
}
