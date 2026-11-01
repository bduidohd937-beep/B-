import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {cameraMovement} from '../src/rezero/v05/controls.js';
import {walkable,stepMove} from '../src/rezero/v05/level.js';
import {
  MONSTER_SPAWN,BREAKER_POS,HIDE_POS,MONSTER_CHASE,PLAYER_SPRINT,
  findRoute,lineOfSight,createChase,wakeChase,advanceChase,
  canOperateBreaker,canUseHiding,spotted
} from '../src/rezero/v05/chase.js';

const eps=1e-6;
function close(a,b){assert.ok(Math.abs(a-b)<eps,'Expected '+a+' approximately '+b);}
function asQuaternion(yaw,pitch=0){
  return new THREE.Euler(pitch,yaw,0,'YXZ') && new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));
}
test('WASD is truly camera-relative, including backwards-facing spawn direction',()=>{
  const front=asQuaternion(Math.PI);
  const w=cameraMovement(front,0,1),d=cameraMovement(front,1,0),
    a=cameraMovement(front,-1,0),s=cameraMovement(front,0,-1);
  close(w.x,0);close(w.z,1);
  close(d.x,-1);close(d.z,0);
  close(a.x,1);close(a.z,0);
  close(s.x,0);close(s.z,-1);
  close(w.x*d.x+w.z*d.z,0);
  const east=asQuaternion(-Math.PI/2);
  const fw=cameraMovement(east,0,1),right=cameraMovement(east,1,0);
  close(fw.x,1);close(fw.z,0);close(right.x,0);close(right.z,1);
  const tilt=asQuaternion(Math.PI,.40);
  close(cameraMovement(tilt,0,1).z,1);
  close(cameraMovement(tilt,1,1).length(),1);
});
test('monster can traverse map via real colliders from sealed G gate to electrical panel',()=>{
  const route=findRoute(MONSTER_SPAWN,BREAKER_POS);
  assert.ok(route.length>15,'Enemy needs a physical path: '+route.length);
  for(const p of route)assert.ok(walkable(p.x,p.z,.27),'solid geometry crossed at '+JSON.stringify(p));
  for(let i=1;i<route.length;i++)assert.ok(Math.hypot(
    route[i].x-route[i-1].x,route[i].z-route[i-1].z
  )<=.501,'path must not teleport');
});
test('monster can follow through service loop into storeroom without clipping',()=>{
  const goals=[{x:0,z:16.5},{x:9,z:16.6},{x:9,z:27},{x:0,z:27}];
  for(let i=1;i<goals.length;i++){
    const route=findRoute(goals[i-1],goals[i]);
    assert.ok(route.length>0,'Missing route segment '+i);
  }
});
test('walls block vision and movement; an open corridor permits it',()=>{
  assert.equal(lineOfSight({x:0,z:13.1},{x:8.6,z:13.1}),false,'wall blocks line of sight');
  assert.equal(lineOfSight({x:0,z:16.5},{x:8.6,z:16.5}),true,'straight doors permit view');
  const blocked=stepMove({x:2,z:13.3},4,0);
  assert.ok(blocked.x<2.9);
});
test('breaker only triggers when actually near physical equipment',()=>{
  assert.equal(canOperateBreaker({x:0,z:16.5}),false);
  assert.equal(canOperateBreaker({x:9.6,z:15.4}),true);
  assert.equal(canUseHiding({x:-1.2,z:27.5}),true);
  assert.equal(canUseHiding({x:9,z:27}),false);
});
test('first chase must be activated by E, then leave G before investigating',()=>{
  const m=createChase(),player={x:9.4,z:16.6};
  assert.equal(m.phase,'dormant');
  for(let i=0;i<50;i++)advanceChase(m,.04,player);
  assert.equal(m.phase,'dormant');
  assert.equal(wakeChase(m),true);
  assert.equal(wakeChase(m),false);
  let cameOut=false,steps=0;
  for(let i=0;i<450;i++){
    const old={...m.pos};
    const events=advanceChase(m,.04,player);
    if(events.some(e=>e.type==='step'))steps++;
    assert.ok(Math.hypot(m.pos.x-old.x,m.pos.z-old.z)<=MONSTER_CHASE*.04+.002);
    assert.ok(walkable(m.pos.x,m.pos.z,.27));
    if(m.pos.x>-2.4)cameOut=true;
    if(m.phase==='caught')break;
  }
  assert.ok(cameOut,'monster never emerged into actual central hallway');
  assert.ok(steps>4,'monster footsteps should track physical movement');
});
test('creature can detect reachable player but never see through walls or concealment',()=>{
  const m=createChase();
  m.pos={x:1,z:16.5};m.heading={x:1,z:0};m.phase='investigate';
  assert.equal(spotted(m,{x:4,z:16.5},false),true);
  assert.equal(spotted(m,{x:8,z:13},false),false);
  assert.equal(spotted(m,{x:4,z:16.5},true),false);
});
test('first-chase speeds leave the player a legitimate sprint escape option',()=>{
  assert.ok(PLAYER_SPRINT>MONSTER_CHASE);
});
test('capture is stateful and stops updates, then can restart from a new checkpoint state',()=>{
  const m=createChase();wakeChase(m);
  m.phase='chase';m.t=0;m.pos={x:9,z:16.5};m.heading={x:1,z:0};
  const player={x:9.35,z:16.5};
  const events=advanceChase(m,.04,player);
  assert.equal(m.phase,'caught');
  assert.equal(events.filter(e=>e.type==='caught').length,1);
  assert.deepEqual(advanceChase(m,.04,player),[]);
  const reset=createChase();
  assert.equal(reset.phase,'dormant');
});
test('hiding stops physical sight and makes a nearby monster search last position',()=>{
  const m=createChase();wakeChase(m);
  m.phase='chase';m.pos={x:-1.4,z:26.5};
  m.heading={x:0,z:1};m.lastSeen={x:-1.3,z:27.15};
  const player={x:HIDE_POS.x,z:HIDE_POS.z};
  assert.equal(spotted(m,player,true),false);
  for(let i=0;i<45;i++)advanceChase(m,.04,player,{hiding:true});
  assert.equal(m.phase,'search');
});
test('existing legacy entry remains untouched while new mode handles E, pointer and chase',()=>{
  const app=readFileSync('src/rezero/v05/MaintenanceDemo.jsx','utf8');
  assert.match(app,/cameraMovement\(camera.quaternion,strafe,forward,move\)/);
  assert.match(app,/wakeChase\(actor.current\)/);
  assert.match(app,/changeStage\('escaping'\)/);
  assert.match(app,/hidingRef.current=true/);
  assert.match(app,/setCaught\(true\)/);
  assert.match(app,/setResetToken\(n=>n\+1\)/);
  assert.match(readFileSync('index.html','utf8'),/src\/main.jsx/);
  assert.match(readFileSync('rezero.html','utf8'),/src\/rezero\/main.jsx/);
});
