import test from 'node:test';
import assert from 'node:assert/strict';
import { planarDistance, phantomVisibility, shadowVisibility, shouldPlayPhantomCue, shouldGlitchExit } from '../src/horrorRules.js';

test('a phantom vehicle gradually fades as the player approaches',()=>{
  assert.equal(phantomVisibility(1),0);
  assert.equal(phantomVisibility(2.8),0);
  assert.ok(phantomVisibility(5)>.3&&phantomVisibility(5)<.6);
  assert.equal(phantomVisibility(8),1);
  assert.equal(phantomVisibility(20),1);
});

test('phantom cue is triggered once within range',()=>{
  assert.equal(shouldPlayPhantomCue(5,false),false);
  assert.equal(shouldPlayPhantomCue(4,false),true);
  assert.equal(shouldPlayPhantomCue(4,true),false);
});

test('staring at the phantom CCTV figure removes it',()=>{
  assert.equal(shadowVisibility(12,1),0);
  assert.ok(shadowVisibility(12,.6)>0 && shadowVisibility(12,.6)<1);
  assert.ok(shadowVisibility(12,-1)>.95);
  assert.equal(shadowVisibility(1,-1),0);
});

test('false EXIT only triggers nearby once',()=>{
  assert.equal(shouldGlitchExit(11,false),false);
  assert.equal(shouldGlitchExit(6,false),true);
  assert.equal(shouldGlitchExit(6,true),false);
});

test('sound cues cannot change gameplay geometry',()=>{
  assert.equal(planarDistance(0,0,3,4),5);
  assert.equal(planarDistance(-3,-4,-3,-4),0);
});
