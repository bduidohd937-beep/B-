import {POWER_PANEL,canUsePanel} from './puzzle.js';

// A loud breaker/siren is emitted at the physical cabinet, but the switch
// face that the player operates is outside the collision shape on its +Z side.
// The Listener must route to the REACHABLE sound surface, not a grid cell
// trapped behind/inside the collider. Never use the live player location.
export const BREAKER_APPROACH=Object.freeze([POWER_PANEL[0],POWER_PANEL[1]+1.55]);
export const LISTENER_CONTACT_RADIUS=1.72;
export const LISTENER_GOAL_REPLAN_SECONDS=.8;

export function reachableSoundTarget(position,eventType,floor=1){
 if(!position||position.length<3)return null;
 const [x,,z]=position;
 if(!Number.isFinite(x)||!Number.isFinite(z))return null;
 const isBreakerNoise=['switch','power','siren'].includes(eventType);
 if(floor===1&&isBreakerNoise&&canUsePanel(x,z,1)){
   return {x:BREAKER_APPROACH[0],z:BREAKER_APPROACH[1],source:'breaker-face'};
 }
 return {x,z,source:'noise'};
}

// Don't catch the player through the heavy metal box, concrete or car.
// Collision contact is independent of whether the player is crouching or
// stationary: standing still in front of the panel is NOT invulnerability.
export function canListenerCatch(creature,player,obstructed){
 if(!creature||!player)return false;
 const distance=Math.hypot(creature.x-player.x,creature.z-player.z);
 if(distance>=LISTENER_CONTACT_RADIUS)return false;
 const midX=(creature.x+player.x)/2,midZ=(creature.z+player.z)/2;
 return !obstructed(midX,midZ);
}

export function shouldReplanOnStall(previousDistance,currentDistance,seconds){
 if(!Number.isFinite(previousDistance)||!Number.isFinite(currentDistance))return false;
 return currentDistance>=previousDistance-.12&&seconds>=LISTENER_GOAL_REPLAN_SECONDS;
}
