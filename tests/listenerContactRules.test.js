import test from 'node:test';
import assert from 'node:assert/strict';
import {terrainBlocked} from '../src/garageLayout.js';
import {POWER_PANEL} from '../src/puzzle.js';
import {BREAKER_APPROACH,canListenerCatch,reachableSoundTarget,
 shouldReplanOnStall,LISTENER_CONTACT_RADIUS} from '../src/listenerContactRules.js';

test('breaker/siren targets are on REAL accessible switch face, not inside a collider',()=>{
 for(const kind of ['switch','power','siren']){
  const p=reachableSoundTarget([POWER_PANEL[0],1.6,POWER_PANEL[1]],kind,1);
  assert.deepEqual([p.x,p.z],BREAKER_APPROACH);
  assert.equal(p.source,'breaker-face');
  assert.equal(terrainBlocked(p.x,p.z),false);
 }
 assert.deepEqual(reachableSoundTarget([22,1,9],'siren',2),{x:22,z:9,source:'noise'});
 assert.deepEqual(reachableSoundTarget([POWER_PANEL[0],1,POWER_PANEL[1]],'step',1),
 {x:POWER_PANEL[0],z:POWER_PANEL[1],source:'noise'});
});
test('stationary panel user gets caught when Listener reaches the front, while cabinet blocks backside exploits',()=>{
 const player={x:BREAKER_APPROACH[0],z:BREAKER_APPROACH[1]};
 assert.equal(canListenerCatch({x:player.x+.9,z:player.z},player,terrainBlocked),true);
 assert.equal(canListenerCatch({x:player.x+3,z:player.z},player,terrainBlocked),false);
 assert.ok(LISTENER_CONTACT_RADIUS>1.5&&LISTENER_CONTACT_RADIUS<2.1);
 const rear={x:POWER_PANEL[0],z:POWER_PANEL[1]-.78};
 const front={x:POWER_PANEL[0],z:POWER_PANEL[1]+.78};
 assert.equal(canListenerCatch(rear,front,terrainBlocked),false);
});
test('stalled goal tracking forces replan without changing the auditory target',()=>{
 assert.equal(shouldReplanOnStall(8.0,8.01,.95),true);
 assert.equal(shouldReplanOnStall(8.0,6.8,.95),false);
 assert.equal(shouldReplanOnStall(8.0,8.01,.4),false);
});
