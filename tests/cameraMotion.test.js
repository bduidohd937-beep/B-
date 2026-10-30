import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cameraMotion} from '../src/cameraMotion.js';
import {STRIDE_METERS} from '../src/stealth.js';

test('only real grounded sprint makes a tiny vertical camera bob',()=>{
  const distance=STRIDE_METERS.sprint/2;
  const sprint=cameraMotion({mode:'sprint',distanceIntoStep:distance,moving:true,intensity:1});
  assert.ok(sprint.rise>0&&sprint.rise<=.042);
  assert.deepEqual(Object.keys(sprint),['rise']);
  for(const mode of ['idle','walk','crouch','jump']){
    assert.deepEqual(cameraMotion({mode,distanceIntoStep:distance,moving:true,intensity:1}),{rise:0});
  }
});
test('moving mouse while stationary, colliding or airborne never shakes',()=>{
  const distance=STRIDE_METERS.sprint/2;
  for(const args of [
    {moving:false},{moving:true,grounded:false},
    {moving:true,reducedEffects:true},{moving:true,intensity:0}
  ])assert.deepEqual(cameraMotion({mode:'sprint',distanceIntoStep:distance,...args}),{rise:0});
});
test('bob ends at footfall boundary and stays bounded at 100 percent',()=>{
  assert.equal(cameraMotion({mode:'sprint',distanceIntoStep:STRIDE_METERS.sprint,moving:true,intensity:1}).rise,0);
  assert.equal(cameraMotion({mode:'sprint',distanceIntoStep:0,moving:true,intensity:1}).rise,0);
  assert.deepEqual(
    cameraMotion({mode:'sprint',distanceIntoStep:.8,moving:true,intensity:99}),
    cameraMotion({mode:'sprint',distanceIntoStep:.8,moving:true,intensity:1})
  );
});
test('regression: PointerLock camera yaw pitch cannot be overwritten by headbob',()=>{
  const source=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/camera\.rotation\.z\s*=\s*tiltSmooth\.current/);
  assert.doesNotMatch(source,/camera\.rotation\.z\s*=\s*cameraOffsets\./);
});
