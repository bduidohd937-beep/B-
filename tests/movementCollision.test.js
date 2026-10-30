import test from 'node:test';
import assert from 'node:assert/strict';
import {
 terrainBlockedRadius,PLAYER_COLLISION_RADIUS,LISTENER_COLLISION_RADIUS
} from '../src/garageLayout.js';
import {POWER_PANEL,GATE_Z,GATE_HALF_OPENING} from '../src/puzzle.js';
import {sweepMove,segmentCrossesSolid,MAX_COLLISION_STEP} from '../src/movementCollision.js';

test('large rush cannot teleport or slide through closed shutter, even from side',()=>{
 const a=sweepMove(0,GATE_Z+4,0,-8,LISTENER_COLLISION_RADIUS,false);
 assert.ok(a.z>GATE_Z,'closed gate must stop the monster on front side');
 assert.equal(terrainBlockedRadius(a.x,a.z,LISTENER_COLLISION_RADIUS,false),false);
 const wall=sweepMove(GATE_HALF_OPENING+1,GATE_Z+3,0,-7,LISTENER_COLLISION_RADIUS,true);
 assert.ok(wall.z>GATE_Z,'side wall stays closed even if shutter opens');
});
test('open center lane is passable by player and Listener, no wall phasing',()=>{
 for(const radius of [PLAYER_COLLISION_RADIUS,LISTENER_COLLISION_RADIUS]){
  const result=sweepMove(0,GATE_Z+4,0,-8,radius,true);
  assert.ok(result.z<GATE_Z,'actor should pass raised center shutter');
  assert.equal(terrainBlockedRadius(result.x,result.z,radius,true),false);
 }
});
test('swept radius prevents parked-car and breaker cabinet shortcuts',()=>{
 const car=sweepMove(-6,-15,0,-10,LISTENER_COLLISION_RADIUS,false);
 assert.ok(car.z>-20,'body cannot go through a parked vehicle');
 const breaker=sweepMove(POWER_PANEL[0],POWER_PANEL[1]+3,0,-6,PLAYER_COLLISION_RADIUS,false);
 assert.ok(breaker.z>POWER_PANEL[1]);
 assert.equal(segmentCrossesSolid(
  {x:POWER_PANEL[0],z:POWER_PANEL[1]+1.1},
  {x:POWER_PANEL[0],z:POWER_PANEL[1]-1.1}),true);
 assert.ok(MAX_COLLISION_STEP<=.2);
});
