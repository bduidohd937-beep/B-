import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {VEHICLES} from '../src/vehiclePuzzle.js';
import {PARKED_CARS} from '../src/garageLayout.js';
import {uniquePlateCount} from '../src/carPlates.js';

const fixture=readFileSync(new URL('../src/GarageFixtures.jsx',import.meta.url),'utf8');
const garage=readFileSync(new URL('../src/GarageWorld.jsx',import.meta.url),'utf8');
const ordinary=readFileSync(new URL('../src/InstancedCars.jsx',import.meta.url),'utf8');
test('batched garage still includes every light fixture and all lane/bay stripes',()=>{
 assert.match(fixture,/\[-27,-18,-9,0,9,18\]/);
 assert.match(fixture,/\[-17,-8,1,10,18\]/);
 assert.match(fixture,/Array\.from\(\{length:20\}/);
 assert.match(fixture,/mesh\.instanceMatrix\.needsUpdate=true/);
 assert.match(fixture,/mesh\.computeBoundingSphere\(\)/);
 assert.match(garage,/<GarageFixtures flicker=\{flicker\}/);
 assert.doesNotMatch(garage,/<CeilingFixtures/);
});
test('ordinary cars have front and rear actual license texture quads',()=>{
 assert.equal(uniquePlateCount(PARKED_CARS.length),PARKED_CARS.length);
 assert.match(ordinary,/const rear=z\+2\.292,front=z-2\.292/);
 assert.match(ordinary,/for\(let face=0;face<2;face\+\+\)/);
 assert.match(ordinary,/font='bold 30px sans-serif'/);
});
test('all three CCTV clue cars retain physical plates and bay identifiers',()=>{
 assert.deepEqual(VEHICLES.map(v=>v.plate),['317','371','713']);
 assert.deepEqual(VEHICLES.map(v=>v.bay),['C-17','C-13','D-09']);
 assert.match(garage,/\{identified\.plate\}/);
 assert.match(garage,/\{v\.bay\}/);
 // Stage 01 shows the real 317 clue, loop 02 retains all three candidates.
 assert.ok(garage.includes('VEHICLES.filter(v=>floor===2||(floor===1&&v.correct)).map'));
 assert.ok(ordinary.includes('(floor===2||v.correct)'));
});
test('Listener collision occlusion and audiopanning do not track the player omnisciently',()=>{
 const listener=readFileSync(new URL('../src/Listener.jsx',import.meta.url),'utf8');
 const audio=readFileSync(new URL('../src/spatialAudio.js',import.meta.url),'utf8');
 assert.match(listener,/target\.current\.copy\(point\)/);
 assert.match(listener,/passesParkedCar\(pos\.x,pos\.z,CARS\)/);
 assert.match(audio,/shouldPlayRushScrape/);
 assert.match(audio,/envelope\.connect\(occlusion\)/);
});
