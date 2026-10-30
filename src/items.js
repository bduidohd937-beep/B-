// Tactical gear is independent of the rendered UI.
export const INVENTORY_LIMIT=3;
export const ITEM_TYPES=Object.freeze({
  can:{label:'빈 캔',key:'CAN',description:'다시 주울 수 있는 짧은 유인 소음'},
  alarm:{label:'태엽 알람시계',key:'ALARM',description:'4초 후 8초간 큰 벨소리'},
  radio:{label:'잡음 무전기',key:'RADIO',description:'곧바로 9초간 반복 잡음'},
  glow:{label:'야광봉',key:'GLOW',description:'50초간 길 표시'},
  energy:{label:'에너지 드링크',key:'DRINK',description:'스태미나 회복 + 5초 질주 부스트'},
  lube:{label:'윤활 스프레이',key:'LUBE',description:'배전반 작동 소음 제거'}
});
const ITEMS=[
 ['alarm',[-1,.24,10]],['glow',[-15,.24,7]],['energy',[15,.24,14]],
 ['lube',[-15,.24,-15]],['radio',[15,.24,-1]]
];
const LOOP_ITEMS=[
 ['alarm',[1,.24,12]],['glow',[-14,.24,8]],['energy',[14,.24,11]],
 ['lube',[15,.24,-17]],['radio',[-15,.24,-9]]
];
export function startingPickups(floor=1){
 return (floor===2?LOOP_ITEMS:ITEMS).map(([type,position],i)=>({
  id:`floor-${floor}-${i}`,type,position:[...position]
 }));
}
export function slots(canHeld=false,gear=[]){
 return [...(canHeld?['can']:[]),...gear].slice(0,INVENTORY_LIMIT);
}
export function canAddToInventory(canHeld=false,gear=[]){
 return slots(canHeld,gear).length<INVENTORY_LIMIT;
}
export function selectSlot(index,canHeld=false,gear=[]){
 return slots(canHeld,gear)[index]??null;
}
export function pickupRadius(position,point,radius=2.3){
 return Math.hypot(position[0]-point[0],position[2]-point[2])<=radius;
}
export function itemEffect(type,nearPanel=false){
 if(type==='lube')return nearPanel?'silence':'requires-panel';
 if(type==='energy')return 'boost';
 if(['alarm','radio','glow'].includes(type))return 'deploy';
 return 'none';
}
export function gadgetTiming(type,seconds){
 if(type==='alarm')return {active:seconds>=4&&seconds<12,end:seconds>=12,interval:.68,loudness:94};
 if(type==='radio')return {active:seconds>=.9&&seconds<10,end:seconds>=10,interval:1.12,loudness:72};
 if(type==='glow')return {active:false,end:seconds>=50,interval:0,loudness:0};
 return {active:false,end:true,interval:0,loudness:0};
}
