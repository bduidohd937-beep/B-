import test from 'node:test';
import assert from 'node:assert/strict';
import {canTriggerSiren,sirenPosition,sirenPulse,rushSpeed,SIREN_SECONDS,SIREN_HEARING_RADIUS,RUSH_SPEED} from '../src/alarmRules.js';
test('first unpowered hold triggers the siren even when lubricated',()=>{
 assert.equal(canTriggerSiren(),true);
 assert.equal(canTriggerSiren({silent:true}),true);
 assert.equal(canTriggerSiren({powered:true}),false);
 assert.equal(canTriggerSiren({alreadyTriggered:true}),false);
});
test('alarm is tied to breaker position, not player position',()=>{
 assert.deepEqual(sirenPosition(1),[-16,1.7,-25]);
 assert.deepEqual(sirenPosition(2),[16,1.7,-25]);
});
test('loud alarm travels widely and triggers genuinely rapid Listener rush',()=>{
 assert.equal(SIREN_HEARING_RADIUS>=80,true);
 assert.equal(RUSH_SPEED>6.2,true);
 assert.equal(SIREN_SECONDS>=8,true);
 assert.equal(rushSpeed(6),RUSH_SPEED);
 assert.ok(rushSpeed(0,100)<RUSH_SPEED);
});
test('reduced-motion pulse is steady, normal siren pulsing varies',()=>{
 assert.equal(sirenPulse(0,false),0);
 assert.equal(sirenPulse(0,true,true),.75);
 assert.equal(sirenPulse(.25,true,true),.75);
 assert.notEqual(sirenPulse(0),sirenPulse(.25));
 for(const t of [0,.1,1,4,10])assert.ok(sirenPulse(t)>=.4 && sirenPulse(t)<=1);
});
