import {POWER_PANEL} from './puzzle.js';

// The old 34m-away static Listener left the emergency breaker unguarded.
// A short four-point walk near the machinery makes listening, distraction
// and timing matter. No player-position tracking or teleportation.
export const FIRST_GUARD_HOME=Object.freeze([-21,-18]);
export const FIRST_GUARD_PATROL=Object.freeze([
  FIRST_GUARD_HOME,
  Object.freeze([-24,-25]),
  Object.freeze([-17,-31]),
  Object.freeze([-12,-24])
]);
export const FIRST_GUARD_WALK_SPEED=1.35;
export const FIRST_GUARD_ROUTE_REPLAN_SECONDS=2.3;
export const FIRST_GUARD_WAYPOINT_RADIUS=1.15;

export function firstGuardWaypoint(index=0){
  const n=FIRST_GUARD_PATROL.length;
  return FIRST_GUARD_PATROL[((Math.floor(index)%n)+n)%n];
}
export function nextFirstGuardWaypoint(index,position){
  const point=firstGuardWaypoint(index);
  if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.z))return index;
  return Math.hypot(position.x-point[0],position.z-point[1])<
    FIRST_GUARD_WAYPOINT_RADIUS ? (index+1)%FIRST_GUARD_PATROL.length : index;
}
export function breakerThreatDistance(position){
  return Math.hypot(position[0]-POWER_PANEL[0],position[1]-POWER_PANEL[1]);
}
