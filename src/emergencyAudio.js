// Original procedural industrial air-raid warning. This is an authored WebAudio
// soundscape, NOT a high-SPL recording. The UI volume and two compressors
// protect against clipping; actual headset loudness is controlled by the user.
export const DEFAULT_SIREN_VOLUME=.68;
export function clampSirenVolume(value){
  return Math.min(1,Math.max(0,Number.isFinite(value)?value:DEFAULT_SIREN_VOLUME));
}
// The siren stays imposing, but when a monster is within arm's reach
// a small level carve stops its metallic footsteps from being buried.
export function sirenDuckedGain(userVolume,distance=Infinity){
 const d=Number.isFinite(distance)?Math.max(0,distance):Infinity;
 const close=Math.max(0,Math.min(1,(13-d)/11));
 return clampSirenVolume(userVolume)*(1-.25*close);
}
export function createEmergencyAudio(ctx,master,noiseBuffer){
  const bus=ctx.createGain();
  bus.gain.value=DEFAULT_SIREN_VOLUME;
  const compressor=ctx.createDynamicsCompressor();
  compressor.threshold.value=-21;
  compressor.knee.value=5;
  compressor.ratio.value=12;
  compressor.attack.value=.004;
  compressor.release.value=.17;
  bus.connect(compressor);compressor.connect(master);
  let active=null,volume=DEFAULT_SIREN_VOLUME,threatDistance=Infinity;
  function refreshMix(){
    if(ctx.state!=='closed')
      bus.gain.setTargetAtTime(sirenDuckedGain(volume,threatDistance),ctx.currentTime,.12);
  }
  function setVolume(value){volume=clampSirenVolume(value);refreshMix();}
  function setThreatDistance(distance){
    const next=Number.isFinite(distance)?Math.max(0,distance):Infinity;
    if(Math.abs(next-threatDistance)<.45||next===Infinity&&threatDistance===Infinity)return;
    threatDistance=next;refreshMix();
  }
  function stop(){
    if(!active)return;
    const old=active;
    active=null;
    if(ctx.state==='closed')return;
    const now=ctx.currentTime;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setTargetAtTime(.00001,now,.055);
    for(const source of old.sources){
      try{source.stop(now+.30);}catch{}
    }
  }
  function start(position=[0,1.7,-25],duration=9){
    stop();
    if(ctx.state==='closed')return;
    const now=ctx.currentTime;
    const length=Math.max(1,Math.min(12,duration));
    const end=now+length;
    const panner=ctx.createPanner();
    panner.panningModel='HRTF';
    panner.distanceModel='inverse';
    panner.refDistance=35;
    panner.maxDistance=145;
    panner.rolloffFactor=.25;
    if(panner.positionX){
      panner.positionX.value=position[0];
      panner.positionY.value=position[1]||1.7;
      panner.positionZ.value=position[2];
    }else panner.setPosition(position[0],position[1]||1.7,position[2]);
    const gain=ctx.createGain();
    gain.gain.setValueAtTime(1,now);
    const dry=ctx.createGain(),echo=ctx.createDelay(.75),wet=ctx.createGain();
    dry.gain.value=.74;echo.delayTime.value=.21;wet.gain.value=.25;
    panner.connect(dry);panner.connect(echo);echo.connect(wet);
    dry.connect(gain);wet.connect(gain);gain.connect(bus);
    const sources=[],nodes=[panner,gain,dry,echo,wet];
    function startOsc(type,volume,filterFreq,frequency){
      const oscillator=ctx.createOscillator();
      oscillator.type=type;oscillator.frequency.value=frequency;
      const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=filterFreq;
      const level=ctx.createGain();
      level.gain.setValueAtTime(.0001,now);
      level.gain.exponentialRampToValueAtTime(Math.max(.001,volume),now+.7);
      level.gain.setValueAtTime(volume,Math.max(now+.8,end-.42));
      level.gain.exponentialRampToValueAtTime(.0001,end);
      oscillator.connect(filter);filter.connect(level);level.connect(panner);
      oscillator.start(now);oscillator.stop(end+.03);
      sources.push(oscillator);nodes.push(oscillator,filter,level);
      return oscillator;
    }
    // Staggered, opposing harmonic sirens sound much larger than one shrill sine.
    const high=startOsc('sawtooth',.24,1720,435);
    const second=startOsc('triangle',.30,1320,265);
    const motor=startOsc('sawtooth',.22,180,62);
    for(let t=now;t<end;t+=2.4){
      const turn=Math.min(t+1.12,end),finish=Math.min(t+2.36,end);
      high.frequency.setValueAtTime(425,t);
      if(turn>t)high.frequency.linearRampToValueAtTime(755,turn);
      if(finish>turn)high.frequency.linearRampToValueAtTime(415,finish);
      second.frequency.setValueAtTime(265,t);
      if(turn>t)second.frequency.linearRampToValueAtTime(460,turn);
      if(finish>turn)second.frequency.linearRampToValueAtTime(240,finish);
      motor.frequency.setValueAtTime(61,t);
      if(turn>t)motor.frequency.linearRampToValueAtTime(85,turn);
      if(finish>turn)motor.frequency.linearRampToValueAtTime(57,finish);
    }
    // Huge mechanical relay slam and hiss at activation, followed by PA static.
    function transient(startAt,seconds,frequency,volume,band='bandpass'){
      const src=ctx.createBufferSource();src.buffer=noiseBuffer;src.loop=seconds>1;
      const filter=ctx.createBiquadFilter();filter.type=band;filter.frequency.value=frequency;
      filter.Q.value=.4;
      const g=ctx.createGain();
      g.gain.setValueAtTime(.0001,startAt);
      g.gain.exponentialRampToValueAtTime(volume,startAt+.025);
      g.gain.exponentialRampToValueAtTime(.0001,startAt+seconds);
      src.connect(filter);filter.connect(g);g.connect(panner);
      src.start(startAt,0);src.stop(startAt+seconds+.01);
      sources.push(src);nodes.push(src,filter,g);
    }
    transient(now,.41,490,.60,'lowpass');
    transient(now+.38,.58,1780,.23);
    transient(now+2.15,1.05,980,.21);
    transient(now+5.80,1.05,1180,.24);
    // Harsh public-address acknowledgement bursts, deliberately unintelligible.
    // Avoid hallucinated claims that this is intelligible speech.
    for(const at of [2.30,2.76,5.94,6.44]){
      if(at+.18>=length)continue;
      const beep=ctx.createOscillator();beep.type='square';
      beep.frequency.value=at>5?340:390;
      const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=680;filter.Q.value=.64;
      const g=ctx.createGain();
      g.gain.setValueAtTime(.0001,now+at);
      g.gain.exponentialRampToValueAtTime(.17,now+at+.025);
      g.gain.exponentialRampToValueAtTime(.0001,now+at+.21);
      beep.connect(filter);filter.connect(g);g.connect(panner);
      beep.start(now+at);beep.stop(now+at+.22);
      sources.push(beep);nodes.push(beep,filter,g);
    }
    let remaining=sources.length;
    for(const source of sources){
      source.onended=()=>{
        remaining--;
        if(remaining>0)return;
        for(const node of nodes)try{node.disconnect();}catch{}
        if(active?.gain===gain)active=null;
      };
    }
    active={gain,sources};
  }
  function dispose(){
    stop();
    try{bus.disconnect();compressor.disconnect();}catch{}
  }
  return {start,stop,setVolume,setThreatDistance,dispose};
}
