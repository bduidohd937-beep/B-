import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRoute} from '../src/navigationGrid.js';
import {
 terrainBlockedRadius,LISTENER_COLLISION_RADIUS,PLAYER_COLLISION_RADIUS
} from '../src/garageLayout.js';
import {SECURITY_KEY_READER,gatePassableForActor} from '../src/exitAuthorization.js';
import {freshGateAuthentication,advanceGateAuthentication} from '../src/exitAuthorization.js';
import {rushSpeed,SECOND_FLOOR_RUSH_SPEED} from '../src/alarmRules.js';

const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
test('all three 3D actors share radius sweep, and Listener navigation uses its actual width',()=>{
 const app=read('App.jsx'),listener=read('Listener.jsx'),observer=read('Observer.jsx');
 const nav=read('navigationGrid.js');
 assert.match(app,/sweepMove\(beforeX,beforeZ,movement\.x,movement\.z/);
 assert.match(app,/PLAYER_COLLISION_RADIUS,poweredRef\.current/);
 assert.match(listener,/sweepMove\(pos\.x,pos\.z,stepX,stepZ,LISTENER_COLLISION_RADIUS,powered\)/);
 assert.match(observer,/sweepMove\(pos\.x,pos\.z,sx,sz,OBSERVER_COLLISION_RADIUS,powered\)/);
 assert.match(nav,/terrainBlockedRadius\(x,z,LISTENER_COLLISION_RADIUS,key\)/);
 assert.ok(PLAYER_COLLISION_RADIUS<LISTENER_COLLISION_RADIUS);
});
test('physical navigation grid cannot route monster through closed shutter',()=>{
 const from={x:0,z:-32},to={x:0,z:-46};
 const closed=buildRoute(from,to,false);
 const opened=buildRoute(from,to,true);
 assert.equal(closed.length,0,'large divider blocks complete route');
 assert.ok(opened.length>0,'monster may use raised center passage');
 for(const cell of opened){
  assert.equal(terrainBlockedRadius(cell.x,cell.z,LISTENER_COLLISION_RADIUS,true),false);
 }
});
test('sound-driven Listener reacts before moving, never rushes faster than player forever',()=>{
 const listener=read('Listener.jsx');
 assert.match(listener,/reactionTime\.current=LISTENER_REACTION_SECONDS/);
 assert.match(listener,/reactionTime\.current>0\?0/);
 assert.match(listener,/rushSpeed\(rushTime\.current,excitement\.current,floor\)/);
 assert.match(listener,/target\.current\.copy\(point\)/);
 assert.ok(rushSpeed(8,100,2)===SECOND_FLOOR_RUSH_SPEED);
 assert.ok(SECOND_FLOOR_RUSH_SPEED<6.2);
});
test('player sees true open shutter early but taller monsters wait for head clearance',()=>{
 const app=read('App.jsx');
 assert.match(app,/gatePassableForActor\(gateAuth,4\.25\)/);
 assert.match(app,/gatePassableForActor\(gateAuth,3\.2\)/);
 let state=freshGateAuthentication();
 for(let i=0;i<80;i++){
  state=advanceGateAuthentication(state,{active:true,dt:.05,hasKey:true,near:true,holding:true}).state;
 }
 for(let i=0;i<50;i++){
  state=advanceGateAuthentication(state,{active:true,dt:.05,hasKey:true,near:false,holding:false}).state;
 }
 assert.equal(gatePassableForActor(state,2.05),true);
 assert.equal(gatePassableForActor(state,4.25),false);
});
test('2nd floor key reader cannot be opened behind the real physical housing',()=>{
 const app=read('App.jsx');
 assert.match(app,/canStartKeyReader\(eye,looking\)/);
 assert.match(app,/canHoldKeyReader\(camera\.position\.x,camera\.position\.z\)/);
 assert.ok(SECURITY_KEY_READER[0]>0);
});
test('single footfall contact and inhale/exhale never re-introduce synthesized whump',()=>{
 const footsteps=read('recordedFootsteps.js'),vitals=read('vitalsAudio.js'),observer=read('observerSpatialAudio.js');
 assert.match(footsteps,/findFootstepOnset/);
 assert.match(footsteps,/FOOTSTEP_MAX_SECONDS=\.235/);
 assert.match(footsteps,/trimFootstepBuffer\(ctx,decoded\)/);
 assert.match(vitals,/phase\(time,p\.inhale/);
 assert.match(vitals,/phase\(time\+p\.inhale/);
 assert.doesNotMatch(vitals,/filter\.frequency\.value=760/);
 assert.match(observer,/nearfieldWarning\(t,'lock'\)/);
 assert.doesNotMatch(observer,/createOscillator\(\)/);
});
