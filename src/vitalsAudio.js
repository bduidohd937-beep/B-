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
    const source=ctx.createBufferSource();
    const filter=ctx.createBiquadFilter();
    const gain=ctx.createGain();
    source.buffer=noiseBuffer;
    filter.type='bandpass';
    filter.frequency.value=760;
    filter.Q.value=.38;
    const volume=Math.min(.25,.035+level*.008);
    gain.gain.setValueAtTime(.0001,time);
    gain.gain.exponentialRampToValueAtTime(volume,time+.11);
    gain.gain.exponentialRampToValueAtTime(.0001,time+.62);
    source.connect(filter);filter.connect(gain);gain.connect(master);
    source.start(time,Math.random()*.12);
    source.stop(time+.64);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
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
        nextBreath=now+(breathLevel>=14?.92:1.45);
      }
    }else nextBreath=now;
  }
  return {update,dispose(){disposed=true;}};
}
