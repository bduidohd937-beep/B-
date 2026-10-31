import test from 'node:test';
import assert from 'node:assert/strict';
import { B2_BOUNDS, B2_DOORS, B2_WALLS, B2_ZONES, b2Blocked, buildB2Grid, buildB2Route } from '../src/b2Blockout.js';

test('B2 blockout defines asymmetric zones and required connections', () => {
  assert.deepEqual(B2_ZONES.A.center, [-15, 16]);
  assert.equal(B2_ZONES.E.ceiling, 2.8);
  assert.deepEqual(B2_DOORS.slice(0, 5).map(d => d.connects.join('↔')), ['A↔B','B↔C','B↔D','C↔F','D↔F']);
  assert.ok(B2_WALLS.length >= 18);
});
test('B2 Listener route respects closed and open shutter states', () => {
  const closed=buildB2Route({x:0,z:6},{x:0,z:-33},{shutterOpen:false});
  assert.ok(closed.length>0);
  assert.ok(closed.every(point=>point.z>-32.5), 'closed shutter route must stop outside F');
  const route=buildB2Route({x:0,z:6},{x:0,z:-33},{shortcutOpen:true,shutterOpen:true});
  assert.ok(route.length>0);
  for(const point of route)assert.equal(b2Blocked(point.x,point.z,.55,{shortcutOpen:true,shutterOpen:true}),false);
});
test('locked service shortcut opens only when explicitly enabled', () => {
  assert.equal(b2Blocked(-14.5, 8, 0), true);
  assert.equal(b2Blocked(-14.5, 8, 0, { shortcutOpen: true }), false);
});
test('shutter blocks entry until opened and grid is independent', () => {
  assert.equal(b2Blocked(0, -33, .55), true);
  assert.equal(b2Blocked(0, -33, .55, { shutterOpen: true }), false);
  const grid = buildB2Grid();
  assert.equal(grid.cols, 45);
  assert.equal(grid.rows, 61);
  assert.equal(grid.blocked.length, grid.cols * grid.rows);
  assert.equal(B2_BOUNDS.minX, -22);
});
test('every unlocked connector has a physical opening for the actor footprint', () => {
  for (const door of B2_DOORS.filter(d => !d.locked)) {
    assert.equal(b2Blocked(door.x, door.z, .34, { shutterOpen: true }), false, door.id);
  }
});
