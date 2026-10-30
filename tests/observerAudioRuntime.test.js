import test from 'node:test';
import assert from 'node:assert/strict';
import {createSpatialObserverAudio} from '../src/observerSpatialAudio.js';

function fakeContext(){
 const metric={starts:0,panners:0,lowPasses:0};
 const param=()=>({value:0,setTargetAtTime(v){this.value=v;},
   setValueAtTime(v){this.value=v;},
   exponentialRampToValueAtTime(v){this.value=v;}});
 const node=()=>({connect(){return this;},disconnect(){},start(){metric.starts++;},
   stop(){},onended:null,
   frequency:param(),gain:param(),Q:param(),
   positionX:param(),positionY:param(),positionZ:param()});
 const ctx={
  currentTime:0,state:'running',
  createGain:node,
  createBufferSource:node,
  createBiquadFilter(){metric.lowPasses++;return node();},
  createPanner(){metric.panners++;return node();}
 };
 return {ctx,metric};
}
test('observer produces real WebAudio sources on detect, lock, footsteps, and search',()=>{
 const {ctx,metric}=fakeContext();
 const voice=createSpatialObserverAudio(ctx,{connect(){}},{length:10000});
 assert.equal(metric.panners,1);
 const at=(state,time=0)=>{ctx.currentTime=time;voice.update({
   active:true,position:[9,2,-11],listenerPosition:[10,1.7,-10],
   state,suspicion:.9
 });};
 at('scan');
 const base=metric.starts;
 at('alert',.1);
 assert.ok(metric.starts>base,'detect must audibly start cue sources');
 const detect=metric.starts;
 at('alert',.18);
 assert.equal(metric.starts,detect,'stable alert must NOT repeat a beep every update');
 at('chase',.3);
 assert.ok(metric.starts>detect+2,'chase lock must start loud transient & footfall');
 const chase=metric.starts;
 at('search',.48);
 assert.ok(metric.starts>chase,'search mode must include one short lock-release cue');
 voice.update({active:false});
 voice.dispose();
});
