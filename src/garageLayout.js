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
