import test from 'node:test';
import assert from 'node:assert/strict';
import {planThrow,throwPoint,AIM_POINTS,isThrowable,THROW_DURATION} from '../src/throwRules.js';
import {terrainBlocked,WALK_BOUNDS} from '../src/garageLayout.js';
test('can, wind-up alarm, radio and glowstick use the same physical trajectory preview',()=>{
 for(const type of ['can','alarm','radio','glow'])assert.equal(isThrowable(type),true);
 for(const type of ['energy','battery','lube',null])assert.equal(isThrowable(type),false);
});
test('preview starts at launch and ends exactly where object actually lands',()=>{
 const plan=planThrow([0,1.7,17],[0,-.17,-.98],{powered:false});
 assert.ok(plan);
 assert.equal(plan.points.length,AIM_POINTS);
 assert.deepEqual(plan.points[0],plan.start);
 const last=plan.points.at(-1);
 for(let i=0;i<3;i++)assert.ok(Math.abs(last[i]-plan.end[i])<1e-12);
 assert.deepEqual(throwPoint(plan.start,plan.end,0),plan.start);
 assert.deepEqual(throwPoint(plan.start,plan.end,1),plan.end);
 assert.ok(throwPoint(plan.start,plan.end,.5)[1]>plan.start[1]);
 assert.equal(plan.duration,THROW_DURATION);
});
test('ground endpoint refuses cars, pillars and a locked security shutter',()=>{
 for(const [eye,dir] of [
   [[0,1.7,-30],[0,0,-1]],[[-5,1.7,-17],[-1,0,0]],
   [[0,1.7,17],[0,0,-1]]
 ]){
  const plan=planThrow(eye,dir,{powered:false});
  assert.equal(terrainBlocked(plan.end[0],plan.end[2],false),false);
  assert.ok(plan.end[0]>=WALK_BOUNDS.minX&&plan.end[0]<=WALK_BOUNDS.maxX);
  assert.ok(plan.end[2]>=WALK_BOUNDS.minZ&&plan.end[2]<=WALK_BOUNDS.maxZ);
 }
});
test('short tap lets a player place noise traps nearby, long hold gives range',()=>{
 const near=planThrow([0,1.7,17],[0,-.2,-1],{short:true});
 const far=planThrow([0,1.7,17],[0,-.2,-1]);
 assert.ok(Math.abs(far.end[2]-17)>Math.abs(near.end[2]-17));
});
