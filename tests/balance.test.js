import test from 'node:test';
import assert from 'node:assert/strict';
import {
  motionExposure,tickObservation,OBSERVER_LOSE_SIGHT_SECONDS,
  OBSERVER_PURSUIT_SPEED,OBSERVER_VIEW_DISTANCE
} from '../src/observerRules.js';

function expose(seconds,config,initial=0){
  const rate=motionExposure(config);
  let value=initial;
  for(let t=0;t<seconds;t+=.02){
    value=tickObservation(value,rate,Math.min(.02,seconds-t));
  }
  return value;
}
test('Observer gives a visible opportunity to stop walking before full lock-on',()=>{
  const walk={distance:8,dot:1,speed:3,blocked:false,crouched:false};
  assert.ok(expose(.6,walk)<1);
  assert.ok(expose(1.15,walk)>=1);
});
test('Sprinting remains dangerous; crouch movement is harder to notice',()=>{
  const base={distance:8,dot:1,blocked:false,crouched:false};
  assert.ok(expose(.65,{...base,speed:6})>=1);
  assert.ok(expose(.65,{...base,speed:1.45,crouched:true})<.3);
});
test('Breaking sight by hiding behind a parked car lets suspicion recover',()=>{
  const base={distance:7,dot:1,speed:3,blocked:false};
  const suspicion=expose(.45,base);
  assert.ok(suspicion>.3&&suspicion<1);
  const hidden=expose(1.1,{...base,blocked:true},suspicion);
  assert.equal(hidden,0);
});
test('Observer has finite reach and chase memory, still a threat',()=>{
  assert.ok(OBSERVER_VIEW_DISTANCE>=16&&OBSERVER_VIEW_DISTANCE<=20);
  assert.ok(OBSERVER_LOSE_SIGHT_SECONDS>0&&OBSERVER_LOSE_SIGHT_SECONDS<=1.2);
  assert.ok(OBSERVER_PURSUIT_SPEED>=3&&OBSERVER_PURSUIT_SPEED<=3.5);
});
