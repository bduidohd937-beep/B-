// Separate gameplay-noise rules from audio loudness; 0..100 is AI detection
// strength, not decibels or speaker volume. Unpowered alarm circuits are never
// silently disabled by a can of lubricant.
export const LUBRICATED_MECHANICAL_MULTIPLIER = 0.42;
export const DEFAULT_ITEM_SOUNDS = Object.freeze({
  can:{pickup:17,drop:31,use:25},
  alarm:{pickup:16,drop:30,use:28},
  radio:{pickup:14,drop:28,use:40},
  glow:{pickup:11,drop:15,use:12},
  energy:{pickup:14,drop:26,use:42},
  lube:{pickup:12,drop:22,use:23},
  battery:{pickup:13,drop:24,use:29}
});
export function itemActionNoise(type,action,{crouching=false}={}){
  const matrix=DEFAULT_ITEM_SOUNDS[type]||DEFAULT_ITEM_SOUNDS.can;
  const base=matrix[action]??0;
  // Manipulating an item crouched is less audible, not supernatural silence.
  const quiet=(action==='pickup'||action==='drop')&&crouching;
  return Math.max(1,Math.round(base*(quiet?.55:1)));
}
export function mechanicalNoise(base,lubricated=false){
  return Math.round(Math.max(0,Math.min(100,base))*
    (lubricated?LUBRICATED_MECHANICAL_MULTIPLIER:1));
}
export function gazeFocus(eye,forward,target,{radius=2.65,minDot=.79}={}){
  if(!eye||!forward||!target)return false;
  const dx=target[0]-eye[0],dy=target[1]-eye[1],dz=target[2]-eye[2];
  const distance=Math.hypot(dx,dy,dz);
  if(distance<.001||distance>radius)return false;
  const vectorLength=Math.hypot(forward[0],forward[1],forward[2]);
  if(vectorLength<.0001)return false;
  return (dx*forward[0]+dy*forward[1]+dz*forward[2])/(distance*vectorLength)>=minDot;
}
export function nearestLookedAtPickup(eye,forward,items,canPosition=null){
  // Focus slightly above floor geometry: the item itself is the target.
  const candidates=(items||[]).map(it=>({kind:'item',id:it.id,type:it.type,position:it.position}));
  if(canPosition)candidates.push({kind:'can',id:'reusable-can',type:'can',position:canPosition});
  return candidates.filter(candidate=>gazeFocus(eye,forward,[
    candidate.position[0],candidate.position[1]+.23,candidate.position[2]
  ])).sort((a,b)=>{
    const aD=Math.hypot(a.position[0]-eye[0],a.position[2]-eye[2]);
    const bD=Math.hypot(b.position[0]-eye[0],b.position[2]-eye[2]);
    return aD-bD;
  })[0]||null;
}
