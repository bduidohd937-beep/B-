// B∞ RE:ZERO V0.5-A — physically traversable escape-space blockout.
// Every solid wall collider is derived from its matching rendered wall.
// Coordinate convention: +z goes deeper underground, +x toward electrical room.
export const WALL_THICKNESS=.20;
export const PLAYER_RADIUS=.28;
const DOOR_WIDE=1.25;
const portal=(a,b)=>[[a,b]];
export const AREAS=Object.freeze([
  {id:'guard',name:'경비실',kind:'office',x0:-3,x1:3,z0:-3,z1:3,elevation:1.08,doors:{S:portal(-1.15,1.15)}},
  {id:'stairs',name:'비상계단',kind:'stair',x0:-1.65,x1:1.65,z0:3,z1:11,doors:{N:portal(-1.15,1.15),S:portal(-1.15,1.15)}},
  {id:'hub',name:'지하 중앙복도',kind:'hall',x0:-3,x1:3,z0:11,z1:21,doors:{N:portal(-1.15,1.15),S:portal(-1.15,1.15),E:portal(15,18),W:portal(15,18)}},
  {id:'east-link',name:'전기실 연결통로',kind:'hall',x0:3,x1:6,z0:15,z1:18,doors:{W:portal(15,18),E:portal(15,18)}},
  {id:'electrical',name:'전기실',kind:'electrical',x0:6,x1:12,z0:12,z1:20,doors:{W:portal(15,18),S:portal(8,10)}},
  {id:'service-link',name:'정비 우회통로',kind:'hall',x0:8,x1:10,z0:20,z1:24,doors:{N:portal(8,10),S:portal(8,10)}},
  {id:'service',name:'정비 설비실',kind:'service',x0:6,x1:12,z0:24,z1:30,doors:{N:portal(8,10),W:portal(26,28)}},
  {id:'store-link',name:'창고 연결통로',kind:'hall',x0:3,x1:6,z0:26,z1:28,doors:{W:portal(26,28),E:portal(26,28)}},
  {id:'storage',name:'관리 창고',kind:'storage',x0:-3,x1:3,z0:24,z1:30,doors:{E:portal(26,28),N:portal(-1.15,1.15)}},
  {id:'north-link',name:'좁은 우회통로',kind:'hall',x0:-1.65,x1:1.65,z0:21,z1:24,doors:{N:portal(-1.15,1.15),S:portal(-1.15,1.15)}},
  {id:'sealed-link',name:'폐쇄 설비 구역 입구',kind:'sealed',x0:-6,x1:-3,z0:15,z1:18,doors:{E:portal(15,18)}}
]);
export const AREA_BY_ID=Object.fromEntries(AREAS.map(a=>[a.id,a]));
export const STOPS=Object.freeze({
  start:{x:0,z:0},landing:{x:0,z:7.1},hub:{x:0,z:16.5},
  electrical:{x:9,z:16.7},service:{x:9,z:27},
  storage:{x:0,z:27},sealed:{x:-4.8,z:16.5}
});
// Extra cover objects are real collisions; all have generous paths around them.
export const OBSTACLES=Object.freeze([
  {id:'guard-desk',x:-2.10,z:-1.95,w:1.38,d:.85,h:.76,kind:'wood'},
  {id:'hub-crate',x:2.18,z:19.05,w:1.05,d:1.15,h:1.6,kind:'metal'},
  {id:'electrical-panel',x:10.95,z:14.15,w:1.1,d:.45,h:2.15,kind:'panel'},
  {id:'electrical-shelf',x:10.9,z:18.85,w:1.18,d:.64,h:1.55,kind:'metal'},
  {id:'service-duct',x:7.0,z:28.90,w:.9,d:.9,h:1.28,kind:'metal'},
  {id:'storage-rack-1',x:-2.02,z:27.15,w:.85,d:1.65,h:1.85,kind:'metal'},
  {id:'storage-rack-2',x:1.96,z:25.05,w:.82,d:.78,h:1.48,kind:'wood'},
  {id:'storage-rack-3',x:1.95,z:29.12,w:.83,d:.82,h:1.46,kind:'metal'}
]);
function gapIntervals(a,side){
  const coordinate=side==='N'||side==='S'?a.x0:a.z0;
  const end=side==='N'||side==='S'?a.x1:a.z1;
  const cuts=(a.doors[side]||[]).slice().sort((x,y)=>x[0]-y[0]);
  const out=[];let cursor=coordinate;
  for(const [start,finish] of cuts){
    if(start>cursor+.001)out.push([cursor,start]);
    cursor=Math.max(cursor,finish);
  }
  if(end>cursor+.001)out.push([cursor,end]);
  return out;
}
function wallSegments(a){
  const out=[];
  for(const side of ['N','S','W','E']){
    const boundary=side==='N'?a.z0:side==='S'?a.z1:side==='W'?a.x0:a.x1;
    for(const [from,to] of gapIntervals(a,side)){
      const horizontal=side==='N'||side==='S';
      out.push({
        id:a.id+'-'+side+'-'+from,
        x:horizontal?(from+to)/2:boundary,
        z:horizontal?boundary:(from+to)/2,
        w:horizontal?to-from:WALL_THICKNESS,
        d:horizontal?WALL_THICKNESS:to-from,
        h:2.92,
        elevation:a.kind==='office'?1.08:0,
        type:'wall'
      });
    }
  }
  return out;
}
export const WALLS=Object.freeze(AREAS.flatMap(wallSegments));
export const SOLIDS=Object.freeze([
  ...WALLS.map(w=>({id:w.id,x:w.x,z:w.z,w:w.w,d:w.d})),
  ...OBSTACLES.map(o=>({id:o.id,x:o.x,z:o.z,w:o.w,d:o.d}))
]);
export function getArea(x,z){
  return AREAS.find(a=>x>=a.x0-.001 && x<=a.x1+.001 && z>=a.z0-.001&&z<=a.z1+.001)||null;
}
export function floorHeight(x,z){
  const a=getArea(x,z);
  if(a?.kind==='office')return 1.08;
  if(a?.kind==='stair')return Math.max(0,1.08*(11-z)/8);
  return 0;
}
export function discIntersectsBox(x,z,radius,box){
  const dx=Math.max(Math.abs(x-box.x)-box.w/2,0);
  const dz=Math.max(Math.abs(z-box.z)-box.d/2,0);
  return dx*dx+dz*dz<radius*radius;
}
export function walkable(x,z,radius=PLAYER_RADIUS){
  if(!getArea(x,z))return false;
  return !SOLIDS.some(box=>discIntersectsBox(x,z,radius,box));
}
export function stepMove(current,dx,dz,radius=PLAYER_RADIUS){
  const out={x:current.x,z:current.z};
  // Two-axis sweep allows sliding around walls without passing through.
  // Keep frame steps short enough not to tunnel across thin walls.
  const times=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dz))/.12));
  for(let n=0;n<times;n++){
    if(walkable(out.x+dx/times,out.z,radius))out.x+=dx/times;
    if(walkable(out.x,out.z+dz/times,radius))out.z+=dz/times;
  }
  return out;
}
// Milestone route proves the main service loop exists. It also backs unit tests.
export const DEMO_ROUTE=Object.freeze([
  {x:0,z:0},{x:0,z:4},{x:0,z:8},{x:0,z:12.2},{x:0,z:16.5},
  {x:3.75,z:16.5},{x:6.8,z:16.5},{x:9,z:16.5},
  {x:9,z:19.25},{x:9,z:22},{x:9,z:25.25},{x:9,z:27},
  {x:6.4,z:27},{x:4.5,z:27},{x:2.5,z:27},{x:0,z:27},
  {x:0,z:22},{x:0,z:19.5},{x:0,z:16.5},{x:0,z:9.8},{x:0,z:0}
]);
