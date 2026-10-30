import test from 'node:test';
import assert from 'node:assert/strict';
import {
  observerSoundCue,observerSoundProfile,
  OBSERVER_AUDIO_MAX_GAIN,OBSERVER_AUDIO_RANGE,OBSERVER_STEP_INTERVAL
} from '../src/observerAudioRules.js';

test('first moving detection chirps, full target lock triggers distinct chase stinger',()=>{
 assert.equal(observerSoundCue('scan','alert'),'detected');
 assert.equal(observerSoundCue('alert','alert'),null);
 assert.equal(observerSoundCue('alert','chase'),'lock');
 assert.equal(observerSoundCue('chase','chase'),null);
 assert.equal(observerSoundCue('chase','search'),'lost');
 assert.equal(observerSoundCue('search','return'),null);
 assert.equal(observerSoundCue('return','scan'),null);
 assert.equal(observerSoundCue('scan','alert',false),null);
});
test('chasing machine grows audibly closer but output stays limited',()=>{
 const far=observerSoundProfile('chase',31,1);
 const near=observerSoundProfile('chase',4,1);
 assert.ok(far.gain>0&&near.gain>far.gain);
 assert.ok(near.gain<=OBSERVER_AUDIO_MAX_GAIN);
 assert.ok(near.lowpass>far.lowpass);
 assert.equal(near.steps,true);
 assert.equal(observerSoundProfile('chase',OBSERVER_AUDIO_RANGE+1).steps,false);
 assert.equal(OBSERVER_STEP_INTERVAL>=.35,true);
});
test('scanning is quiet, lost search falls off, invalid distances never amplify',()=>{
 assert.equal(observerSoundProfile('scan',1).gain,0);
 assert.equal(observerSoundProfile('return',1).gain,0);
 assert.equal(observerSoundProfile('patrol',1).gain,0);
 assert.ok(observerSoundProfile('alert',7,1).gain>0);
 assert.ok(observerSoundProfile('search',7).gain<observerSoundProfile('chase',7).gain);
 assert.equal(observerSoundProfile('chase',Infinity).gain,.10);
 assert.ok(observerSoundProfile('chase',NaN).gain<=OBSERVER_AUDIO_MAX_GAIN);
});
