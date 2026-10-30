import { STRIDE_METERS } from './stealth.js';
// Footfall-aligned lean/bob. Returns camera visual offsets only; never changes
// player physics coordinates, sound-source location or mouse-look yaw/pitch.
export function cameraMotion({mode='idle',distanceIntoStep=0,moving=false,grounded=true,
 intensity=.45,reducedEffects=false}={}){
 if(!moving||!grounded||reducedEffects||intensity<=0)return {rise:0,roll:0};
 const stride=STRIDE_METERS[mode]||STRIDE_METERS.walk;
 const phase=(Math.min(stride,Math.max(0,distanceIntoStep))/stride)*Math.PI*2;
 const scale=Math.min(1,Math.max(0,intensity));
 const riseAmplitude=mode==='sprint'?.066:mode==='crouch'?.009:.022;
 const rollAmplitude=mode==='sprint'?.014:mode==='crouch'?.002:.004;
 // Both ends return to zero so each sound impact and visual step coincide.
 return {
  rise:phase>=Math.PI*2?0:Math.max(0,Math.sin(phase/2))*riseAmplitude*scale,
  roll:Math.sin(phase)*rollAmplitude*scale
 };
}
