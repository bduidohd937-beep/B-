import { gateBlocksPlayer,POWER_PANEL } from './puzzle.js';

// V0.11: large, fog-shrouded navigable basement with repeated bays.
// Gameplay and rendering consume the same solid geometry. No arbitrary
// metal/water patches: every surface has a visible maintenance cause.
export const GARAGE_HEIGHT = 6.15;
export const WALK_BOUNDS = Object.freeze({minX:-62,maxX:62,minZ:-73,maxZ:76});
export const FLOOR_SIZE = Object.freeze([150,194]);
export const FOG_NEAR = 12;
export const FOG_FAR = 49;

const centralZ=[-28,-19,-10,-1,8,17,26,35,44,53,62];
const outerZ=[-64,-55,-46,-28,-19,-10,-1,8,17,26,35,44,53,62,71];
export const PILLARS = Object.freeze([
  ...centralZ.flatMap(z=>[-10,10].map(x=>[x,z])),
  ...outerZ.flatMap(z=>[-42,-26,26,42].map(x=>[x,z]))
]);
export const PARKED_CARS = Object.freeze([
  [-6,-20],[-6,-3],[-6,14],[6,-24],[6,-7],[6,11],
  ...[-52,-35,-16,3,22,41,59].flatMap((z,i)=>[
    [-34,z],[34,z+4],[i%2===0?-50:50,z+2]
  ]),
  ...[30,48,65].flatMap(z=>[[-6,z],[6,z+3]])
]);

export const LEAK = Object.freeze({x:-13.1,z:-11.7,halfWidth:1.7,halfLength:1.65});
export const SERVICE_GRATE = Object.freeze({x:12.3,z:-11.5,halfWidth:1.7,halfLength:1.5});

export function surfaceAt(x,z){
  if(Math.abs(x-LEAK.x)<=LEAK.halfWidth&&Math.abs(z-LEAK.z)<=LEAK.halfLength)return 'water';
  if(Math.abs(x-SERVICE_GRATE.x)<=SERVICE_GRATE.halfWidth&&Math.abs(z-SERVICE_GRATE.z)<=SERVICE_GRATE.halfLength)return 'metal';
  return 'concrete';
}
export function terrainBlocked(x,z,powered=false){
  // The first-loop electrical cabinet is physically solid. Previously the
  // player and Listener could stand inside / exploit its rear to dodge pursuit.
  return (Math.abs(x-POWER_PANEL[0])<1.08&&Math.abs(z-POWER_PANEL[1])<.72)
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
export function terrainBlockedRadius(x,z,radius=0,powered=false){
  const r=Math.max(0,Math.min(2,Number.isFinite(radius)?radius:0));
  if(!Number.isFinite(x)||!Number.isFinite(z))return true;
  if(x-r<WALK_BOUNDS.minX||x+r>WALK_BOUNDS.maxX||
     z-r<WALK_BOUNDS.minZ||z+r>WALK_BOUNDS.maxZ)return true;
  if(Math.abs(x-POWER_PANEL[0])<1.08+r&&Math.abs(z-POWER_PANEL[1])<.72+r)
    return true;
  if(PILLARS.some(([px,pz])=>Math.abs(x-px)<1.15+r&&Math.abs(z-pz)<1.15+r))
    return true;
  if(PARKED_CARS.some(([cx,cz])=>Math.abs(x-cx)<1.7+r&&Math.abs(z-cz)<2.7+r))
    return true;
  // Shutter and its adjacent concrete walls are both solid, at the same
  // corridor depth as the physical mesh. No side slip while raised.
  if(Math.abs(z-(-38))<.85+r &&
     (Math.abs(x)+r>=3.1||!powered))return true;
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
