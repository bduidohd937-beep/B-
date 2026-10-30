import {
 observerSoundCue,observerSoundProfile,OBSERVER_AUDIO_RANGE
} from './observerAudioRules.js';

// Single reusable 3D voice for the MOVEMENT-spotting Observer. It uses the
// same AudioContext / listener as B∞'s main spatial mixer; it does not call
// onNoise and therefore cannot lure the sound-sensitive Listener.
export function createSpatialObserverAudio(ctx,master,sharedNoise){
 const panner=ctx.createPanner();
 panner.panningModel='HRTF';
 panner.distanceModel='inverse';
 panner.refDistance=5.2;
 panner.maxDistance=OBSERVER_AUDIO_RANGE+8;
 panner.rolloffFactor=.96;

 const filter=ctx.createBiquadFilter();
 filter.type='lowpass';filter.frequency.value=1200;
 const motor=ctx.createOscillator();
 motor.type='sawtooth';
 motor.frequency.value=82;
 const motorGain=ctx.createGain();
 motorGain.gain.value=0;
 motor.connect(filter);filter.connect(motorGain);
 motorGain.connect(panner);panner.connect(master);
 motor.start();

 const harmonic=ctx.createOscillator();
 harmonic.type='triangle';harmonic.frequency.value=167;
 const harmonicGain=ctx.createGain();
 harmonicGain.gain.value=0;
 harmonic.connect(harmonicGain);harmonicGain.connect(panner);
 harmonic.start();

 let disposed=false,mode='scan',nextFootfall=0;
 function position([x,y,z],t){
   if(panner.positionX){
     panner.positionX.setTargetAtTime(x,t,.045);
     panner.positionY.setTargetAtTime(y,t,.045);
     panner.positionZ.setTargetAtTime(z,t,.045);
   }else panner.setPosition(x,y,z);
 }
 function cue(kind,t){
   if(disposed)return;
   // Distinct electronic servo alarm: the warning is not the chase itself.
   const oscillator=ctx.createOscillator();
   const envelope=ctx.createGain();
   oscillator.type=kind==='lock'?'sawtooth':'triangle';
   const length=kind==='detected'?.32:kind==='lock'?.53:.42;
   const start=kind==='detected'?650:kind==='lock'?330:520;
   const end=kind==='detected'?1030:kind==='lock'?96:230;
   oscillator.frequency.setValueAtTime(start,t);
   oscillator.frequency.exponentialRampToValueAtTime(end,t+length);
   envelope.gain.setValueAtTime(.0001,t);
   envelope.gain.exponentialRampToValueAtTime(kind==='lock'?.36:kind==='detected'?.24:.13,t+.022);
   envelope.gain.exponentialRampToValueAtTime(.0001,t+length);
   oscillator.connect(envelope);envelope.connect(panner);
   oscillator.start(t);oscillator.stop(t+length+.01);
   oscillator.onended=()=>{
     try{oscillator.disconnect();envelope.disconnect();}catch{}
   };
   // Metallic shudder when the lens turns red. Bounded by the global
   // compressor: high dramatic impact, not unchecked speaker amplitude.
   if(kind==='lock'){
     const metal=ctx.createBufferSource();
     metal.buffer=sharedNoise;
     const metalFilter=ctx.createBiquadFilter();
     metalFilter.type='bandpass';metalFilter.frequency.value=1350;metalFilter.Q.value=.6;
     const gain=ctx.createGain();
     gain.gain.setValueAtTime(.0001,t);
     gain.gain.exponentialRampToValueAtTime(.29,t+.027);
     gain.gain.exponentialRampToValueAtTime(.0001,t+.29);
     metal.connect(metalFilter);metalFilter.connect(gain);gain.connect(panner);
     metal.start(t,0);metal.stop(t+.30);
     metal.onended=()=>{
       try{metal.disconnect();metalFilter.disconnect();gain.disconnect();}catch{}
     };
   }
 }
 function footfall(t,intensity){
   const source=ctx.createBufferSource();
   source.buffer=sharedNoise;
   const low=ctx.createBiquadFilter();
   low.type='lowpass';low.frequency.value=520+intensity*1100;
   const gain=ctx.createGain();
   gain.gain.setValueAtTime(.0001,t);
   gain.gain.exponentialRampToValueAtTime(.22+.12*intensity,t+.012);
   gain.gain.exponentialRampToValueAtTime(.0001,t+.19);
   source.connect(low);low.connect(gain);gain.connect(panner);
   source.start(t,Math.random()*.65);source.stop(t+.205);
   source.onended=()=>{
     try{source.disconnect();low.disconnect();gain.disconnect();}catch{}
   };
 }
 function update(data){
   if(disposed||ctx.state==='closed')return;
   const t=ctx.currentTime;
   if(!data?.active){
     motorGain.gain.setTargetAtTime(0,t,.08);
     harmonicGain.gain.setTargetAtTime(0,t,.08);
     nextFootfall=t+.12;
     mode='scan';
     return;
   }
   const next=data.state||'scan';
   const place=data.position;
   const viewer=data.listenerPosition;
   if(!Array.isArray(place)||place.length<3||!Array.isArray(viewer)||viewer.length<3)return;
   position(place,t);
   const distance=Math.hypot(viewer[0]-place[0],viewer[2]-place[2]);
   const profile=observerSoundProfile(next,distance,data.suspicion);
   const transition=observerSoundCue(mode,next,true);
   // One alert for initial detection, one for lock-on, a dying electronic
   // whine when the player successfully breaks line of sight.
   if(transition&&distance<OBSERVER_AUDIO_RANGE)cue(transition,t);
   mode=next;
   motorGain.gain.setTargetAtTime(profile.gain,t,.12);
   harmonicGain.gain.setTargetAtTime(profile.gain*.52,t,.15);
   filter.frequency.setTargetAtTime(profile.lowpass,t,.12);
   motor.frequency.setTargetAtTime(next==='chase'?112:next==='alert'?91:76,t,.1);
   harmonic.frequency.setTargetAtTime(next==='chase'?226:next==='alert'?192:160,t,.18);
   if(profile.steps&&t>=nextFootfall){
     const close=Math.max(0,Math.min(1,1-distance/OBSERVER_AUDIO_RANGE));
     footfall(t,close);
     nextFootfall=t+profile.stepInterval;
   }else if(!profile.steps){
     nextFootfall=t+.15;
   }
 }
 function dispose(){
   if(disposed)return;
   disposed=true;
   for(const source of [motor,harmonic]){
     try{source.stop();}catch{}
     try{source.disconnect();}catch{}
   }
   for(const node of [filter,motorGain,harmonicGain,panner]){
     try{node.disconnect();}catch{}
   }
 }
 return {update,dispose};
}
