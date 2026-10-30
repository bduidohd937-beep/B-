import test from 'node:test';
import assert from 'node:assert/strict';
import {plateForCar,uniquePlateCount} from '../src/carPlates.js';
import {PARKED_CARS} from '../src/garageLayout.js';
import {VEHICLES} from '../src/vehiclePuzzle.js';
test('every parked car has a deterministic plate, not only the three puzzle cars',()=>{
 assert.equal(uniquePlateCount(PARKED_CARS.length),PARKED_CARS.length);
 assert.notEqual(plateForCar(0),plateForCar(1));
 assert.equal(plateForCar(5),plateForCar(5));
 assert.match(plateForCar(8),/^B2-\d{4}$/);
 for(const car of VEHICLES)assert.ok(['317','371','713'].includes(car.plate));
});
