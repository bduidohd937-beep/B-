import test from 'node:test';
import assert from 'node:assert/strict';
import {
 CCTV_STATION,CAMERA_LOG,VEHICLES,CAR_ALARM_NOISE,
 initialVehiclePuzzle,reviewCctv,examineVehicle,carObjective,
 findMysteryInteraction,vehicleGateOpen
} from '../src/vehiclePuzzle.js';
import {PARKED_CARS,terrainBlocked} from '../src/garageLayout.js';
test('three grounded candidate cars actually exist on the shared basement layout',()=>{
 assert.equal(VEHICLES.length,3);
 assert.ok(VEHICLES.every(c=>PARKED_CARS.some(([x,z])=>c.position[0]===x&&c.position[1]===z)));
 assert.equal(VEHICLES.filter(c=>c.correct).length,1);
 assert.equal(CCTV_STATION[0],-18);
 assert.equal(terrainBlocked(-18,12.8,false),false);
 for(const car of VEHICLES)assert.equal(terrainBlocked(car.inspect[0],car.inspect[2]+.9,false),false);
});
test('CCTV evidence uniquely determines the correct vehicle, not random guessing',()=>{
 const matching=VEHICLES.filter(c=>c.bay===CAMERA_LOG.bay && c.plate.endsWith('17'));
 assert.equal(matching.length,1);
 assert.equal(matching[0].plate,'317');
 assert.match(CAMERA_LOG.discrepancy,/등록 DB/);
});
test('no interaction before stage 2 or without direct gaze and nearby proximity',()=>{
 assert.equal(findMysteryInteraction(CCTV_STATION,[0,0,-1],{floor:1}),null);
 const eye=[CCTV_STATION[0],1.7,CCTV_STATION[2]+2];
 assert.equal(findMysteryInteraction(eye,[0,0,-1])?.kind,'cctv');
 assert.equal(findMysteryInteraction(eye,[0,0,1]),null);
 assert.equal(findMysteryInteraction([0,1.7,17],[0,0,-1]),null);
});
test('wrong vehicle without CCTV knowledge cannot trigger brute-force alarm',()=>{
 const before=initialVehiclePuzzle();
 const response=examineVehicle(before,'c13');
 assert.equal(response.outcome,'need-cctv');
 assert.deepEqual(response.state,before);
});
test('wrong vehicle after CCTV raises a real alarm, cannot unlock gate',()=>{
 const reviewed=reviewCctv(initialVehiclePuzzle());
 const wrong=examineVehicle(reviewed,'c13');
 assert.equal(wrong.outcome,'alarm');
 assert.equal(wrong.state.mistakes,1);
 assert.equal(wrong.state.lastAlarmId,'c13');
 assert.equal(vehicleGateOpen(2,true,wrong.state),false);
 assert.ok(CAR_ALARM_NOISE>90);
});
test('correct 317 car supplies KEY but cannot open second-floor gate automatically',()=>{
 const reviewed=reviewCctv(initialVehiclePuzzle());
 const success=examineVehicle(reviewed,'c17');
 assert.equal(success.outcome,'transponder');
 assert.equal(success.state.solved,true);
 assert.equal(vehicleGateOpen(2,false,success.state),false);
 assert.equal(vehicleGateOpen(2,false,success.state,{phase:'opening',elapsed:3}),true);
 assert.equal(vehicleGateOpen(1,false,success.state),false);
 assert.equal(vehicleGateOpen(1,true,initialVehiclePuzzle()),true);
 assert.match(carObjective(success.state),/보안 단말기/);
 assert.equal(examineVehicle(success.state,'c13').outcome,'already-solved');
});
test('objective leads to CCTV, then vehicle, then escape',()=>{
 const initial=initialVehiclePuzzle();
 assert.match(carObjective(initial),/CCTV/);
 const read=reviewCctv(initial);
 assert.match(carObjective(read),/번호/);
 assert.equal(examineVehicle(read,'not-a-real-car').outcome,'invalid');
});
