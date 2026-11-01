import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { aimCameraAt, monitorLookTarget, SEAT } from '../src/rezero/seatedCamera.js';

test('seated surveillance camera points at physical monitors using camera -Z',()=>{
  const pos=new THREE.Vector3(SEAT.x,SEAT.y,SEAT.z);
  for(const selection of [null,'cam1','cam2']){
    const target=new THREE.Vector3(...monitorLookTarget(selection));
    const q=aimCameraAt(pos,target,new THREE.Quaternion());
    const forward=new THREE.Vector3(0,0,-1).applyQuaternion(q).normalize();
    const expected=target.clone().sub(pos).normalize();
    assert.ok(forward.dot(expected)>.999999,'Incorrect camera aim for '+selection);
  }
});

test('CAM 01 and CAM 02 select different physical monitor positions',()=>{
  const a=monitorLookTarget('cam1'),b=monitorLookTarget('cam2');
  assert.ok(a[0]<b[0]);
  assert.equal(a[2],b[2]);
});

test('seated mode frees pointer lock, supports right-drag and remounts FPS controls on exit',()=>{
  const src=readFileSync('src/rezero/FirstRoom.jsx','utf8');
  assert.match(src,/id: 'chair'/);
  assert.match(src,/id==='chair'/);
  assert.match(src,/function Surveillance\(/);
  assert.match(src,/role="dialog" aria-label="실제 CCTV 화면/);
  assert.match(src,/if\(e\.button===2\).*drag\.pressed=true/);
  assert.match(src,/window\.addEventListener\('mousemove',mouseMove\)/);
  assert.match(src,/document\.exitPointerLock\?\.\(\)/);
  assert.match(src,/return !panel \? <PointerLockControls\/> : null/);
  assert.match(src,/aimCameraAt\(seatPosition,seatTarget,seatQuaternion\)/);
  assert.match(src,/flushSync\(\(\)=>setPanel\(null\)\)/);
});

test('first incident content remains out of scope in patch A',()=>{
  const src=readFileSync('src/rezero/FirstRoom.jsx','utf8');
  assert.match(src,/V0\.4\.2-A/);
  assert.match(src,/공포 사건 미구현/);
});
