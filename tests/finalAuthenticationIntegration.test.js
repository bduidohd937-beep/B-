import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshGateAuthentication,advanceGateAuthentication,gateLiftRatio,canReadCctv} from '../src/exitAuthorization.js';
import {CCTV_STATION,reviewCctv,initialVehiclePuzzle,examineVehicle,vehicleGateOpen} from '../src/vehiclePuzzle.js';

const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
const escape=readFileSync(new URL('../src/EscapePuzzle.jsx',import.meta.url),'utf8');
const audio=readFileSync(new URL('../src/sound.js',import.meta.url),'utf8');
test('UI: physical CCTV auto closes at distance, J remote note removed',()=>{
 assert.match(app,/!canReadCctv\(camera\.position\.x,camera\.position\.z,CCTV_STATION\)/);
 assert.match(app,/onCctvOutOfRange\(\)/);
 assert.doesNotMatch(app,/setMemoOpen|KeyJ/);
 assert.doesNotMatch(app,/cctv-pocket-note/);
 assert.equal(canReadCctv(-18,15,CCTV_STATION),false);
});
test('UI: second-stage access uses a real key reader with sustained hold',()=>{
 assert.match(escape,/SECURITY_KEY_READER/);
 assert.match(app,/authentication=\{gateAuth\}/);
 assert.match(app,/advanceGateAuthentication\(gateAuthRef\.current/);
 assert.match(app,/holding:Boolean\(keys\.current\.KeyE\)/);
});
test('gate lift is tied to elapsed animation rather than just possession of the key',()=>{
 let stage=examineVehicle(reviewCctv(initialVehiclePuzzle()),'c17').state;
 let auth=freshGateAuthentication();
 assert.equal(vehicleGateOpen(2,false,stage,auth),false);
 auth={phase:'opening',hold:3.25,elapsed:1};
 assert.equal(vehicleGateOpen(2,false,stage,auth),false);
 assert.ok(gateLiftRatio(auth)>0&&gateLiftRatio(auth)<1);
 assert.match(escape,/gateLiftRatio\(authentication\)/);
});
test('siren, key-click and shutter-motor are separate sound cues',()=>{
 assert.match(app,/soundRef\.current\?\.startSiren\?\.\(position,EXIT_ALARM_SECONDS\)/);
 assert.match(app,/soundRef\.current\?\.startShutterMotor\?\./);
 assert.match(audio,/function securityKeyClick\(/);
 assert.match(audio,/function startShutterMotor\(/);
 assert.match(audio,/function stopShutterMotor\(/);
});
