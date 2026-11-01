import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_LAMP_ON, passageAllowed, isLiveFeedUpdated,
  canRecordVideoMismatch, focusTarget
} from '../src/rezero/rules.js';

test('the original game can coexist with RE:ZERO without overwriting its entry', async () => {
  const fs = await import('node:fs');
  assert.match(fs.readFileSync('index.html', 'utf8'), /src\/main\.jsx/);
  assert.match(fs.readFileSync('rezero.html', 'utf8'), /src\/rezero\/main\.jsx/);
});

test('CAM 01 is live while CAM 02 retains the original state', () => {
  assert.equal(isLiveFeedUpdated('cam1', !INITIAL_LAMP_ON), false);
  assert.equal(isLiveFeedUpdated('cam2', !INITIAL_LAMP_ON), true);
});

test('video mismatch evidence requires testing the lamp', () => {
  assert.equal(canRecordVideoMismatch(false), false);
  assert.equal(canRecordVideoMismatch(true), true);
});

test('door controls physical passage but not interior walking', () => {
  assert.equal(passageAllowed({ x: 0, z: 1.5 }, false), true);
  assert.equal(passageAllowed({ x: 2.8, z: 1.1 }, false), false);
  assert.equal(passageAllowed({ x: 2.8, z: 1.1 }, true), true);
  assert.equal(passageAllowed({ x: 9, z: 1.2 }, true), true);
  assert.equal(passageAllowed({ x: 9, z: 10 }, true), false);
});

test('interaction requires both proximity and player facing', () => {
  const targets = [{ id: 'monitor', x: 0, z: -1 }];
  assert.equal(focusTarget({ x: 0, z: 0, fx: 0, fz: -1, targets }), 'monitor');
  assert.equal(focusTarget({ x: 0, z: 0, fx: 0, fz: 1, targets }), null);
});
