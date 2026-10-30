import {terrainBlockedRadius} from './garageLayout.js';

// At 5-6 m/s and 60Hz, checking only the end position is vulnerable to
// thin obstacles / big frame delta. Sweep the actor's whole footprint in
// <= 0.16m slices and allow controlled axis sliding. Used by player + AI.
export const MAX_COLLISION_STEP=.16;
export function sweepMove(x,z,dx,dz,radius=.34,powered=false){
 const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/MAX_COLLISION_STEP));
 const sx=dx/steps,sz=dz/steps;
 let nx=x,nz=z,collisions=0;
 const blocked=(px,pz)=>terrainBlockedRadius(px,pz,radius,powered);
 for(let i=0;i<steps;i++){
   if(!blocked(nx+sx,nz+sz)){nx+=sx;nz+=sz;continue;}
   let moved=false;
   if(!blocked(nx+sx,nz)){nx+=sx;moved=true;}
   if(!blocked(nx,nz+sz)){nz+=sz;moved=true;}
   if(!moved)collisions++;
 }
 return {x:nx,z:nz,moved:Math.hypot(nx-x,nz-z),collisions};
}
export function segmentCrossesSolid(from,to,powered=false,step=.15){
 if(!from||!to)return true;
 const length=Math.hypot(to.x-from.x,to.z-from.z);
 if(!Number.isFinite(length))return true;
 const samples=Math.max(1,Math.ceil(length/Math.max(.06,step)));
 for(let i=1;i<samples;i++){
   const t=i/samples;
   if(terrainBlockedRadius(from.x+(to.x-from.x)*t,
     from.z+(to.z-from.z)*t,0,powered))return true;
 }
 return false;
}
