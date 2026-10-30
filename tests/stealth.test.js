import test from 'node:test';
import assert from 'node:assert/strict';
import { tickFootsteps, footstepLoudness, crouchReaction, crouchHearingRadius } from '../src/stealth.js';

test('initial grounded movement makes an audible first footstep', () => {
  const result = tickFootsteps(null, {distance:.07, grounded:true, mode:'walk', dt:.02});
  assert.equal(result.steps, 1);
});

test('rapid short W taps cannot travel indefinitely without audible steps', () => {
  let state;
  let steps=0;
  // Simulates 80 ms presses separated by 80 ms: old time-only cadence missed all.
  for(let i=0;i<24;i++){
    const press=tickFootsteps(state, {distance:.25,grounded:true,mode:'walk',dt:.08});
    state=press.state;steps+=press.steps;
    const release=tickFootsteps(state,{distance:0,grounded:true,mode:'walk',dt:.08});
    state=release.state;steps+=release.steps;
  }
  assert.ok(steps>=6, 'steps='+steps);
});

test('step distance persists through brief pauses even if first impact is throttled', () => {
  let state={meters:1.42,elapsed:.07,moving:false};
  let tick=tickFootsteps(state,{distance:.13,grounded:true,mode:'walk',dt:.03});
  assert.equal(tick.steps,0);
  assert.ok(tick.state.meters>1.5);
  tick=tickFootsteps(tick.state,{distance:.06,grounded:true,mode:'walk',dt:.08});
  assert.equal(tick.steps,1);
});

test('stationary player and blocked movement cannot generate footsteps', () => {
  let state;
  for(let i=0;i<50;i++){
    const tick=tickFootsteps(state,{distance:0,grounded:true,mode:'sprint',dt:.02});
    assert.equal(tick.steps,0);state=tick.state;
  }
});

test('in-air movement does not create ground footsteps', () => {
  const tick=tickFootsteps(null,{distance:.65,grounded:false,mode:'sprint',dt:.1});
  assert.equal(tick.steps,0);
  assert.equal(tick.state.meters,0);
});

test('crouch remains quiet on concrete but makes more noise on metal', () => {
  assert.equal(footstepLoudness('crouch','concrete'),8);
  assert.equal(footstepLoudness('crouch','metal'),12);
  assert.equal(footstepLoudness('walk','concrete'),35);
  assert.equal(footstepLoudness('sprint','metal'),100);
});

test('crouch hearing near creature causes suspicious listening, not omniscient pursuit', () => {
  assert.equal(crouchReaction(7), 'none');
  assert.equal(crouchReaction(2.3), 'listen');
  assert.equal(crouchReaction(1.5), 'investigate');
  assert.ok(crouchHearingRadius(100) > crouchHearingRadius(0));
});

test('loud sounds can be detected farther away than quiet crouching', () => {
  assert.ok(crouchHearingRadius(100) <= 4.1);
  assert.ok(crouchHearingRadius(0) >= 2.7);
});
