import { WALK_BOUNDS,terrainBlocked } from './garageLayout.js';

export const THROW_DURATION=.88;
export const THROW_ARC_HEIGHT=1.75;
export const THROWABLE_ITEMS=Object.freeze(['can','alarm','radio','glow']);
export const AIM_POINTS=25;
export function isThrowable(type){return THROWABLE_ITEMS.includes(type);}
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
// Identical deterministic geometry for the live dotted preview AND the
// actual thrown object. Only the terminal impact emits an AI noise event.
export function throwPoint(start,end,t){
 const u=clamp(Number.isFinite(t)?t:0,0,1);
 return [
   start[0]+(end[0]-start[0])*u,
   start[1]+(end[1]-start[1])*u+THROW_ARC_HEIGHT*Math.sin(Math.PI*u),
   start[2]+(end[2]-start[2])*u
 ];
}
export function planThrow(eye,look,{powered=false,short=false}={}){
 if(!eye||!look||eye.length<3||look.length<3)return null;
 const lx=look[0],ly=look[1],lz=look[2];
 const flat=Math.hypot(lx,lz);
 const fx=flat>.001?lx/flat:0,fz=flat>.001?lz/flat:-1;
 const range=short?2.5:clamp(8-ly*4,4,11);
 let endX=eye[0],endZ=eye[2];
 // Existing mechanics: do not land inside a pillar, vehicle or locked gate.
 // Conservatively sample inward until the endpoint is a valid floor tile.
 for(let distance=range;distance>=.4;distance-=.25){
   const x=clamp(eye[0]+fx*distance,WALK_BOUNDS.minX,WALK_BOUNDS.maxX);
   const z=clamp(eye[2]+fz*distance,WALK_BOUNDS.minZ,WALK_BOUNDS.maxZ);
   if(!terrainBlocked(x,z,powered)){endX=x;endZ=z;break;}
 }
 const start=[eye[0]+lx*.60,Math.max(.95,eye[1]+ly*.60-.15),eye[2]+lz*.60];
 const end=[endX,.18,endZ];
 const points=Array.from({length:AIM_POINTS},(_,i)=>throwPoint(start,end,i/(AIM_POINTS-1)));
 return {start,end,points,duration:THROW_DURATION};
}
