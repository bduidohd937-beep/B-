import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 FOOTSTEP_ASSET_NAMES,FOOTSTEP_MATERIAL_SETS,pickRecordedStep,
 recordedFootstepDynamics
} from '../src/recordedFootsteps.js';

test('licensed original recordings exist and each file is a valid Ogg container',()=>{
 for(const name of FOOTSTEP_ASSET_NAMES){
  const encoded=readFileSync(new URL('../public/audio/footsteps/'+name+'.b64',import.meta.url),'utf8').trim();
  const bytes=Buffer.from(encoded,'base64');
  assert.equal(bytes.subarray(0,4).toString(),'OggS');
  assert.ok(bytes.byteLength>3000);
 }
 const license=readFileSync(new URL('../public/audio/footsteps/LICENSE.md',import.meta.url),'utf8');
 assert.match(license,/CC0 1\.0/);
 assert.match(license,/kenney\.nl\/assets\/impact-sounds/);
 assert.match(license,/kenney\.nl\/assets\/rpg-audio/);
});
test('recordings rotate by footwear and surface with softer crouching',()=>{
 assert.equal(FOOTSTEP_ASSET_NAMES.length,5);
 for(const surface of Object.keys(FOOTSTEP_MATERIAL_SETS)){
  for(let i=0;i<10;i++)assert.ok(FOOTSTEP_MATERIAL_SETS[surface].includes(pickRecordedStep(surface,i)));
  const walk=recordedFootstepDynamics('walk',surface,2);
  assert.ok(recordedFootstepDynamics('crouch',surface,2).gain<walk.gain);
  assert.ok(recordedFootstepDynamics('sprint',surface,2).gain>walk.gain);
  assert.ok(walk.playbackRate>.8&&walk.playbackRate<1.2);
 }
});
test('game uses decoded audio buffer playback not white-noise double contact',()=>{
 const sound=readFileSync(new URL('../src/sound.js',import.meta.url),'utf8');
 assert.match(sound,/loadRecordedFootsteps\(ctx\)/);
 assert.match(sound,/source\.buffer=recorded/);
 assert.doesNotMatch(sound,/contact\(f\.heelHz/);
});
