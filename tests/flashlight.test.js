import test from 'node:test';
import assert from 'node:assert/strict';
import {FLASHLIGHT_RUNTIME_SECONDS,FLASHLIGHT_DRAIN_PER_SECOND,BATTERY_PACK_RESTORE,
freshFlashlight,tickFlashlight,rechargeFlashlight,lowBatteryBrightness} from '../src/flashlightRules.js';
const simulate=(seconds,enabled=true,active=true)=>{
 let charge=freshFlashlight().charge;
 for(let i=0;i<Math.round(seconds/.05);i++)charge=tickFlashlight(charge,{dt:.05,enabled,active}).charge;
 return charge;
};
test('flashlight is finite and lasts approximately seven minutes at full brightness',()=>{
 assert.equal(freshFlashlight().charge,100);
 assert.equal(FLASHLIGHT_RUNTIME_SECONDS,420);
 assert.ok(FLASHLIGHT_DRAIN_PER_SECOND>0);
 assert.ok(simulate(210)>48&&simulate(210)<52);
 assert.ok(simulate(420)<.01);
 assert.equal(tickFlashlight(0,{dt:.05,active:true,enabled:true}).lit,false);
});
test('battery stops draining when flashlight is off or game paused',()=>{
 assert.equal(simulate(100,false),100);
 assert.equal(simulate(100,true,false),100);
 assert.equal(tickFlashlight(33,{dt:100,active:true,enabled:true}).charge,
   tickFlashlight(33,{dt:.1,active:true,enabled:true}).charge);
});
test('battery packs restore finite power while maintaining the 100 cap',()=>{
 assert.equal(BATTERY_PACK_RESTORE,45);
 assert.equal(rechargeFlashlight(0),45);
 assert.equal(rechargeFlashlight(60),100);
 assert.equal(rechargeFlashlight(-10),45);
});
test('low battery dims slowly without ever creating a black-out strobe',()=>{
 assert.equal(lowBatteryBrightness(0,0),0);
 assert.equal(lowBatteryBrightness(90,9),1);
 assert.equal(lowBatteryBrightness(10,9,true),1);
 for(let i=0;i<100;i++)assert.ok(lowBatteryBrightness(8,i*.13)>=.68);
 assert.notEqual(lowBatteryBrightness(8,0),lowBatteryBrightness(8,1));
});
