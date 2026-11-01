import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  passageAllowed, doorCloseObstructed, doorLeafDistance,
  canRecordVideoMismatch, DOOR_OPEN_ANGLE
} from '../src/rezero/rules.js';

test('door is a rotating barrier: a tiny opening never counts as passable',()=>{
  const atThreshold={x:2.8,z:1.1};
  assert.equal(passageAllowed(atThreshold,0),false);
  assert.equal(passageAllowed(atThreshold,-.18),false);
  assert.equal(passageAllowed(atThreshold,-.7),false);
  assert.equal(passageAllowed(atThreshold,DOOR_OPEN_ANGLE),true);
});

test('door must never close through a player occupying its sweep',()=>{
  assert.equal(doorCloseObstructed({x:2.91,z:1.0},-.6),true);
  assert.equal(doorCloseObstructed({x:-1.8,z:1.0},-.6),false);
  assert.ok(doorLeafDistance({x:3.18,z:.32},-.65)<.001);
});

test('video mismatch requires an actual lamp test and correct feed',()=>{
  assert.equal(canRecordVideoMismatch(false,'cam2'),false);
  assert.equal(canRecordVideoMismatch(true,'cam1'),false);
  assert.equal(canRecordVideoMismatch(true,'cam2'),true);
});

test('CCTV uses actual WebGL feeds without an unrelated SVG video',()=>{
  const app=readFileSync('src/rezero/FirstRoom.jsx','utf8');
  assert.match(app,/map=\{i===0\?feed1\.texture:feed2\.texture\}/);
  assert.match(app,/feeds\.current\.visible = false/);
  assert.doesNotMatch(app,/function CameraGraphic\(/);
  assert.match(app,/role="dialog" aria-label="실제 CCTV 화면/);
});

test('CCTV pointer-lock handoff and return happen through the user click',()=>{
  const app=readFileSync('src/rezero/FirstRoom.jsx','utf8');
  assert.match(app,/document\.exitPointerLock\?\.\(\)/);
  assert.match(app,/flushSync\(\(\)=>setPanel\(null\)\)/);
  assert.match(app,/return !panel \? <PointerLockControls\/>/);
  assert.match(app,/canvas\?\.requestPointerLock\?\.\(\)/);
});

test('door has spring dynamics, closer and positional latch sound',()=>{
  const app=readFileSync('src/rezero/FirstRoom.jsx','utf8');
  assert.match(app,/const acceleration = \(target - d\.angle\)/);
  assert.match(app,/doorCloseObstructed\(playerPosition\.current, nextAngle\)/);
  assert.match(app,/d\.phase = 'holding'/);
  assert.match(app,/d\.phase = 'closed'/);
});
