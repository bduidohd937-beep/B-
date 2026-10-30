import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSurvival,tickSurvival,breathLoudness,breathHearingRadius,heartIntensity } from '../src/survival.js';

function simulate(state,seconds,options){
  let result;
  for(let i=0;i<Math.round(seconds/.05);i++){
    result=tickSurvival(state,{dt:.05,...options});
    state=result.state;
  }
  return result;
}
test('approximately 6 seconds of running, never negative stamina',()=>{
  const r=simulate(freshSurvival(),8,{moving:true,wantsSprint:true});
  assert.ok(r.state.stamina<1);
  assert.ok(r.exhausted);
});
test('exhaustion disables running without disabling ordinary walking',()=>{
  let r=simulate(freshSurvival(),8,{moving:true,wantsSprint:true});
  const exhausted=r.state;
  r=tickSurvival(exhausted,{dt:.05,moving:true,wantsSprint:true});
  assert.equal(r.sprinting,false);
  assert.ok(r.state.stamina>=0);
});
test('normal walking and crouched movement now cost stamina, but still permit stealth',()=>{
 const normal=simulate(freshSurvival(),20,{moving:true});
 const crouched=simulate(freshSurvival(),20,{moving:true,crouching:true});
 assert.ok(normal.state.stamina<80 && normal.state.stamina>65);
 assert.ok(crouched.state.stamina<100 && crouched.state.stamina>normal.state.stamina);
 const rested=simulate(normal.state,4,{moving:false,crouching:true});
 assert.ok(rested.state.stamina>normal.state.stamina);
});
test('resting and crouching recover more quickly than walking',()=>{
  const start={stamina:24,lockout:0,recentlyRan:0};
  const walking=simulate(start,1,{moving:true});
  const standing=simulate(start,1,{moving:false});
  const crouch=simulate(start,1,{moving:false,crouching:true});
  assert.ok(walking.state.stamina<standing.state.stamina);
  assert.ok(standing.state.stamina<crouch.state.stamina);
});
test('rapid Shift tapping cannot bypass the recovery delay',()=>{
  let state=freshSurvival();
  for(let i=0;i<30;i++){
    const sprint=tickSurvival(state,{dt:.05,moving:true,wantsSprint:true});
    state=sprint.state;
    const off=tickSurvival(state,{dt:.05,moving:true,wantsSprint:false});
    state=off.state;
  }
  assert.ok(state.stamina<90,'stamina='+state.stamina);
});
test('breathing is narrowly audible at low stamina, not across garage',()=>{
  assert.equal(breathLoudness(100),0);
  assert.equal(breathLoudness(36),10);
  assert.ok(breathLoudness(12)>=14);
  assert.equal(breathHearingRadius(10),0);
  assert.ok(breathHearingRadius(24)<=4.6);
  assert.ok(breathHearingRadius(18)<breathHearingRadius(24));
});
test('heartbeat is purely danger-distance feedback',()=>{
  assert.equal(heartIntensity(Infinity),0);
  assert.equal(heartIntensity(15),0);
  assert.equal(heartIntensity(2),1);
  assert.ok(heartIntensity(7)>heartIntensity(12));
});
test('stamina is clamped at frame-rate independent integration limits',()=>{
  const full=tickSurvival(freshSurvival(),{dt:100,moving:true,wantsSprint:true});
  assert.ok(full.state.stamina>=98);
  assert.equal(simulate(freshSurvival(),100,{moving:false}).state.stamina,100);
});
