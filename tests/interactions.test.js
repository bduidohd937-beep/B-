import test from 'node:test';
import assert from 'node:assert/strict';
import {itemActionNoise,mechanicalNoise,gazeFocus,nearestLookedAtPickup,LUBRICATED_MECHANICAL_MULTIPLIER} from '../src/interactions.js';
test('every item pickup, use and drop makes some real AI sound',()=>{
 for(const item of ['can','alarm','radio','glow','energy','lube','battery']){
   for(const action of ['pickup','use','drop'])assert.ok(itemActionNoise(item,action)>0,`${item}:${action}`);
 }
});
test('crouch manipulations are quieter but not completely silent',()=>{
 assert.ok(itemActionNoise('lube','pickup',{crouching:true})<itemActionNoise('lube','pickup'));
 assert.ok(itemActionNoise('radio','drop',{crouching:true})<itemActionNoise('radio','drop'));
 assert.ok(itemActionNoise('radio','drop',{crouching:true})>0);
 assert.equal(itemActionNoise('energy','use',{crouching:true}),itemActionNoise('energy','use'));
});
test('lubricant attenuates mechanics but never zeroes them or the electronic siren',()=>{
 assert.ok(LUBRICATED_MECHANICAL_MULTIPLIER>0&&LUBRICATED_MECHANICAL_MULTIPLIER<.6);
 assert.equal(mechanicalNoise(90),90);
 assert.ok(mechanicalNoise(90,true)>0&&mechanicalNoise(90,true)<45);
 assert.ok(mechanicalNoise(100,true)>0);
});
test('E pickup target must be in front and sufficiently near, no x-ray name labels',()=>{
 const eye=[0,1.7,0];
 const center=[0,.45,-2];
 assert.equal(gazeFocus(eye,[0,-.5,-1],center),true);
 assert.equal(gazeFocus(eye,[0,0,1],center),false);
 assert.equal(gazeFocus(eye,[0,-.5,-1],[0,.45,-8]),false);
});
test('nearest looked-at pickup is deterministic and can be the reusable can',()=>{
 const eye=[0,1.7,0],look=[0,-.45,-1];
 const items=[{id:'far',type:'energy',position:[0,.24,-2.3]},{id:'close',type:'glow',position:[0,.24,-1.5]}];
 assert.equal(nearestLookedAtPickup(eye,look,items)?.id,'close');
 assert.equal(nearestLookedAtPickup(eye,look,[],[0,.18,-1.5])?.kind,'can');
 assert.equal(nearestLookedAtPickup(eye,[0,0,1],items),null);
});
