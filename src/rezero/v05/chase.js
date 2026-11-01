import {walkable,stepMove} from './level.js';

// The first threat erupts from the rear maintenance access, near the breaker.
// Sealed G remains reserved for a later case.
export const MONSTER_SPAWN=Object.freeze({x:9,z:21.6});
export const BREAKER_POS=Object.freeze({x:10.10,z:14.95});
export const HIDE_POS=Object.freeze({x:-1.3,z:27.15});
export const MONSTER_WALK=1.25;
export const MONSTER_CHASE=3.35;
export const PLAYER_SPRINT=4.2;
const GRID=.5,MIN_X=-5.5,MIN_Z=-2.5,MAX_X=11.5,MAX_Z=29.5;
const nx=Math.round((MAX_X-MIN_X)/GRID)+1,nz=Math.round((MAX_Z-MIN_Z)/GRID)+1;

export function distance(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
export function lineOfSight(a,b){
  const d=distance(a,b),n=Math.max(1,Math.ceil(d/.18));
  for(let i=1;i<n;i++){
    const t=i/n;
    if(!walkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,.11))return false;
  }
  return true;
}
function index(i,j){return i+j*nx;}
function decode(id){return {i:id%nx,j:Math.floor(id/nx)};}
function gridPoint(i,j){return {x:MIN_X+i*GRID,z:MIN_Z+j*GRID};}
function nearestWalkable(point){
  const ix=Math.round((point.x-MIN_X)/GRID),iz=Math.round((point.z-MIN_Z)/GRID);
  let best=null,score=Infinity;
  for(let ring=0;ring<=5;ring++)for(let dx=-ring;dx<=ring;dx++)
    for(let dz=-ring;dz<=ring;dz++){
      const i=ix+dx,j=iz+dz;
      if(i<0||j<0||i>=nx||j>=nz)continue;
      const p=gridPoint(i,j);
      if(!walkable(p.x,p.z,.27))continue;
      const d=distance(p,point);
      if(d<score){score=d;best={i,j,...p};}
    }
  return best;
}
export function findRoute(start,goal){
  const s=nearestWalkable(start),g=nearestWalkable(goal);
  if(!s||!g)return [];
  const startKey=index(s.i,s.j),goalKey=index(g.i,g.j);
  if(startKey===goalKey)return [gridPoint(g.i,g.j)];
  // This map is under 3000 traversable cells. Weighted heuristic is not
  // necessary: use deterministic A* with four cardinal neighbors.
  const open=[startKey],seen=new Set([startKey]),from=new Map(),
    cost=new Map([[startKey,0]]);
  const heuristic=(i,j)=>Math.abs(i-g.i)+Math.abs(j-g.j);
  let explored=0;
  while(open.length && explored++<nx*nz){
    let bestIndex=0,bestScore=Infinity;
    for(let k=0;k<open.length;k++){
      const p=decode(open[k]);
      const score=(cost.get(open[k])??Infinity)+heuristic(p.i,p.j);
      if(score<bestScore){bestIndex=k;bestScore=score;}
    }
    const current=open.splice(bestIndex,1)[0];
    seen.delete(current);
    if(current===goalKey){
      const route=[];let cursor=current;
      while(cursor!==startKey){
        const node=decode(cursor);
        route.push(gridPoint(node.i,node.j));
        cursor=from.get(cursor);
        if(cursor===undefined)return [];
      }
      return route.reverse();
    }
    const node=decode(current);
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const i=node.i+di,j=node.j+dj;
      if(i<0||j<0||i>=nx||j>=nz)continue;
      const p=gridPoint(i,j);
      if(!walkable(p.x,p.z,.27))continue;
      const ni=index(i,j),nc=cost.get(current)+1;
      if(nc>=(cost.get(ni)??Infinity))continue;
      cost.set(ni,nc);from.set(ni,current);
      if(!seen.has(ni)){seen.add(ni);open.push(ni);}
    }
  }
  return [];
}
export function createChase(){
  return {
    phase:'dormant',pos:{...MONSTER_SPAWN},heading:{x:1,z:0},t:0,
    lost:0,notice:0,searchClock:0,footDistance:0,
    lastSeen:{...BREAKER_POS},goal:{...BREAKER_POS},
    path:[],waypoint:0,pathClock:0,goalPath:null,seenPlayer:false
  };
}
export function wakeChase(state){
  if(state.phase!=='dormant')return false;
  state.phase='emerge';state.t=0;state.pos={...MONSTER_SPAWN};
  state.goal={...BREAKER_POS};return true;
}
export function spotted(state,player,hide=false){
  if(!player||hide)return false;
  const d=distance(state.pos,player);
  if(d>10||!lineOfSight(state.pos,player))return false;
  const fx=player.x-state.pos.x,fz=player.z-state.pos.z;
  const facing=(fx*state.heading.x+fz*state.heading.z)/Math.max(d,.001);
  return d<=1.85||facing>.28;
}
function navigate(state,target,speed,dt,events){
  const changed=!state.goalPath || distance(state.goalPath,target)>1.05;
  state.pathClock-=dt;
  if(changed||state.pathClock<=0||state.waypoint>=state.path.length){
    const route=findRoute(state.pos,target);
    if(route.length){state.path=route;state.waypoint=0;state.goalPath={...target};}
    state.pathClock=.85;
  }
  if(!state.path.length)return;
  let remaining=speed*dt;
  while(remaining>1e-5 && state.waypoint<state.path.length){
    const node=state.path[state.waypoint];
    const d=distance(state.pos,node);
    if(d<.085){state.waypoint++;continue;}
    const step=Math.min(d,remaining);
    const dx=(node.x-state.pos.x)/d*step,dz=(node.z-state.pos.z)/d*step;
    const next=stepMove(state.pos,dx,dz,.27);
    const moved=distance(state.pos,next);
    if(moved<.001){state.pathClock=0;break;}
    state.heading={x:(next.x-state.pos.x)/moved,z:(next.z-state.pos.z)/moved};
    state.pos=next;
    state.footDistance+=moved;
    if(state.footDistance>.72){
      state.footDistance-=.72;
      events.push({type:'step',x:state.pos.x,z:state.pos.z,fast:state.phase==='chase'});
    }
    remaining-=moved;
  }
}
export function advanceChase(s,seconds,player,{hiding=false,paused=false}={}){
  if(paused||s.phase==='dormant'||s.phase==='caught')return [];
  const dt=Math.min(Math.max(0,seconds),.05),ev=[];
  s.t+=dt;
  if(s.phase==='emerge'){
    if(s.t>1.4){s.phase='investigate';s.t=0;ev.push({type:'charge',x:s.pos.x,z:s.pos.z});}
    return ev;
  }
  const visible=spotted(s,player,hiding);
  if(visible){
    s.seenPlayer=true;s.notice+=dt;s.lastSeen={x:player.x,z:player.z};s.lost=0;
  }else{
    s.notice=Math.max(0,s.notice-dt*1.5);s.lost+=dt;
  }
  if(visible && s.notice>.52 && !['chase'].includes(s.phase)){
    s.phase='chase';s.t=0;s.pathClock=0;
    ev.push({type:'alert',x:s.pos.x,z:s.pos.z});
  }
  if(s.phase==='chase'){
    if(!visible&&s.lost>1.05){
      s.phase='search';s.searchClock=5.5;s.pathClock=0;
      ev.push({type:'lost',x:s.pos.x,z:s.pos.z});
    }else{
      navigate(s,visible?player:s.lastSeen,MONSTER_CHASE,dt,ev);
      if(!hiding&&visible&&distance(s.pos,player)<.67){
        s.phase='caught';ev.push({type:'caught',x:s.pos.x,z:s.pos.z});
      }
      return ev;
    }
  }
  if(s.phase==='investigate'){
    navigate(s,BREAKER_POS,2.55,dt,ev);
    if(distance(s.pos,BREAKER_POS)<1.0){
      s.phase='search';s.searchClock=5.5;s.pathClock=0;
    }
  }else if(s.phase==='search'){
    navigate(s,s.lastSeen,MONSTER_WALK,dt,ev);
    s.searchClock-=dt;
    if(s.searchClock<=0){
      s.phase='investigate';s.goal={...BREAKER_POS};s.pathClock=0;
    }
  }
  return ev;
}
export function canOperateBreaker(player){
  return Boolean(player && distance(player,BREAKER_POS)<1.65);
}
export function canUseHiding(player){
  return Boolean(player && distance(player,HIDE_POS)<1.75);
}
