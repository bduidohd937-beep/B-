import {
 observerSoundCue,observerSoundProfile,OBSERVER_AUDIO_RANGE
} from './observerAudioRules.js';

// An old industrial servo with HEAVY metal contact, not a high-pitched insect.
// This is purely audible to the player. It never submits a Listener noise event.
export function createSpatialObserverAudio(ctx,master,sharedNoise){
 const panner=ctx.createPanner();
 panner.panningModel='HRTF';
 panner.distanceModel='inverse';
 panner.refDistance=6;
 panner.maxDistance=OBSERVER_AUDIO_RANGE+8;
 panner.rolloffFactor=.9;

 const filter=ctx.createBiquadFilter();
 filter.type='lowpass';filter.frequency.value=360;
 const motor=ctx.createOscillator();
 motor.type='sawtooth';motor.frequency.value=53;
 const motorGain=ctx.createGain();motorGain.gain.value=0;
 motor.connect(filter);filter.connect(motorGain);
 motorGain.connect(panner);panner.connect(master);
 motor.start();

 const sub=ctx.createOscillator();
 sub.type='triangle';sub.frequency.value=38;
 const subGain=ctx.createGain();subGain.gain.value=0;
 sub.connect(subGain);subGain.connect(panner);sub.start();

 let disposed=false,mode='scan',nextFootfall=0,footSide=0;
 const clean=(...nodes)=>{for(const node of nodes)try{node.disconnect();}catch{}};
 const transient=(freq,type,volume,duration,t,offset=0)=>{
   const source=ctx.createBufferSource();
   source.buffer=sharedNoise;
   const band=ctx.createBiquadFilter();
   band.type=type;band.frequency.value=freq;band.Q.value=.75;
   const gain=ctx.createGain();
   const start=t+offset;
   gain.gain.setValueAtTime(.0001,start);
   gain.gain.exponentialRampToValueAtTime(volume,start+.016);
   gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
   source.connect(band);band.connect(gain);gain.connect(panner);
   source.start(start,Math.random()*.4);source.stop(start+duration+.02);
   source.onended=()=>clean(source,band,gain);
 };
 function position([x,y,z],t){
   if(panner.positionX){
     panner.positionX.setTargetAtTime(x,t,.05);
     panner.positionY.setTargetAtTime(y,t,.05);
     panner.positionZ.setTargetAtTime(z,t,.05);
   }else panner.setPosition(x,y,z);
 }
 function servoPunch(startHz,endHz,length,gain,t){
   const source=ctx.createOscillator(),env=ctx.createGain();
   source.type='triangle';
   source.frequency.setValueAtTime(startHz,t);
   source.frequency.exponentialRampToValueAtTime(endHz,t+length);
   env.gain.setValueAtTime(.0001,t);
   env.gain.exponentialRampToValueAtTime(gain,t+.029);
   env.gain.exponentialRampToValueAtTime(.0001,t+length);
   source.connect(env);env.connect(panner);
   source.start(t);source.stop(t+length+.02);
   source.onended=()=>clean(source,env);
 }
 function cue(kind,t){
   if(disposed)return;
   if(kind==='detected'){
     // Mechanical iris snaps shut. Two dry catches; no rising electronic bee.
     transient(970,'bandpass',.20,.095,t);
     transient(1250,'bandpass',.16,.072,t,.095);
     servoPunch(145,73,.31,.16,t);
   }else if(kind==='lock'){
     // Heavy industrial impact + a low-frequency hydraulic deceleration.
     transient(510,'lowpass',.32,.24,t);
     transient(890,'bandpass',.26,.21,t,.055);
     servoPunch(105,41,.52,.30,t);
   }else if(kind==='lost'){
     // Abrupt lock release. Leave the breathing low motor in search only.
     transient(550,'lowpass',.095,.15,t);
     servoPunch(84,49,.25,.12,t);
   }
 }
 function footfall(t,intensity){
   const side=footSide++%2;
   // Irregular heavy steel steps with a small trailing contact.
   transient(470+side*110,'lowpass',.25+.12*intensity,.15,t);
   transient(920+side*140,'bandpass',.085+.06*intensity,.075,t,.065);
 }
 function update(data){
   if(disposed||ctx.state==='closed')return;
   const t=ctx.currentTime;
   if(!data?.active){
     motorGain.gain.setTargetAtTime(0,t,.06);
     subGain.gain.setTargetAtTime(0,t,.06);
     nextFootfall=t+.1;
     mode='scan';
     return;
   }
   const next=data.state||'scan';
   const place=data.position,viewer=data.listenerPosition;
   if(!Array.isArray(place)||place.length<3||!Array.isArray(viewer)||viewer.length<3)return;
   position(place,t);
   const distance=Math.hypot(viewer[0]-place[0],viewer[2]-place[2]);
   const profile=observerSoundProfile(next,distance,data.suspicion);
   const transition=observerSoundCue(mode,next,true);
   if(transition&&distance<OBSERVER_AUDIO_RANGE)cue(transition,t);
   mode=next;
   motorGain.gain.setTargetAtTime(profile.gain,t,next==='search'?.04:.13);
   subGain.gain.setTargetAtTime(profile.gain*.62,t,.12);
   filter.frequency.setTargetAtTime(profile.lowpass,t,.15);
   motor.frequency.setTargetAtTime(next==='chase'?61:next==='alert'?55:48,t,.2);
   sub.frequency.setTargetAtTime(next==='chase'?44:36,t,.18);
   if(profile.steps&&t>=nextFootfall){
     const close=Math.max(0,Math.min(1,1-distance/OBSERVER_AUDIO_RANGE));
     footfall(t,close);
     nextFootfall=t+profile.stepInterval+(footSide%2?.065:-.035);
   }else if(!profile.steps){
     nextFootfall=t+.13;
   }
 }
 function dispose(){
   if(disposed)return;
   disposed=true;
   for(const source of [motor,sub])try{source.stop();}catch{}
   clean(motor,sub,filter,motorGain,subGain,panner);
 }
 return {update,dispose};
}
