import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {motionExposure,sightBlocked} from '../src/observerRules.js';
import {observerSoundCue,observerSoundProfile} from '../src/observerAudioRules.js';

const observer=readFileSync(new URL('../src/Observer.jsx',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const sound=readFileSync(new URL('../src/sound.js',import.meta.url),'utf8');
const spatial=readFileSync(new URL('../src/observerSpatialAudio.js',import.meta.url),'utf8');
const listener=readFileSync(new URL('../src/Listener.jsx',import.meta.url),'utf8');

test('Observer audio gets live actual world position, never virtual player tracking',()=>{
 assert.match(observer,/const \{camera\}=useThree\(\)/);
 assert.match(observer,/position:\[pos\.x,2\.0,pos\.z\]/);
 assert.match(observer,/listenerPosition:\[eye\.x,eye\.y,eye\.z\]/);
 assert.match(observer,/state:status,suspicion:suspicion\.current/);
 assert.match(observer,/onSpatial\?\.\(\{active:false\}\)/);
 assert.doesNotMatch(observer,/onNoise\?\./);
});
test('Observer update path is connected through World into separate persistent WebAudio channel',()=>{
 assert.match(app,/onObserverState, onSpatialObserver, boostSignal/);
 assert.match(app,/<Observer[^>]*onSpatial=\{onSpatialObserver\}/);
 assert.match(app,/onSpatialObserver=\{onSpatialObserver\}/);
 assert.match(app,/soundRef\.current\?\.updateObserver\?\.\(data\)/);
 assert.match(sound,/createSpatialObserverAudio\(ctx, master, noiseBuffer\)/);
 assert.match(sound,/updateObserver: observerAudio\.update/);
 assert.match(sound,/observerAudio\.dispose\(\)/);
 assert.doesNotMatch(app,/if\(mode==='chase'\)soundRef\.current\?\.observerAlert/);
});
test('alert chirps once, chase has continuous approach and 3D paced footsteps',()=>{
 assert.match(spatial,/const panner=ctx\.createPanner\(\)/);
 assert.match(spatial,/panner\.panningModel='HRTF'/);
 assert.match(spatial,/observerSoundCue\(mode,next,true\)/);
 assert.match(spatial,/if\(transition&&distance<OBSERVER_AUDIO_RANGE\)cue\(transition,t\)/);
 assert.match(spatial,/motorGain\.gain\.setTargetAtTime\(profile\.gain/);
 assert.match(spatial,/if\(profile\.steps&&t>=nextFootfall\)/);
 assert.match(spatial,/footfall\(t,close\)/);
 assert.equal(observerSoundCue('scan','alert'),'detected');
 assert.equal(observerSoundCue('alert','chase'),'lock');
 assert.ok(observerSoundProfile('chase',3).gain>observerSoundProfile('chase',30).gain);
});
test('sight rules still depend on movement and occlusion; Listener never hears synthetic Observer effects',()=>{
 assert.equal(motionExposure({distance:5,dot:1,speed:0}),0);
 assert.equal(motionExposure({distance:5,dot:1,speed:2,blocked:true}),0);
 assert.ok(motionExposure({distance:5,dot:1,speed:4})>0);
 assert.equal(sightBlocked({x:0,z:0},{x:0,z:-10},[[0,-5]],[]),true);
 assert.match(listener,/target\.current\.copy\(point\)/);
 assert.doesNotMatch(spatial,/onNoise\s*\(/);
 assert.match(app,/soundRef\.current\?\.updateObserver\?\.\(\{active:false\}\)/);
});
test('F3 boot fix and first-floor guard remain in current branch',()=>{
 assert.match(app,/throwAimRef,perfVisible,onPerformance \}\) \{/);
 assert.match(app,/<PerformanceSampler enabled=\{perfVisible\} onSample=\{onPerformance\}/);
 assert.match(listener,/state\.current=floor===1\?'patrol':'idle'/);
});
