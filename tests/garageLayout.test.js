import test from 'node:test';
import assert from 'node:assert/strict';
import { GARAGE_HEIGHT,WALK_BOUNDS,PILLARS,PARKED_CARS,FOG_FAR,LEAK,SERVICE_GRATE,surfaceAt,terrainBlocked,clampWalkPosition } from '../src/garageLayout.js';
import { POWER_PANEL,ECHO_PANEL,GATE_Z } from '../src/puzzle.js';
test('taller, significantly expanded basement is navigable and fog hides far edges',()=>{
 assert.ok(GARAGE_HEIGHT>=6);
 assert.ok(WALK_BOUNDS.maxX-WALK_BOUNDS.minX>=120);
 assert.ok(WALK_BOUNDS.maxZ-WALK_BOUNDS.minZ>=145);
 assert.ok(FOG_FAR<(WALK_BOUNDS.maxX-WALK_BOUNDS.minX)/2);
 assert.ok(PILLARS.length>=60);
 assert.ok(PARKED_CARS.length>=20);
});
test('each noise surface exists only where environmental cause is modeled',()=>{
 assert.equal(surfaceAt(LEAK.x,LEAK.z),'water');
 assert.equal(surfaceAt(SERVICE_GRATE.x,SERVICE_GRATE.z),'metal');
 assert.equal(surfaceAt(0,0),'concrete');
 assert.equal(surfaceAt(-2,-6),'concrete');
 assert.equal(surfaceAt(20,-12),'concrete');
});
test('cars and pillars have matching gameplay collision',()=>{
 assert.equal(terrainBlocked(PILLARS[0][0],PILLARS[0][1],false),true);
 assert.equal(terrainBlocked(PARKED_CARS[0][0],PARKED_CARS[0][1],false),true);
});
test('both breakers are accessible, and gate cannot be bypassed from far side',()=>{
 // V0.12.7 physical first breaker cannot be phased through. A player
 // operates from its FRONT, while stage-2 mirrored legacy location stays free.
 assert.equal(terrainBlocked(...POWER_PANEL),true);
 assert.equal(terrainBlocked(POWER_PANEL[0],POWER_PANEL[1]+1.5),false);
 assert.equal(terrainBlocked(...ECHO_PANEL),false);
 assert.equal(terrainBlocked(40,GATE_Z,false),true);
 assert.equal(terrainBlocked(40,GATE_Z,true),true);
 assert.equal(terrainBlocked(0,GATE_Z,false),true);
 assert.equal(terrainBlocked(0,GATE_Z,true),false);
});
test('bounds are well outside the objective corridor',()=>{
 assert.deepEqual(clampWalkPosition(300,300),[WALK_BOUNDS.maxX,WALK_BOUNDS.maxZ]);
 assert.deepEqual(clampWalkPosition(-300,-300),[WALK_BOUNDS.minX,WALK_BOUNDS.minZ]);
 assert.deepEqual(clampWalkPosition(0,17),[0,17]);
});
