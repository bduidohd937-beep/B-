import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 FOOTSTEP_ASSET_NAMES,FOOTSTEP_MATERIAL_SETS,pickRecordedStep,
 recordedFootstepDynamics,findFootstepOnset,trimFootstepBuffer,FOOTSTEP_MAX_SECONDS
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

test('first audible attack is aligned and each recorded step ends before a second heavy thump',()=>{
 const rate=10000,samples=new Float32Array(7000);
 for(let i=2300;i<2550;i++)samples[i]=.7;
 for(let i=4700;i<4900;i++)samples[i]=.85; // false second hit from source recording
 const start=findFootstepOnset(samples,rate);
 assert.ok(start>=2200&&start<=2330,'onset should skip lead silence');
 const ctx={
   createBuffer(channels,frames,sampleRate){
     const data=new Float32Array(frames);
     return {length:frames,sampleRate,numberOfChannels:channels,
       copyToChannel(src){data.set(src);},
       getChannelData(){return data;}
     };
   }
 };
 const original={length:samples.length,sampleRate:rate,numberOfChannels:1,
  getChannelData(){return samples;}};
 const clipped=trimFootstepBuffer(ctx,original);
 assert.ok(clipped.length/rate<=FOOTSTEP_MAX_SECONDS+.0001);
 assert.ok(clipped.getChannelData(0).some(v=>v>.5),'first hit remains');
 // The delayed recording hit at 0.47s must be trimmed completely.
 assert.equal(clipped.getChannelData(0).filter(v=>v>.8).length,0);
});
