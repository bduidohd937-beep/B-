import test from 'node:test';
import assert from 'node:assert/strict';
import {cameraMotion} from '../src/cameraMotion.js';
import {STRIDE_METERS} from '../src/stealth.js';
test('camera running bob is larger than walking, both tied to distance per stride',()=>{
 const sprint=cameraMotion({mode:'sprint',distanceIntoStep:STRIDE_METERS.sprint/2,moving:true,intensity:1});
 const walk=cameraMotion({mode:'walk',distanceIntoStep:STRIDE_METERS.walk/2,moving:true,intensity:1});
 assert.ok(sprint.rise>walk.rise);
 assert.equal(cameraMotion({mode:'sprint',distanceIntoStep:STRIDE_METERS.sprint,moving:true,intensity:1}).rise,0);
});
test('side lean is modest and zero when stopped, airborne or reduced effects',()=>{
 const move=cameraMotion({mode:'sprint',distanceIntoStep:STRIDE_METERS.sprint/4,moving:true,intensity:1});
 assert.ok(Math.abs(move.roll)<.02);
 for(const args of [{moving:false},{moving:true,grounded:false},{moving:true,reducedEffects:true},{moving:true,intensity:0}])
  assert.deepEqual(cameraMotion({mode:'sprint',distanceIntoStep:STRIDE_METERS.sprint/4,...args}),{rise:0,roll:0});
});
test('shake slider clamps input and cannot produce wild camera motion',()=>{
 const motion=cameraMotion({mode:'sprint',distanceIntoStep:.5,moving:true,intensity:99});
 const bounded=cameraMotion({mode:'sprint',distanceIntoStep:.5,moving:true,intensity:1});
 assert.deepEqual(motion,bounded);
});
