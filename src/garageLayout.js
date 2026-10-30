import { gateBlocksPlayer,POWER_PANEL,GATE_Z,GATE_HALF_OPENING } from './puzzle.js';
import {STAGE_ONE_SAFE_CENTER,STAGE_ONE_TERMINAL} from './stageOneRules.js';

// Stage 01: a compact 44 x 60m basement. Rendering, player collision and
// creature navigation consume these exact solids and shortcut state.
// Gameplay and rendering consume the same solid geometry. No arbitrary
// metal/water patches: every surface has a visible maintenance cause.
export const GARAGE_HEIGHT = 6.15;
export const WALK_BOUNDS = Object.freeze({minX:-22,maxX:22,minZ:-38,maxZ:22});
export const FLOOR_SIZE = Object.freeze([44,60]);
export const FOG_NEAR = 12;
export const FOG_FAR = 49;

export const PILLARS = Object.freeze([
  ...[-26,-16,-6,4,14].flatMap(z=>[-11,11].map(x=>[x,z]))
]);
export const PARKED_CARS = Object.freeze([
  [-8,-6],[0,-6],[8,-6],[-8,-18],[0,-18],[8,-18],
  [-8,5],[0,5],[8,5],[-18,-10],[18,-10]
]);

// Axis-aligned concrete walls. A is the security room, E is the maintenance
// divider. The keyed service door joins both halves after the safe is opened.
export const STRUCTURE_WALLS=Object.freeze([
  Object.freeze({x:-17,z:20,halfX:5,halfZ:.18}),
  Object.freeze({x:-21.8,z:14,halfX:.18,halfZ:6}),
  Object.freeze({x:-17,z:8,halfX:5,halfZ:.18}),
  Object.freeze({x:-12.2,z:10.1,halfX:.18,halfZ:2.1}),
  Object.freeze({x:-12.2,z:17.9,halfX:.18,halfZ:2.1}),
  Object.freeze({x:13,z:-15,halfX:.18,halfZ:11}),
  Object.freeze({x:13,z:8,halfX:.18,halfZ:6})
]);
export const SERVICE_SHORTCUT=Object.freeze({x:13,z:-2,halfX:.28,halfZ:2});
export const SECURITY_DESK=Object.freeze({x:STAGE_ONE_TERMINAL[0],z:STAGE_ONE_TERMINAL[2],halfX:.86,halfZ:.43});

export const LEAK = Object.freeze({x:-4,z:-13,halfWidth:1.7,halfLength:1.65});
export const SERVICE_GRATE = Object.freeze({x:17,z:-3,halfWidth:1.7,halfLength:1.5});

export function surfaceAt(x,z){
  if(Math.abs(x-LEAK.x)<=LEAK.halfWidth&&Math.abs(z-LEAK.z)<=LEAK.halfLength)return 'water';
  if(Math.abs(x-SERVICE_GRATE.x)<=SERVICE_GRATE.halfWidth&&Math.abs(z-SERVICE_GRATE.z)<=SERVICE_GRATE.halfLength)return 'metal';
  return 'concrete';
}
export function terrainBlocked(x,z,powered=false,shortcutOpen=false){
  // The first-loop electrical cabinet is physically solid. Previously the
  // player and Listener could stand inside / exploit its rear to dodge pursuit.
  return (Math.abs(x-STAGE_ONE_SAFE_CENTER[0])<.76&&Math.abs(z-STAGE_ONE_SAFE_CENTER[1])<.59)
    || (Math.abs(x-SECURITY_DESK.x)<SECURITY_DESK.halfX&&Math.abs(z-SECURITY_DESK.z)<SECURITY_DESK.halfZ)
    || (Math.abs(x-POWER_PANEL[0])<1.08&&Math.abs(z-POWER_PANEL[1])<.72)
    || STRUCTURE_WALLS.some(w=>Math.abs(x-w.x)<w.halfX&&Math.abs(z-w.z)<w.halfZ)
    || (!shortcutOpen&&Math.abs(x-SERVICE_SHORTCUT.x)<SERVICE_SHORTCUT.halfX&&Math.abs(z-SERVICE_SHORTCUT.z)<SERVICE_SHORTCUT.halfZ)
    || PILLARS.some(([px,pz])=>Math.abs(x-px)<1.15&&Math.abs(z-pz)<1.15)
    || PARKED_CARS.some(([cx,cz])=>Math.abs(x-cx)<1.7&&Math.abs(z-cz)<2.7)
    || gateBlocksPlayer(x,z,powered);
}
// Physical footprint used by BOTH monsters and the first-person capsule.
// The old single-point checks let a fast creature embed its body through
// parked cars and the security divider without crossing its center.
export const PLAYER_COLLISION_RADIUS=.34;
export const LISTENER_COLLISION_RADIUS=.58;
export const OBSERVER_COLLISION_RADIUS=.55;
export function terrainBlockedRadius(x,z,radius=0,powered=false,shortcutOpen=false){
  const r=Math.max(0,Math.min(2,Number.isFinite(radius)?radius:0));
  if(!Number.isFinite(x)||!Number.isFinite(z))return true;
  if(x-r<WALK_BOUNDS.minX||x+r>WALK_BOUNDS.maxX||
     z-r<WALK_BOUNDS.minZ||z+r>WALK_BOUNDS.maxZ)return true;
  if(Math.abs(x-STAGE_ONE_SAFE_CENTER[0])<.76+r&&Math.abs(z-STAGE_ONE_SAFE_CENTER[1])<.59+r)return true;
  if(Math.abs(x-SECURITY_DESK.x)<SECURITY_DESK.halfX+r&&
     Math.abs(z-SECURITY_DESK.z)<SECURITY_DESK.halfZ+r)return true;
  if(Math.abs(x-POWER_PANEL[0])<1.08+r&&Math.abs(z-POWER_PANEL[1])<.72+r)
    return true;
  if(STRUCTURE_WALLS.some(w=>Math.abs(x-w.x)<w.halfX+r&&Math.abs(z-w.z)<w.halfZ+r))return true;
  if(!shortcutOpen&&Math.abs(x-SERVICE_SHORTCUT.x)<SERVICE_SHORTCUT.halfX+r&&
     Math.abs(z-SERVICE_SHORTCUT.z)<SERVICE_SHORTCUT.halfZ+r)return true;
  if(PILLARS.some(([px,pz])=>Math.abs(x-px)<1.15+r&&Math.abs(z-pz)<1.15+r))
    return true;
  if(PARKED_CARS.some(([cx,cz])=>Math.abs(x-cx)<1.7+r&&Math.abs(z-cz)<2.7+r))
    return true;
  // Shutter and its adjacent concrete walls are both solid, at the same
  // corridor depth as the physical mesh. No side slip while raised.
  if(Math.abs(z-GATE_Z)<.85+r &&
     (Math.abs(x)+r>=GATE_HALF_OPENING||!powered))return true;
  return false;
}

export function clampWalkPosition(x,z){
  return [
    Math.max(WALK_BOUNDS.minX,Math.min(WALK_BOUNDS.maxX,x)),
    Math.max(WALK_BOUNDS.minZ,Math.min(WALK_BOUNDS.maxZ,z))
  ];
}
export function fadeDistance(distance){
  // Fog hides the physical perimeter long before a player reaches it.
  return Math.max(0,Math.min(1,(FOG_FAR-distance)/24));
}
