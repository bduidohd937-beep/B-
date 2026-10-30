import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SIREN_VOLUME,clampSirenVolume} from '../src/emergencyAudio.js';
test('siren has a non-maximum opt-in default volume',()=>{
 assert.ok(DEFAULT_SIREN_VOLUME>=.4&&DEFAULT_SIREN_VOLUME<=.8);
 assert.equal(clampSirenVolume(NaN),DEFAULT_SIREN_VOLUME);
});
test('siren volume is bounded and cannot exceed compressor gain control',()=>{
 assert.equal(clampSirenVolume(-3),0);
 assert.equal(clampSirenVolume(2),1);
 assert.equal(clampSirenVolume(.55),.55);
});
