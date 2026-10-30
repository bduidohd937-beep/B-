// Pure distance/angle rules for B2 illusions. These never alter collision or enemy AI.
export const PHANTOM_FADE_NEAR = 2.8;
export const PHANTOM_FADE_FAR = 8;
export const PHANTOM_CUE_RADIUS = 4.6;

export function planarDistance(x1,z1,x2,z2){
  return Math.hypot(x1-x2,z1-z2);
}
export function clamp01(value){
  return Math.max(0,Math.min(1,value));
}
export function phantomVisibility(distance){
  return clamp01((distance-PHANTOM_FADE_NEAR)/(PHANTOM_FADE_FAR-PHANTOM_FADE_NEAR));
}
export function shadowVisibility(distance, lookDot){
  // From behind this silhouette is visible; when directly observed it dissolves.
  const gaze=clamp01((0.77-lookDot)/0.28);
  const distanceFade=clamp01((distance-2)/5);
  return gaze*distanceFade;
}
export function shouldPlayPhantomCue(distance,alreadyPlayed=false){
  return !alreadyPlayed&&distance<=PHANTOM_CUE_RADIUS;
}
export function shouldGlitchExit(distance,alreadyPlayed=false){
  return !alreadyPlayed&&distance<10;
}
