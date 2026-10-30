import test from 'node:test';
import assert from 'node:assert/strict';
import { startingPickups,slots,selectSlot,canAddToInventory,pickupRadius,itemEffect,gadgetTiming,gearMakesNoise } from '../src/items.js';
test('two floors each hold five distinct new items',()=>{
 for(const floor of [1,2]){
  const list=startingPickups(floor);
  assert.equal(list.length,5);
  assert.equal(new Set(list.map(x=>x.type)).size,5);
  assert.ok(list.every(x=>x.position.length===3));
 }
});
test('can occupies one slot and backpack capacity is three',()=>{
 assert.deepEqual(slots(true,['alarm','glow']),['can','alarm','glow']);
 assert.equal(canAddToInventory(true,['alarm','glow']),false);
 assert.equal(canAddToInventory(false,['alarm','glow']),true);
 assert.equal(selectSlot(2,true,['alarm','glow']),'glow');
 assert.equal(selectSlot(3,true,['alarm','glow']),null);
});
test('items require proximity',()=>{
 assert.ok(pickupRadius([0,1,0],[2,0,0]));
 assert.ok(!pickupRadius([0,1,0],[6,0,0]));
});
test('lube needs panel, gadgets have distinct timing',()=>{
 assert.equal(itemEffect('lube',false),'requires-panel');
 assert.equal(itemEffect('lube',true),'silence');
 assert.equal(itemEffect('energy',false),'boost');
 assert.equal(itemEffect('radio',false),'deploy');
 assert.equal(gadgetTiming('alarm',3.9).active,false);
 assert.equal(gadgetTiming('alarm',4.1).active,true);
 assert.equal(gadgetTiming('alarm',12).end,true);
 assert.equal(gadgetTiming('radio',1).loudness,72);
 assert.equal(gadgetTiming('glow',49).end,false);
 assert.equal(gadgetTiming('glow',51).end,true);
});

test('glowstick and lubricated panel preserve intentional quiet alternatives',()=>{
 assert.equal(gearMakesNoise('glow'),false);
 assert.equal(gearMakesNoise('lube'),false);
 assert.equal(gearMakesNoise('energy'),true);
 assert.equal(gearMakesNoise('radio'),true);
 assert.equal(gearMakesNoise('alarm'),true);
});
