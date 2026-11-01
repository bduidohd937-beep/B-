import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  AREAS,WALLS,OBSTACLES,SOLIDS,STOPS,DEMO_ROUTE,walkable,stepMove,
  getArea,floorHeight,PLAYER_RADIUS,AREA_BY_ID
} from '../src/rezero/v05/level.js';

function follow(points){
  let p={...points[0]};
  for(let i=1;i<points.length;i++){
    const goal=points[i];
    for(let k=0;k<1500;k++){
      const d=Math.hypot(goal.x-p.x,goal.z-p.z);
      if(d<.025)break;
      const step=Math.min(.08,d);
      const next=stepMove(p,(goal.x-p.x)/d*step,(goal.z-p.z)/d*step);
      if(Math.hypot(next.x-p.x,next.z-p.z)<.0001)
        assert.fail('Blocked on route segment '+i+' near '+JSON.stringify(p));
      p=next;
    }
    assert.ok(Math.hypot(goal.x-p.x,goal.z-p.z)<.035,
      'Cannot reach waypoint '+i+': '+JSON.stringify(goal)+' from '+JSON.stringify(p));
  }
  return p;
}
test('all areas are independently labeled and contain six intended functional spaces',()=>{
  const ids=AREAS.map(a=>a.id);
  assert.equal(new Set(ids).size,ids.length);
  for(const id of ['guard','stairs','hub','electrical','service','storage','sealed-link'])
    assert.ok(ids.includes(id),id);
});
test('security room and stair floor really descend to underground grade',()=>{
  assert.equal(floorHeight(0,0),1.08);
  assert.ok(floorHeight(0,4)>floorHeight(0,9));
  assert.equal(floorHeight(0,11.1),0);
});
test('main escape loop guard → stairs → electric → service → storage → guard is traversable',()=>{
  assert.ok(DEMO_ROUTE.every(p=>walkable(p.x,p.z)));
  const end=follow(DEMO_ROUTE);
  assert.ok(Math.hypot(end.x,end.z)<.035);
});
test('service passage has genuine second route back to the central hallway',()=>{
  follow([{x:0,z:16.5},{x:0,z:22},{x:0,z:27},
    {x:4.5,z:27},{x:9,z:27},{x:9,z:22},{x:9,z:16.5},{x:4.5,z:16.5},{x:0,z:16.5}]);
});
test('walls and furniture are solid; illegal through-wall shortcuts never succeed',()=>{
  assert.equal(walkable(3,13.2),false,'hub east wall solid away from electrical doorway');
  assert.equal(walkable(3,16.5),true,'electrical doorway is open');
  assert.equal(walkable(0,11),true,'stair landing through shutter is passable');
  assert.equal(walkable(AREA_BY_ID.storage.x0,27),false,'storage west wall is not passable');
  assert.equal(walkable(-6.5,16.5),false,'sealed G area cannot be entered');
  for(const o of OBSTACLES)assert.equal(walkable(o.x,o.z),false,'furniture must block player: '+o.id);
});
test('movement collision slides beside objects and does not tunnel through',()=>{
  let p={x:1.9,z:17};
  const next=stepMove(p,4,0);
  assert.ok(next.x<2.9,'tried to cross hub wall outside connecting passage');
  p={x:0,z:16.5};
  for(let n=0;n<40;n++)p=stepMove(p,.10,0);
  assert.ok(p.x>3,'valid open east portal should allow movement');
});
test('wall generation has explicit corner, door and corridor boundaries',()=>{
  assert.ok(WALLS.length>=25);
  assert.ok(SOLIDS.length>WALLS.length);
  assert.ok(PLAYER_RADIUS>.2&&PLAYER_RADIUS<.4);
  assert.ok(getArea(STOPS.electrical.x,STOPS.electrical.z).id==='electrical');
});
test('V0.5-A retains legacy/RE:ZERO route and introduces independently bundled survive.html',()=>{
  const vite=readFileSync('vite.config.js','utf8');
  const entry=readFileSync('survive.html','utf8');
  assert.match(vite,/legacy:/);
  assert.match(vite,/rezero:/);
  assert.match(vite,/survive:/);
  assert.match(entry,/src\/rezero\/v05\/main.jsx/);
  assert.match(readFileSync('index.html','utf8'),/src\/main.jsx/);
  assert.match(readFileSync('rezero.html','utf8'),/src\/rezero\/main.jsx/);
});
test('player movement collision and quest milestones are linked to same area definitions',()=>{
  const app=readFileSync('src/rezero/v05/MaintenanceDemo.jsx','utf8');
  assert.match(app,/stepMove\(before,dx,dz\)/);
  assert.match(app,/floorHeight\(camera.position.x,camera.position.z\)/);
  assert.match(app,/p===0&&id==='electrical'/);
  assert.match(app,/p===1&&id==='service'/);
  assert.match(app,/p===2&&id==='storage'/);
  assert.match(app,/p===3&&id==='guard'/);
  assert.match(app,/괴물과 정전, 셔터 봉쇄는 다음 단계/);
});
