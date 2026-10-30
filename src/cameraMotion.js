import { STRIDE_METERS } from './stealth.js';

// PointerLockControls owns camera rotation. Euler Z roll changes the mouse
// look axes and can turn a tiny head-bob into a spinning tilted view.
// Only vertical motion during actual grounded sprinting is permitted.
export function cameraMotion({mode='idle',distanceIntoStep=0,moving=false,grounded=true,
 intensity=.45,reducedEffects=false}={}){
  if(mode!=='sprint'||!moving||!grounded||reducedEffects||intensity<=0){
    return {rise:0};
  }
  const stride=STRIDE_METERS.sprint;
  const distance=Math.min(stride,Math.max(0,Number.isFinite(distanceIntoStep)?distanceIntoStep:0));
  const phase=(distance/stride)*Math.PI*2;
  const scale=Math.min(1,Math.max(0,intensity));
  // Returns to the level camera at every footfall boundary; no rotational roll.
  return {rise:phase>=Math.PI*2?0:Math.max(0,Math.sin(phase/2))*.042*scale};
}
