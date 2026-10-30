import {humanBreathProfile} from './breathRules.js';
import { heartIntensity } from './survival.js';

// Non-positional body sounds heard ONLY by the player. Heartbeat is never an
// AI noise event. Breath is audible locally; Player separately emits AI noise.
export function createVitalsAudio(ctx, master, noiseBuffer){
  let nextBeat=0, nextBreath=0, disposed=false;
  function pulse(time,pitch,volume){
    const oscillator=ctx.createOscillator();
    const filter=ctx.createBiquadFilter();
    const gain=ctx.createGain();
    oscillator.type='sine';
    oscillator.frequency.setValueAtTime(pitch,time);
    oscillator.frequency.exponentialRampToValueAtTime(pitch*.56,time+.11);
    filter.type='lowpass';
    filter.frequency.value=190;
    gain.gain.setValueAtTime(.0001,time);
    gain.gain.exponentialRampToValueAtTime(volume,time+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,time+.17);
    oscillator.connect(filter);filter.connect(gain);gain.connect(master);
    oscillator.start(time);
    oscillator.stop(time+.18);
    oscillator.onended=()=>{oscillator.disconnect();filter.disconnect();gain.disconnect();};
  }
  function breath(time,level){
    const p=humanBreathProfile(level);
    if(!p.gain)return;
    // Two distinct pressure envelopes instead of one harsh constant bandpass
    // hiss: short nasal intake, slight silence, softer longer mouth exhale.
    const phase=(at,duration,peak,cutoff)=>{
      const source=ctx.createBufferSource();
      source.buffer=noiseBuffer;source.loop=true;
      const low=ctx.createBiquadFilter();
      low.type='lowpass';low.frequency.value=cutoff;
      const nose=ctx.createBiquadFilter();
      nose.type='peaking';nose.frequency.value=p.pitch;
      nose.Q.value=.8;nose.gain.value=2;
      const envelope=ctx.createGain();
      envelope.gain.setValueAtTime(.0001,at);
      envelope.gain.linearRampToValueAtTime(peak,at+duration*.35);
      envelope.gain.setTargetAtTime(.0001,at+duration*.55,duration*.1);
      envelope.gain.setValueAtTime(.0001,at+duration);
      source.connect(low);low.connect(nose);nose.connect(envelope);
      envelope.connect(master);
      source.start(at,Math.random()*.2);
      source.stop(at+duration+.018);
      source.onended=()=>{
        try{source.disconnect();low.disconnect();nose.disconnect();envelope.disconnect();}catch{}
      };
    };
    phase(time,p.inhale,p.gain,480);
    phase(time+p.inhale+.085,p.exhale,p.gain*.67,330);
  }
  function update({active=false,breathLevel=0,creatureDistance=Infinity}={}){
    if(disposed||ctx.state==='closed')return;
    const now=ctx.currentTime;
    if(!active){
      nextBeat=now;
      nextBreath=now;
      return;
    }
    const heart=heartIntensity(creatureDistance);
    if(heart>.03){
      if(now>=nextBeat){
        pulse(now,84,heart*.32);
        pulse(now+.17,65,heart*.23);
        nextBeat=now+1.12-heart*.52;
      }
    }else nextBeat=now;
    if(breathLevel>0){
      if(now>=nextBreath){
        breath(now,breathLevel);
        nextBreath=now+humanBreathProfile(breathLevel).interval;
      }
    }else nextBreath=now;
  }
  return {update,dispose(){disposed=true;}};
}
