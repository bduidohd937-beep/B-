import test from 'node:test';
import assert from 'node:assert/strict';
import {noiseSeverity,staminaSeverity,inventoryControls,observerCue} from '../src/uiRules.js';
test('NOISE threshold changes color at 70 but does not fluctuate below',()=>{
  assert.equal(noiseSeverity(0),'quiet');
  assert.equal(noiseSeverity(34),'quiet');
  assert.equal(noiseSeverity(35),'warning');
  assert.equal(noiseSeverity(69),'warning');
  assert.equal(noiseSeverity(70),'danger');
  assert.equal(noiseSeverity(100),'danger');
});
test('unsafe noise values cannot break the HUD severity',()=>{
  assert.equal(noiseSeverity(NaN),'quiet');
  assert.equal(noiseSeverity(-30),'quiet');
  assert.equal(noiseSeverity(200),'danger');
});
test('stamina urgency emphasizes numeric low-stamina warning',()=>{
  assert.equal(staminaSeverity(100),'stable');
  assert.equal(staminaSeverity(45),'tired');
  assert.equal(staminaSeverity(25),'low');
  assert.equal(staminaSeverity(0),'low');
});
test('empty backpack never advertises unusable G or Q keys',()=>{
  assert.deepEqual(inventoryControls(null),{use:false,drop:false});
  assert.deepEqual(inventoryControls('can'),{use:true,drop:false});
  assert.deepEqual(inventoryControls('alarm'),{use:true,drop:true});
});
test('observer clue reflects motion sensing, not noise or X-ray tracking',()=>{
  assert.match(observerCue('chase',5),/움직임/);
  assert.match(observerCue('alert',8),/움직임/);
  assert.match(observerCue('search',30),/시야가 끊어/);
  assert.match(observerCue('scan',22),/시야/);
});
