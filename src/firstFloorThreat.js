import {POWER_PANEL} from './puzzle.js';

// The old 34m-away static Listener left the emergency breaker unguarded.
// A short four-point walk near the machinery makes listening, distraction
// and timing matter. No player-position tracking or teleportation.
export const FIRST_GUARD_HOME=Object.freeze([-21,-18]);
export const FIRST_GUARD_PATROL=Object.freeze([
  FIRST_GUARD_HOME,
  Object.freeze([-25,-24]),
  Object.freeze([-18,-32]),
  Object.freeze([-11,-25]),
  Object.freeze([-20,-11])
]);
export const FIRST_GUARD_WALK_SPEED=1.15;
// A listening pause + wider patrol loop creates a fair opening at the panel.
export const FIRST_GUARD_LISTEN_SECONDS=1.6;
export const FIRST_GUARD_STUCK_SECONDS=.7;
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

// Motion is driven toward NAV waypoints rather than the player's position.
// If a vehicle, column or breaker blocks the direct step, try the shortest
// clear axis/tangent detour. No teleport and no omniscient player tracking.
export function chooseClearStep(x,z,dx,dz,isBlocked){
 const options=[
  [dx,dz],[dx,0],[0,dz],[-dz,dx],[dz,-dx],
  [dx*.5,dz*.5],[-dz*.5,dx*.5],[dz*.5,-dx*.5]
 ];
 for(const [xx,zz] of options){
   if(Math.hypot(xx,zz)<.00001)continue;
   if(!isBlocked(x+xx,z+zz))return [xx===0?0:xx,zz===0?0:zz];
 }
 return [0,0];
}
