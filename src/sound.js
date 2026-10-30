// Procedural audio; all sources are generated locally (no licensed audio files).
export function createSoundEngine() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  let enabled = true;
  const master = ctx.createGain();
  master.gain.value = .48;
  master.connect(ctx.destination);
  const humOsc = ctx.createOscillator();
  const humLowpass = ctx.createBiquadFilter();
  const humGain = ctx.createGain();
  humOsc.type='sawtooth'; humOsc.frequency.value=58;
  humLowpass.type='lowpass';humLowpass.frequency.value=95;
  humGain.gain.value=.026;
  humOsc.connect(humLowpass).connect(humGain).connect(master);
  humOsc.start();
  function pulse(freq, duration, volume, noise=false) {
    if (!enabled || ctx.state==='closed') return;
    const now=ctx.currentTime;
    const gain=ctx.createGain();
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume),now+.009);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    gain.connect(master);
    let src;
    if(noise) {
      const buffer=ctx.createBuffer(1,Math.max(1,Math.round(ctx.sampleRate*duration)),ctx.sampleRate);
      const data=buffer.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
      src=ctx.createBufferSource();src.buffer=buffer;
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=freq;
      src.connect(filter).connect(gain);
    } else {
      src=ctx.createOscillator();src.type='triangle';src.frequency.setValueAtTime(freq,now);
      src.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.55),now+duration);
      src.connect(gain);
    }
    src.start(now);src.stop(now+duration+.01);
    src.onended=()=>{try{src.disconnect();gain.disconnect();}catch{}};
  }
  function step(mode) {
    const strength=mode==='sprint'?.19:mode==='crouch'?.035:.095;
    pulse(mode==='sprint'?380:270,.085,strength,true);
    pulse(85,.085,strength*.45);
  }
  function land(){pulse(220,.19,.28,true);pulse(54,.23,.18);}
  function flicker(){pulse(1600,.035,.075,true);}
  return {
    step,land,flicker,
    resume(){if(ctx.state==='suspended')ctx.resume();},
    setEnabled(v){enabled=v;master.gain.setTargetAtTime(v?.48:0,ctx.currentTime,.03);},
    dispose(){try{humOsc.stop();}catch{}ctx.close();}
  };
}
