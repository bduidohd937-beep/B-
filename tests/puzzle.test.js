import test from 'node:test';
import assert from 'node:assert/strict';
import {
  POWER_PANEL, POWER_HOLD_SECONDS, GATE_Z, canUsePanel,
  isNearGate, gateBlocksPlayer, objectiveText
} from '../src/puzzle.js';

test('panel requires player to be physically near', () => {
  assert.equal(canUsePanel(POWER_PANEL[0], POWER_PANEL[1]), true);
  assert.equal(canUsePanel(-16, -23.5), true);
  assert.equal(canUsePanel(0, 17), false);
  assert.equal(canUsePanel(0, -38), false);
});

test('emergency breaker takes a meaningful amount of time', () => {
  assert.ok(POWER_HOLD_SECONDS >= 2 && POWER_HOLD_SECONDS <= 4);
});

test('central gate cannot be bypassed before restoring power', () => {
  for (const x of [-18, -10, -3, 0, 3, 10, 18]) {
    assert.equal(gateBlocksPlayer(x, GATE_Z, false), true, 'x='+x);
  }
});

test('open gate allows passage only through central opening', () => {
  for (const x of [-2.9, -1, 0, 1, 2.9]) {
    assert.equal(gateBlocksPlayer(x, GATE_Z, true), false, 'x='+x);
  }
  for (const x of [-18, -6, -3.2, 3.2, 6, 18]) {
    assert.equal(gateBlocksPlayer(x, GATE_Z, true), true, 'x='+x);
  }
});

test('partition has collision thickness but does not trap nearby path', () => {
  assert.equal(gateBlocksPlayer(0, GATE_Z + 1.1, false), false);
  assert.equal(gateBlocksPlayer(0, GATE_Z - 1.1, false), false);
});

test('gate proximity only appears close to the door', () => {
  assert.equal(isNearGate(0, GATE_Z+2), true);
  assert.equal(isNearGate(12, GATE_Z), false);
  assert.equal(isNearGate(0, 17), false);
});

test('objective changes only after the power is online', () => {
  assert.match(objectiveText(false), /전력 차단/);
  assert.match(objectiveText(true), /전력 복구/);
});
