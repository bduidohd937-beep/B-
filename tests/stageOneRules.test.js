import test from 'node:test';
import assert from 'node:assert/strict';
import {
  freshStageOne,applyStageOneAction,stageOneObjective,
  stageOneGateReady,stageOneGateOpen,STAGE_ONE_SAFE_STEPS,
  findStageOneInteraction,STAGE_ONE_SAFE
} from '../src/stageOneRules.js';
import {freshGateAuthentication} from '../src/exitAuthorization.js';

test('Stage 01 requires record -> 317 -> three safe latches -> power -> shutter',()=>{
  let state=freshStageOne(),gate=freshGateAuthentication();
  assert.match(stageOneObjective(state),/기록/);
  assert.equal(applyStageOneAction(state,'vehicle').event,'need-record');
  assert.equal(applyStageOneAction(state,'safe').noise,0);
  state=applyStageOneAction(state,'record').state;
  assert.match(stageOneObjective(state),/317/);
  state=applyStageOneAction(state,'vehicle').state;
  assert.match(stageOneObjective(state),/금고/);
  for(let i=0;i<STAGE_ONE_SAFE_STEPS;i++){
    const out=applyStageOneAction(state,'safe');
    assert.equal(out.noise,68);
    state=out.state;
    assert.equal(state.tumblers,i+1);
  }
  assert.equal(state.key,true);
  assert.equal(stageOneGateReady(state,false),false);
  assert.equal(stageOneGateReady(state,true),true);
  assert.equal(stageOneGateOpen(state,true,gate),false);
  gate={phase:'open',hold:3.25,elapsed:5.25,alarmRaised:true};
  assert.equal(stageOneGateOpen(state,true,gate),true);
  assert.equal(stageOneGateOpen(freshStageOne(),true,gate),false);
});
test('Retreating from the safe preserves latches and the key is not farmable',()=>{
  let state=freshStageOne();
  state=applyStageOneAction(state,'record').state;
  state=applyStageOneAction(state,'vehicle').state;
  state=applyStageOneAction(state,'safe').state;
  const afterRetreat={...state};
  assert.equal(applyStageOneAction(afterRetreat,'safe').state.tumblers,2);
  const finished=applyStageOneAction(applyStageOneAction(afterRetreat,'safe').state,'safe').state;
  assert.equal(applyStageOneAction(finished,'safe').noise,0);
  assert.equal(applyStageOneAction(finished,'safe').state,finished);
});
test('Physical focus requires approaching and looking at actual safe face',()=>{
  const [x,y,z]=STAGE_ONE_SAFE;
  assert.equal(findStageOneInteraction([x,y,z+1.3],[0,0,-1])?.kind,'safe');
  assert.notEqual(findStageOneInteraction([x,y,z+10],[0,0,-1])?.kind,'safe');
  assert.notEqual(findStageOneInteraction([x,y,z+1.3],[0,0,1])?.kind,'safe');
});
