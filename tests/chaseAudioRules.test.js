import test from 'node:test';
import assert from 'node:assert/strict';
import {passesParkedCar,shouldPlayRushScrape,SCRAPE_COOLDOWN_SECONDS} from '../src/chaseAudioRules.js';
import {PARKED_CARS} from '../src/garageLayout.js';
test('rush scrape only occurs beside real parked-car geometry',()=>{
 const [x,z]=PARKED_CARS[0];
 assert.equal(passesParkedCar(x+2.7,z+3,PARKED_CARS),true);
 assert.equal(passesParkedCar(0,-999,PARKED_CARS),false);
});
test('no ambient scrape when idle, distant, slow or no vehicle',()=>{
 const base={state:'investigate',speed:8,nearCar:true,distanceToPlayer:12,now:10,nextAllowedAt:0};
 assert.equal(shouldPlayRushScrape(base),true);
 for(const change of [
  {state:'idle'},{state:'search'},{speed:2},
  {nearCar:false},{distanceToPlayer:31},{now:9,nextAllowedAt:10}
 ])assert.equal(shouldPlayRushScrape({...base,...change}),false);
 assert.ok(SCRAPE_COOLDOWN_SECONDS>1.5);
});
