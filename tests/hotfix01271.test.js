import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 canOperatePanel,canHoldPanel,POWER_PANEL,gateBlocksPlayer
} from '../src/puzzle.js';
import {gatePowerAfterRespawn,shouldRelockBreakerOnRespawn} from '../src/respawnRules.js';
import {terrainBlocked} from '../src/garageLayout.js';
import {canListenerCatch,reachableSoundTarget,BREAKER_APPROACH} from '../src/listenerContactRules.js';
import {freshGateAuthentication,gatePassable} from '../src/exitAuthorization.js';

const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const listener=readFileSync(new URL('../src/Listener.jsx',import.meta.url),'utf8');
const sound=readFileSync(new URL('../src/sound.js',import.meta.url),'utf8');
const observer=readFileSync(new URL('../src/observerSpatialAudio.js',import.meta.url),'utf8');

test('starting breaker hold requires gaze, continued E hold allows looking behind',()=>{
 const eye=[POWER_PANEL[0],1.7,POWER_PANEL[1]+1.5];
 assert.equal(canOperatePanel(eye,[0,-.4,-1]),true);
 assert.equal(canOperatePanel(eye,[0,-.4,1]),false);
 assert.equal(canHoldPanel(eye[0],eye[2],1),true);
 assert.equal(canHoldPanel(eye[0],POWER_PANEL[1]-.8,1),false);
 assert.equal(canHoldPanel(eye[0],POWER_PANEL[1]+2.6,1),false);
 assert.match(app,/panelHeld\.current&&keys\.current\.KeyE\s*\?canHoldPanel/);
 assert.match(app,/!firstPowerRef\.current && nearPanel && keys\.current\.KeyE/);
 assert.match(app,/else if\(panelHeld\.current\)\{\s*panelHeld\.current=false/);
});

test('loud breaker siren drives a REAL catchable front approach, never interior target',()=>{
 const panel=[POWER_PANEL[0],1.5,POWER_PANEL[1]];
 const goal=reachableSoundTarget(panel,'siren',1);
 assert.deepEqual([goal.x,goal.z],BREAKER_APPROACH);
 assert.equal(terrainBlocked(goal.x,goal.z,false),false);
 assert.equal(canListenerCatch({x:goal.x-.7,z:goal.z+.05},{x:goal.x,z:goal.z},(x,z)=>terrainBlocked(x,z,false)),true);
 assert.match(listener,/reachableSoundTarget\(event\.position,event\.type,floor\)/);
 assert.match(listener,/target\.current\.copy\(point\)/);
 assert.match(listener,/canListenerCatch\(pos,player/);
 assert.match(listener,/noProgressTime\.current\+=dt/);
});

test('first-floor death re-locks shutter, but loop-two timing system stays intact',()=>{
 assert.equal(shouldRelockBreakerOnRespawn(1),true);
 assert.equal(gatePowerAfterRespawn(1,true),false);
 assert.equal(gatePowerAfterRespawn(1,false),false);
 assert.equal(gateBlocksPlayer(0,-38,gatePowerAfterRespawn(1,true)),true);
 assert.equal(gatePowerAfterRespawn(2,true),true);
 assert.equal(gatePassable(freshGateAuthentication()),false);
 assert.match(app,/setPowered\(old=>gatePowerAfterRespawn\(floorRef\.current,old\)\)/);
 assert.match(app,/setGateAuth\(freshGateAuthentication\(\)\)/);
 assert.match(app,/setPanelProgress\(0\)/);
});

test('death sound removes all tonal glissando and the Observer mosquito drone',()=>{
 const start=sound.indexOf('  function death() {');
 const end=sound.indexOf('\n  return {\n    step',start);
 assert.ok(start>=0&&end>start);
 const death=sound.slice(start,end);
 assert.doesNotMatch(death,/createOscillator|scream\.frequency|thud\.frequency/);
 assert.match(death,/hit\(\.08,570,'lowpass'/);
 assert.doesNotMatch(observer,/createOscillator|type='sawtooth'/);
 assert.match(observer,/motor\.buffer=sharedNoise;motor\.loop=true/);
 assert.doesNotMatch(observer,/onNoise\s*\(/);
});

test('recorded footsteps replace procedural white-noise tapping without changing AI hearing',()=>{
 assert.match(sound,/loadRecordedFootsteps\(ctx\)/);
 assert.match(sound,/source\.buffer=recorded/);
 assert.doesNotMatch(sound,/shoeFootstep\(mode,surface/);
});
