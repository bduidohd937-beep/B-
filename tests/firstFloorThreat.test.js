import test from 'node:test';
import assert from 'node:assert/strict';
import {POWER_PANEL} from '../src/puzzle.js';
import {terrainBlocked} from '../src/garageLayout.js';
import {buildRoute} from '../src/navigationGrid.js';
import {
 FIRST_GUARD_HOME,FIRST_GUARD_PATROL,FIRST_GUARD_WALK_SPEED,
 FIRST_GUARD_WAYPOINT_RADIUS,firstGuardWaypoint,nextFirstGuardWaypoint,
 breakerThreatDistance
} from '../src/firstFloorThreat.js';

test('first-floor Listener begins beside breaker, not 34 metres away',()=>{
 assert.deepEqual(POWER_PANEL,[17,-22]);
 const distance=breakerThreatDistance(FIRST_GUARD_HOME);
 assert.ok(distance>=5&&distance<=12,
   'Guard should threaten the breaker but not begin within capture radius');
 assert.ok(FIRST_GUARD_PATROL.length>=4);
 assert.ok(FIRST_GUARD_WALK_SPEED<2,
   'Patrol should be escapable by walking or quietly crouching');
});
test('guard ring is clear, stays in hearing vicinity of breaker and is navigable',()=>{
 for(let i=0;i<FIRST_GUARD_PATROL.length;i++){
  const p=FIRST_GUARD_PATROL[i];
  assert.equal(terrainBlocked(p[0],p[1],false),false,'Guard waypoint intersects car/pillar');
  assert.ok(breakerThreatDistance(p)<=16,'Patrol must sometimes leave the breaker to offer openings');
  assert.ok(breakerThreatDistance(p)>3.5,'Guard occupies interactable breaker itself');
  const q=firstGuardWaypoint(i+1);
  const route=buildRoute({x:p[0],z:p[1]},{x:q[0],z:q[1]},false);
  assert.ok(route.length>0,'Guard cannot patrol through walls or cars');
  assert.equal(terrainBlocked(route.at(-1).x,route.at(-1).z,false),false);
 }
});
test('guard patrol advances only on reaching its own waypoint, not player coords',()=>{
 assert.deepEqual(firstGuardWaypoint(0),FIRST_GUARD_HOME);
 assert.deepEqual(firstGuardWaypoint(5),FIRST_GUARD_HOME);
 assert.equal(nextFirstGuardWaypoint(1,{x:0,z:17}),1);
 const [x,z]=firstGuardWaypoint(1);
 assert.equal(nextFirstGuardWaypoint(1,{x,z}),2);
 assert.equal(nextFirstGuardWaypoint(3,{x:7,z:-25}),4);
 assert.ok(FIRST_GUARD_WAYPOINT_RADIUS<2);
});
test('player start stays clear of guard initial position',()=>{
 assert.ok(Math.hypot(FIRST_GUARD_HOME[0],FIRST_GUARD_HOME[1]-17)>30);
});
