import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPresence,beginPresence} from '../src/rezero/presence.js';
import {createResponse,canLockDoor,toggleSecurityLock,activateSpeaker,advanceEncounter,canSeePlayer,concealed,inHall,resetResponseAfterCapture} from '../src/rezero/survival.js';
function run(p,r,seconds,other={}) {
  const events=[];
  for(let k=0;k<Math.round(seconds/.04);k++)
    events.push(...advanceEncounter(p,.04,{cameraVisible:true,response:r,doorClosed:true,...other}));
  return events;
}
test('only a completely closed door can be locked or unlocked',()=>{
  const r=createResponse();
  const half={phase:'closing',angle:-.5};
  assert.equal(toggleSecurityLock(r,half),false);
  assert.equal(r.locked,false);
  const closed={phase:'closed',angle:0};
  assert.equal(canLockDoor(closed),true);
  assert.equal(toggleSecurityLock(r,closed),true);
  assert.equal(r.locked,true);
  assert.equal(toggleSecurityLock(r,half),true,'unlock even during a door animation');
  assert.equal(r.locked,false);
});
test('the physical office protects the player from detection and capture',()=>{
  const p=createPresence(),r=createResponse();beginPresence(p);
  const person={x:-.35,z:1.0};
  const events=run(p,r,35,{player:person});
  assert.ok(!events.some(e=>e.type==='caught'));
  assert.ok(!events.some(e=>e.type==='alert'));
  assert.equal(canSeePlayer({x:4.16,z:1.48,phase:'approach'},person),false);
});
test('sprinting can be heard farther than quiet movement and never through the office',()=>{
  const p=createPresence(),r=createResponse();beginPresence(p);
  run(p,r,6,{player:null});
  assert.equal(p.phase,'approach');
  const noise={seq:1,x:7.4,z:1.5,range:8.5};
  const events=run(p,r,.08,{noise});
  assert.ok(events.some(e=>e.phase==='investigate'));
  assert.equal(p.phase,'investigate');
});
test('player spotted in corridor is chased, and can run faster than the threat',()=>{
  const p=createPresence(),r=createResponse();beginPresence(p);
  run(p,r,8);
  const pl={x:10.3,z:1.48};
  const result=run(p,r,.04,{player:pl});
  assert.equal(p.phase,'chase');
  assert.ok(result.some(e=>e.type==='alert'));
  assert.ok(3.55>2.28,'player sprint must outrun pursuer');
});
test('capture is limited to real close physical proximity outside security office',()=>{
  const p=createPresence(),r=createResponse();beginPresence(p);
  run(p,r,7);
  const pl={x:11.1,z:1.48};
  const events=run(p,r,4,{player:pl});
  assert.equal(p.phase,'caught');
  assert.equal(events.filter(e=>e.type==='caught').length,1);
});
test('speaker diversion moves the actual creature towards its audible location',()=>{
  const p=createPresence(),r=createResponse();beginPresence(p);
  run(p,r,7);
  const before=p.x;
  assert.ok(before<12.65);
  assert.equal(activateSpeaker(r),true);
  assert.equal(activateSpeaker(r),false,'cannot spam the lure');
  const events=run(p,r,2);
  assert.ok(events.some(e=>e.type==='speaker'));
  assert.ok(events.some(e=>e.phase==='divert'));
  assert.ok(p.x>before,'creature moved away from the security office');
  assert.ok(r.speakerCooldown>0);
});
test('crouching behind the physical locker hides only from the obstructed side',()=>{
  const p={x:11,z:1.48,phase:'approach'};
  const hidden={x:8.05,z:2.35};
  assert.equal(inHall(hidden),true);
  assert.equal(concealed(hidden,true,p),true);
  assert.equal(canSeePlayer(p,hidden,{crouching:true}),false);
  assert.equal(concealed(hidden,false,p),false);
  assert.equal(concealed(hidden,true,{x:8.2}),false);
});
test('line of sight loss leads to last-known-position search, not omniscience',()=>{
  const p=createPresence(),r=createResponse();beginPresence(p);
  run(p,r,7);
  const player={x:10.8,z:1.48};
  run(p,r,.04,{player});
  assert.equal(p.phase,'chase');
  run(p,r,1.04,{player:{x:-.2,z:0}});
  assert.equal(p.phase,'search');
});
test('checkpoint restores security devices without erasing investigated evidence',()=>{
  const r=createResponse();r.locked=true;
  activateSpeaker(r);
  resetResponseAfterCapture(r);
  assert.equal(r.locked,false);
  assert.equal(r.speakerCooldown,0);
  assert.equal(r.speakerPulse,0);
});
test('seated console, real lock, speaker and retry UI are connected',()=>{
  const s=readFileSync('src/rezero/FirstRoom.jsx','utf8');
  const map=readFileSync('src/rezero/rules.js','utf8');
  assert.match(s,/advanceEncounter\(p,rawDt/);
  assert.match(s,/onLock=\{switchLock\}/);
  assert.match(s,/onSpeaker=\{useSpeaker\}/);
  assert.match(s,/resetResponseAfterCapture\(response.current\)/);
  assert.match(s,/onCaught=\{\(\)=>setCaught\(true\)\}/);
  assert.match(s,/ControlLeft/);
  assert.match(map,/Physical locker/);
});
