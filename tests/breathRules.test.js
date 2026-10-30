import test from 'node:test';
import assert from 'node:assert/strict';
import {humanBreathProfile} from '../src/breathRules.js';
import {breathLoudness,breathHearingRadius} from '../src/survival.js';
test('breath gets deeper and faster without harsh broadband hiss on exhaustion',()=>{
 const quiet=humanBreathProfile(4),winded=humanBreathProfile(14),tired=humanBreathProfile(24);
 assert.ok(tired.interval<winded.interval&&winded.interval<quiet.interval);
 assert.ok(tired.gain>winded.gain&&winded.gain>quiet.gain);
 assert.ok(tired.pitch<450);
 assert.ok(tired.exhale>tired.inhale);
 assert.equal(humanBreathProfile(0).gain,0);
});
test('AI hearing remains controlled by actual fatigue, not player-only playback gain',()=>{
 assert.equal(breathLoudness(100),0);
 assert.ok(breathLoudness(5)>breathLoudness(35));
 assert.equal(breathHearingRadius(10),0);
 assert.ok(breathHearingRadius(22)>0);
});
