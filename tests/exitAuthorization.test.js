import test from 'node:test';
import assert from 'node:assert/strict';
import {
 SECURITY_KEY_READER,KEY_HOLD_SECONDS,SHUTTER_RAISE_SECONDS,
 SHUTTER_PASS_SECONDS,CCTV_MAX_DISTANCE,EXIT_ALARM_LOUDNESS,
 canReadCctv,canUseKeyReader,freshGateAuthentication,
 advanceGateAuthentication,gatePassable,gateLiftRatio,keyHoldProgress
} from '../src/exitAuthorization.js';
import {CCTV_STATION,initialVehiclePuzzle,vehicleGateOpen,reviewCctv,examineVehicle} from '../src/vehiclePuzzle.js';
import {terrainBlocked} from '../src/garageLayout.js';

function step(state,seconds,options={}){
 let current=state,eventCounts={};
 for(let i=0;i<Math.round(seconds/.05);i++){
  const t=advanceGateAuthentication(current,{dt:.05,active:true,hasKey:true,near:true,holding:true,...options});
  current=t.state;
  if(t.event)eventCounts[t.event]=(eventCounts[t.event]||0)+1;
 }
 return {state:current,events:eventCounts};
}
test('computer screen range belongs to a physical station, J note is separate',()=>{
 assert.ok(canReadCctv(CCTV_STATION[0],CCTV_STATION[2]+3,CCTV_STATION));
 assert.equal(canReadCctv(CCTV_STATION[0],CCTV_STATION[2]+CCTV_MAX_DISTANCE+.1,CCTV_STATION),false);
 assert.equal(canReadCctv(0,17,CCTV_STATION),false);
 assert.equal(canReadCctv(NaN,0,CCTV_STATION),false);
});
test('reader is reachable by walking, but cannot be activated from far away',()=>{
 assert.ok(canUseKeyReader(SECURITY_KEY_READER[0],SECURITY_KEY_READER[2]));
 assert.equal(canUseKeyReader(0,17),false);
 assert.equal(terrainBlocked(SECURITY_KEY_READER[0],SECURITY_KEY_READER[2],false),false);
});
test('key must be found first; holding from far away cannot advance',()=>{
 for(const opts of [{hasKey:false},{near:false},{holding:false}]){
  assert.deepEqual(step(freshGateAuthentication(),6,opts).state,freshGateAuthentication());
 }
 assert.equal(vehicleGateOpen(2,true,{solved:true},freshGateAuthentication()),false);
});
test('key insertion instantly starts ONE siren without waiting for full E hold',()=>{
 const first=advanceGateAuthentication(freshGateAuthentication(),{dt:.05,active:true,hasKey:true,near:true,holding:true});
 assert.equal(first.event,'alarm');
 assert.equal(first.state.hold,.05);
 assert.equal(first.state.alarmRaised,true);
 const continued=advanceGateAuthentication(first.state,{dt:.05,active:true,hasKey:true,near:true,holding:true});
 assert.equal(continued.event,null);
 assert.equal(continued.state.phase,'authenticating');
 assert.ok(keyHoldProgress(continued.state)<1);
});
test('releasing E aborts key turn but NEVER rolls back or restarts siren',()=>{
 const first=step(freshGateAuthentication(),1.5);
 assert.equal(first.events.alarm,1);
 const cancelled=advanceGateAuthentication(first.state,{dt:.05,active:true,near:false,holding:false,hasKey:true});
 assert.equal(cancelled.event,'cancel');
 assert.equal(cancelled.state.phase,'locked');
 assert.equal(cancelled.state.hold,0);
 assert.equal(cancelled.state.alarmRaised,true);
 const retry=step(cancelled.state,KEY_HOLD_SECONDS+.2);
 assert.equal(retry.events.alarm,undefined);
 assert.equal(retry.events.insert,1);
 assert.equal(retry.events.motor,1);
});
test('successful hold starts shutter MOTOR once, player can hide after that',()=>{
 const first=step(freshGateAuthentication(),KEY_HOLD_SECONDS+.25);
 assert.equal(first.events.alarm,1);
 assert.equal(first.events.motor,1);
 assert.equal(first.state.phase,'opening');
 assert.equal(gatePassable(first.state),false);
 const waiting=step(first.state,SHUTTER_PASS_SECONDS-.2,{near:false,holding:false});
 assert.equal(gatePassable(waiting.state),false);
 const cleared=step(waiting.state,.3,{near:false,holding:false});
 assert.equal(gatePassable(cleared.state),true);
 assert.ok(gateLiftRatio(cleared.state)>0&&gateLiftRatio(cleared.state)<1);
 assert.equal(EXIT_ALARM_LOUDNESS,100);
});
test('pause freezes shutter and once fully opened it stays open',()=>{
 const ready=step(freshGateAuthentication(),KEY_HOLD_SECONDS+.2).state;
 const frozen=advanceGateAuthentication(ready,{dt:2,active:false,near:false,holding:false,hasKey:true});
 assert.deepEqual(frozen.state,ready);
 const opened=step(ready,SHUTTER_RAISE_SECONDS+.1,{near:false,holding:false});
 assert.equal(opened.state.phase,'open');
 assert.equal(gateLiftRatio(opened.state),1);
 assert.equal(advanceGateAuthentication(opened.state,{dt:.05,active:true}).event,null);
});
test('stage 1 gate remains independent of the key and late stage cannot be skipped',()=>{
 let key=examineVehicle(reviewCctv(initialVehiclePuzzle()),'c17').state;
 assert.equal(vehicleGateOpen(1,true,key,freshGateAuthentication()),true);
 assert.equal(vehicleGateOpen(1,false,key,{phase:'open',elapsed:10}),false);
 assert.equal(vehicleGateOpen(2,false,key,freshGateAuthentication()),false);
 assert.ok(SHUTTER_RAISE_SECONDS>SHUTTER_PASS_SECONDS);
});
