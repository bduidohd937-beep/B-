// Balanced survival state machine; pure so frame-independent behavior is testable.
// Values are intentionally generous: the existing Listener is already demanding.
export const STAMINA_MAX = 100;
export const SPRINT_DRAIN_PER_SECOND = 16; // ~6.25 seconds of sustained escape sprint
export const EXHAUSTION_SECONDS = 2.1;
export const WALK_DRAIN_PER_SECOND = 1.4;
export const CROUCH_MOVE_DRAIN_PER_SECOND = .35;
export const RESUME_SPRINT_THRESHOLD = 18;

export function clamp(value,min=0,max=100){
  return Math.max(min,Math.min(max,value));
}
export function freshSurvival(){
  return { stamina:100, lockout:0, recentlyRan:0, running:false, boost:0 };
}
export function applyEnergyDrink(previous){
  const old=previous||freshSurvival();
  return {...old,stamina:clamp(old.stamina+48),lockout:0,recentlyRan:0,boost:5};
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
  const boost=Math.max(0,(old.boost||0)-seconds);
  lockout=Math.max(0,lockout-seconds);
  recentlyRan=Math.max(0,recentlyRan-seconds);
  const canSprint=wantsSprint && moving && !crouching && !airborne &&
    lockout<=0 && stamina>0 && (Boolean(old.running) || stamina>=RESUME_SPRINT_THRESHOLD);
  if(canSprint){
    stamina=clamp(stamina-(old.boost>0?0:SPRINT_DRAIN_PER_SECOND*seconds));
    recentlyRan=.62;
    if(stamina<=0){lockout=EXHAUSTION_SECONDS;}
  } else if(moving){
    // Walking also costs energy. Crouched movement is cheaper but still limited.
    // Energy drink temporarily prevents sprint drain only.
    stamina=clamp(stamina-(crouching?CROUCH_MOVE_DRAIN_PER_SECOND:WALK_DRAIN_PER_SECOND)*seconds);
  } else if(recentlyRan<=0){
    // Resting becomes a tactical choice: standing +18/s; crouch-rest +23/s.
    stamina=clamp(stamina+(crouching?23:18)*seconds);
  }
  const next={stamina,lockout,recentlyRan,running:canSprint,boost};
  return {
    state:next,
    sprinting:canSprint,
    breath:breathLoudness(stamina),
    exhausted:lockout>0,
    canStartSprint:lockout===0&&stamina>=RESUME_SPRINT_THRESHOLD
  };
}
