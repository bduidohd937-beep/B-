import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationGrid,navigationStats,buildRoute,NAV_COLS,NAV_ROWS} from '../src/navigationGrid.js';
import {terrainBlocked} from '../src/garageLayout.js';
import {GATE_Z} from '../src/puzzle.js';

test('static occupancy is reused between Listener route searches (no repeat obstacle scan)',()=>{
 const a=navigationGrid(false),b=navigationGrid(false),c=navigationGrid(true);
 assert.strictEqual(a,b);
 assert.notStrictEqual(a,c);
 assert.equal(a.length,NAV_COLS*NAV_ROWS);
 assert.equal(navigationStats().cached,2);
 const builds=navigationStats().builds;
 for(let i=0;i<8;i++)buildRoute({x:0,z:16+i},{x:9,z:-18},false);
 assert.equal(navigationStats().builds,builds);
});
test('routes avoid cars/columns and preserve the locked security partition',()=>{
 const first={x:0,z:10},second={x:0,z:-45};
 const locked=buildRoute(first,second,false);
 const open=buildRoute(first,second,true);
 for(const waypoint of [...locked,...open]){
  assert.ok(Number.isFinite(waypoint.x)&&Number.isFinite(waypoint.z));
 }
 for(const waypoint of locked)assert.equal(terrainBlocked(waypoint.x,waypoint.z,false),false);
 for(const waypoint of open)assert.equal(terrainBlocked(waypoint.x,waypoint.z,true),false);
 assert.ok(open.length>0);
 assert.ok(open.some(w=>w.z<GATE_Z));
});
test('navigation gracefully handles null and targets inside parked cars',()=>{
 assert.deepEqual(buildRoute(null,null),[]);
 const path=buildRoute({x:0,z:17},{x:-34,z:-16},false);
 assert.ok(path.length>0);
 assert.equal(terrainBlocked(path.at(-1).x,path.at(-1).z,false),false);
});
