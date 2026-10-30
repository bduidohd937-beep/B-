import { panelPosition } from './puzzle.js';
// An intentionally enormous environmental sound and short terrifying rush.
// Threat goes to the BREAKER, not live player coordinates.
export const SIREN_LOUDNESS=100;
export const SIREN_HEARING_RADIUS=86;
export const SIREN_SECONDS=9;
export const RUSH_SECONDS=8.5;
export const RUSH_SPEED=6.0;
export const SECOND_FLOOR_RUSH_SPEED=5.2;
export const LISTENER_REACTION_SECONDS=.8;

export function canTriggerSiren({powered=false,alreadyTriggered=false}={}){
  // Lubricating mechanical parts cannot disconnect an electronic alarm circuit.
  return !powered&&!alreadyTriggered;
}
export function sirenPosition(floor=1){
  const [x,z]=panelPosition(floor);
  return [x,1.7,z];
}
export function rushSpeed(secondsRemaining,excitement=100,floor=1){
  // The 2nd-loop 3.25s key-turn + slow shutter should be survivable by
  // prepared players; the first breaker remains relatively aggressive.
  if(secondsRemaining<=0)return 1.2+4.0*Math.min(100,Math.max(0,excitement))/100;
  return floor===2?SECOND_FLOOR_RUSH_SPEED:RUSH_SPEED;
}
export function sirenPulse(t,active=true,reducedEffects=false){
  if(!active)return 0;
  if(reducedEffects)return .75;
  const oscillation=(Math.sin(Math.max(0,t)*Math.PI*3.2)+1)/2;
  return .4+.6*oscillation;
}
