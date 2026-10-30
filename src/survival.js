// Balanced survival state machine; pure so frame-independent behavior is testable.
// Values are intentionally generous: the existing Listener is already demanding.
export const STAMINA_MAX = 100;
export const SPRINT_DRAIN_PER_SECOND = 12.5;  // Eight seconds at full stamina.
export const EXHAUSTION_SECONDS = 2.1;
export const RESUME_SPRINT_THRESHOLD = 18;

export function clamp(value,min=0,max=100){
  return Math.max(min,Math.min(max,value));
}
export function freshSurvival(){
  return { stamina:100, lockout:0, recentlyRan:0, running:false };
}
export function breathLoudness(stamina) {
  if(stamina <= 8) return 24;
  if(stamina <= 25) return Math.round(14+(25-stamina)*.55);
  if(stamina <= 39) return 10; // audible to player, not AI by itself
  return 0;
}
export function breathHearingRadius(loudness) {
  if(loudness < 14) return 0;
  return Math.min(4.6,2.4+(loudness-14)*.19);
}
export function heartIntensity(distance) {
  if (!Number.isFinite(distance)) return 0;
  return clamp((14-distance)/12,0,1);
}
export function tickSurvival(previous, {dt=0, wantsSprint=false, moving=false, crouching=false, airborne=false}={}){
  const old = previous || freshSurvival();
  const seconds=clamp(dt,0,.1);
  let {stamina,lockout,recentlyRan}=old;
  lockout=Math.max(0,lockout-seconds);
  recentlyRan=Math.max(0,recentlyRan-seconds);
  const canSprint=wantsSprint && moving && !crouching && !airborne &&
    lockout<=0 && stamina>0 && (Boolean(old.running) || stamina>=RESUME_SPRINT_THRESHOLD);
  if(canSprint){
    stamina=clamp(stamina- SPRINT_DRAIN_PER_SECOND*seconds);
    recentlyRan=.62;
    if(stamina<=0){lockout=EXHAUSTION_SECONDS;}
  } else if(recentlyRan<=0){
    // Recover while walking: 10/s; stationary: 21/s; crouching still: 25/s.
    const recovery=crouching ? (moving?16:25) : (moving?10:21);
    stamina=clamp(stamina+recovery*seconds);
  }
  const next={stamina,lockout,recentlyRan,running:canSprint};
  return {
    state:next,
    sprinting:canSprint,
    breath:breathLoudness(stamina),
    exhausted:lockout>0,
    canStartSprint:lockout===0&&stamina>=RESUME_SPRINT_THRESHOLD
  };
}
