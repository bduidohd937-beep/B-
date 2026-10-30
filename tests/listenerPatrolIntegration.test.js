import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {footstepLoudness,crouchHearingRadius} from '../src/stealth.js';
import {FIRST_GUARD_HOME,FIRST_GUARD_PATROL,breakerThreatDistance} from '../src/firstFloorThreat.js';
import {POWER_PANEL} from '../src/puzzle.js';

const listener=readFileSync(new URL('../src/Listener.jsx',import.meta.url),'utf8');
const model=readFileSync(new URL('../src/ListenerModel.jsx',import.meta.url),'utf8');
const spatial=readFileSync(new URL('../src/spatialAudio.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');

test('stage-one Listener actually uses breaker-side HOME, not only an unused constant',()=>{
  assert.match(listener,/new THREE\.Vector3\(FIRST_GUARD_HOME\[0\],0,FIRST_GUARD_HOME\[1\]\)/);
  assert.match(listener,/const home=floor===2\?LOOP_BASE:BASE;/);
  assert.match(listener,/state\.current=floor===1\?'patrol':'idle'/);
  assert.match(listener,/state\.current==='patrol'/);
  assert.match(listener,/nextFirstGuardWaypoint\(patrolIndex\.current,pos\)/);
  assert.equal(breakerThreatDistance(FIRST_GUARD_HOME)<11,true);
  assert.deepEqual(POWER_PANEL,[17,-22]);
});
test('patrol has motion and occluded footsteps, not a silent moving sculpture',()=>{
  assert.match(model,/m\.state==='patrol'/);
  assert.match(spatial,/state === 'patrol'/);
  assert.match(listener,/onSpatial\?\.\(\{/);
  assert.match(listener,/buildRoute\(pos,destination,powered,shortcutOpen\)/);
});
test('monster still investigates actual sound events, never omniscient player targeting',()=>{
  assert.match(listener,/target\.current\.copy\(point\)/);
  assert.match(listener,/new THREE\.Vector3\(event\.position\[0\],0,event\.position\[2\]\)/);
  assert.equal(footstepLoudness('walk'),35);
  assert.equal(footstepLoudness('sprint'),90);
  assert.equal(footstepLoudness('crouch'),8);
  assert.ok(crouchHearingRadius(0,8)<4);
  assert.ok(FIRST_GUARD_PATROL.length>=4);
});
test('camera boot fix / F3 props and second-stage Observer are preserved',()=>{
  assert.match(app,/throwAimRef,perfVisible,onPerformance \}\) \{/);
  assert.match(app,/<PerformanceSampler enabled=\{perfVisible\} onSample=\{onPerformance\}/);
  assert.match(app,/floor===2&&<Observer/);
  assert.match(app,/<Listener active=\{active\}/);
});
