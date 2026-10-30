import {WALK_BOUNDS,terrainBlockedRadius,LISTENER_COLLISION_RADIUS} from './garageLayout.js';

// Precompute static grid occupancy ONCE per gate condition. Previously the
// Listener ran thousands of JS .some() obstacle checks every path update,
// causing periodic stalls in the expanded B2 garage.
export const NAV_STEP=2.5;
export const NAV_COLS=Math.floor((WALK_BOUNDS.maxX-WALK_BOUNDS.minX)/NAV_STEP)+1;
export const NAV_ROWS=Math.floor((WALK_BOUNDS.maxZ-WALK_BOUNDS.minZ)/NAV_STEP)+1;
const SIZE=NAV_COLS*NAV_ROWS;
const grids=new Map();
let builds=0;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const coords=(x,z)=>[
 clamp(Math.round((x-WALK_BOUNDS.minX)/NAV_STEP),0,NAV_COLS-1),
 clamp(Math.round((z-WALK_BOUNDS.minZ)/NAV_STEP),0,NAV_ROWS-1)
];
const id=(x,z)=>x+z*NAV_COLS;
const world=(x,z)=>[WALK_BOUNDS.minX+x*NAV_STEP,WALK_BOUNDS.minZ+z*NAV_STEP];
export function navigationGrid(powered=false){
 const key=Boolean(powered);
 if(grids.has(key))return grids.get(key);
 const blocked=new Uint8Array(SIZE);
 for(let gz=0;gz<NAV_ROWS;gz++)for(let gx=0;gx<NAV_COLS;gx++){
   const [x,z]=world(gx,gz);
   blocked[id(gx,gz)]=terrainBlockedRadius(x,z,LISTENER_COLLISION_RADIUS,key)?1:0;
 }
 grids.set(key,blocked);
 builds++;
 return blocked;
}
export function navigationStats(){return {builds,cells:SIZE,cached:grids.size};}
function nearestFree(gx,gz,blocked){
 if(!blocked[id(gx,gz)])return id(gx,gz);
 // Occasionally an AI target is directly within a vehicle volume. Snap to
 // reachable geometry close to it rather than running at the car forever.
 for(let radius=1;radius<=4;radius++)for(let dz=-radius;dz<=radius;dz++){
   for(let dx=-radius;dx<=radius;dx++){
     if(Math.max(Math.abs(dx),Math.abs(dz))!==radius)continue;
     const x=gx+dx,z=gz+dz;
     if(x<0||z<0||x>=NAV_COLS||z>=NAV_ROWS)continue;
     const cell=id(x,z);
     if(!blocked[cell])return cell;
   }
 }
 return -1;
}
export function buildRoute(from,to,powered=false){
 if(!from||!to)return [];
 const blocked=navigationGrid(powered);
 const [sx,sz]=coords(from.x,from.z),[tx,tz]=coords(to.x,to.z);
 const start=nearestFree(sx,sz,blocked),goal=nearestFree(tx,tz,blocked);
 if(start<0||goal<0||start===goal)return [];
 const parents=new Int32Array(SIZE);
 parents.fill(-1);
 const queue=new Int32Array(SIZE);
 let head=0,tail=1;
 queue[0]=start;
 parents[start]=start;
 while(head<tail&&parents[goal]<0){
   const current=queue[head++];
   const x=current%NAV_COLS,z=Math.floor(current/NAV_COLS);
   // Four-neighbor movement respects concrete columns, cars and shutters.
   for(let dir=0;dir<4;dir++){
     const nx=x+(dir===0?1:dir===1?-1:0);
     const nz=z+(dir===2?1:dir===3?-1:0);
     if(nx<0||nz<0||nx>=NAV_COLS||nz>=NAV_ROWS)continue;
     const next=id(nx,nz);
     if(parents[next]!==-1||blocked[next])continue;
     parents[next]=current;
     queue[tail++]=next;
     if(next===goal)break;
   }
 }
 if(parents[goal]<0)return [];
 const route=[];
 let current=goal;
 while(current!==start&&route.length<SIZE){
   const gx=current%NAV_COLS,gz=Math.floor(current/NAV_COLS);
   const [x,z]=world(gx,gz);
   route.push({x,z});
   current=parents[current];
 }
 return route.reverse();
}
