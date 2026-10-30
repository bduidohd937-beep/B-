import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POWER_PANEL, ECHO_PANEL, SECOND_FLOOR_START,
  panelPosition, canUsePanel, gateIsPowered, canEnterNextArea,
  gateBlocksPlayer, objectiveText
} from '../src/puzzle.js';

test('loop two has a distinct panel mirrored to the right wall',()=>{
  assert.deepEqual(panelPosition(1),POWER_PANEL);
  assert.deepEqual(panelPosition(2),ECHO_PANEL);
  assert.equal(canUsePanel(-16,-25,1),true);
  assert.equal(canUsePanel(16,-25,1),false);
  assert.equal(canUsePanel(16,-25,2),true);
  assert.equal(canUsePanel(-16,-25,2),false);
});

test('the B2 loop returns to the original starting location',()=>{
  assert.deepEqual(SECOND_FLOOR_START,[0,1.7,17]);
  assert.notEqual(SECOND_FLOOR_START,POWER_PANEL);
});

test('power for each level remains scoped to that level',()=>{
  assert.equal(gateIsPowered(1,true,false),true);
  assert.equal(gateIsPowered(2,true,false),false);
  assert.equal(gateIsPowered(1,false,true),false);
  assert.equal(gateIsPowered(2,false,true),true);
});

test('stage two gate is physically closed until second switch is used',()=>{
  assert.equal(gateBlocksPlayer(0,-38,gateIsPowered(2,true,false)),true);
  assert.equal(gateBlocksPlayer(0,-38,gateIsPowered(2,true,true)),false);
  assert.equal(gateBlocksPlayer(14,-38,gateIsPowered(2,true,true)),true);
});

test('passing first gate triggers second level only when open',()=>{
  assert.equal(canEnterNextArea(0,-43.5,1,false),false);
  assert.equal(canEnterNextArea(0,-43.5,1,true),true);
  assert.equal(canEnterNextArea(0,-42.8,1,true),false);
  assert.equal(canEnterNextArea(5,-43.5,1,true),false);
});

test('level two needs its own gate open before the final reveal',()=>{
  assert.equal(canEnterNextArea(0,-43.5,2,false),false);
  assert.equal(canEnterNextArea(0,-43.5,2,true),true);
  assert.equal(canEnterNextArea(0,-43.5,3,true),false);
});

test('goal text changes visibly upon repeating B2',()=>{
  assert.match(objectiveText(false,1),/좌측 벽/);
  assert.match(objectiveText(false,2),/오른쪽 벽/);
  assert.match(objectiveText(true,2),/방송 복구/);
  assert.match(objectiveText(true,1),/전력 복구/);
});

test('existing first B2 interface remains backwards compatible',()=>{
  assert.equal(canUsePanel(-16,-25),true);
  assert.equal(gateIsPowered(1,true,true),true);
  assert.match(objectiveText(false),/전력 차단/);
});
