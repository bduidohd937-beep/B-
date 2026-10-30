import { createSpatialCreatureAudio } from './spatialAudio.js';
import { createSpatialObserverAudio } from './observerSpatialAudio.js';
import { createVitalsAudio } from './vitalsAudio.js';
import { createEmergencyAudio } from './emergencyAudio.js';

// Original synthesized footsteps and impacts. No external sound assets.
export function createSoundEngine() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  const ctx = new AudioContextClass();
  let enabled = true;

  // Keep the low fluorescent hum well below transient effects.
  const master = ctx.createGain();
  master.gain.value = .85;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 9;
  limiter.ratio.value = 6;
  limiter.attack.value = .004;
  limiter.release.value = .18;
  master.connect(limiter);
  limiter.connect(ctx.destination);

  const hum = ctx.createOscillator();
  const humFilter = ctx.createBiquadFilter();
  const humLevel = ctx.createGain();
  hum.type = 'sawtooth';
  hum.frequency.value = 59;
  humFilter.type = 'lowpass';
  humFilter.frequency.value = 95;
  humLevel.gain.value = .012;
  hum.connect(humFilter);
  humFilter.connect(humLevel);
  humLevel.connect(master);
  hum.start();

  // One shared noise buffer instead of generating thousands of samples every step.
  const noiseBuffer = ctx.createBuffer(1, Math.round(ctx.sampleRate), ctx.sampleRate);
  const values = noiseBuffer.getChannelData(0);
  for (let i = 0; i < values.length; i++) values[i] = Math.random() * 2 - 1;

  const creatureAudio = createSpatialCreatureAudio(ctx, master, noiseBuffer);
  const observerAudio = createSpatialObserverAudio(ctx, master, noiseBuffer);
  const playerVitalsAudio = createVitalsAudio(ctx, master, noiseBuffer);
  const emergencyAudio = createEmergencyAudio(ctx, master, noiseBuffer);

  function envelope(gain, time, length, peak) {
    const attack = Math.min(.012, length / 6);
    gain.gain.setValueAtTime(.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), time + attack);
    gain.gain.exponentialRampToValueAtTime(.0001, time + length);
  }

  function noise(freq, length, peak, type = 'bandpass') {
    if (!enabled || ctx.state === 'closed') return;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = .7;
    const gain = ctx.createGain();
    const start = ctx.currentTime;
    envelope(gain, start, length, peak);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(start, Math.random() * Math.max(.001, 1 - length));
    source.stop(start + length + .015);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  function tone(freq, length, peak, type = 'triangle') {
    if (!enabled || ctx.state === 'closed') return;
    const source = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = ctx.currentTime;
    source.type = type;
    source.frequency.setValueAtTime(freq, start);
    source.frequency.exponentialRampToValueAtTime(Math.max(30, freq * .55), start + length);
    envelope(gain, start, length, peak);
    source.connect(gain);
    gain.connect(master);
    source.start(start);
    source.stop(start + length + .015);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
  }

  function step(mode = 'walk') {
    const crouching = mode === 'crouch';
    const running = mode === 'sprint';
    // Mid-frequency concrete scrape + low shoe impact: audible without metal or water.
    noise(crouching ? 620 : running ? 1020 : 830,
      running ? .17 : crouching ? .095 : .135,
      running ? .68 : crouching ? .12 : .42);
    tone(running ? 125 : 96, running ? .15 : .12,
      running ? .40 : crouching ? .075 : .25);
  }

  function jump() {
    noise(960, .22, .63);
    tone(165, .18, .34);
  }
  function land() {
    noise(680, .33, .94);
    tone(115, .32, .67);
    noise(230, .21, .31, 'lowpass');
  }
  function metal() {
    noise(1900, .18, .47);
    tone(560, .20, .25);
  }
  function splash() { noise(2050, .24, .45); }
  function throwCan() {
    noise(2100, .27, .7);
    tone(790, .30, .36);
  }
  function flicker() { noise(2400, .035, .16); }
  function flashlightClick(on=true){
    // A close, dry handheld mechanical click. Real AI hearing is a separate
    // event and only matters when the Listener is within a few meters.
    noise(on?1380:1150,.038,.14);
    tone(on?1050:820,.044,.065,'square');
  }
  // The warning is louder in *perception*, not unlimited amplitude:
  // layered motor, two sweeping harmonics, PA crackle and concrete echo.
  function startSiren(position,duration){
    if(!enabled)return;
    emergencyAudio.start(position,duration);
  }
  function stopSiren(){emergencyAudio.stop();}
  function setSirenVolume(volume){emergencyAudio.setVolume(volume);}
  function itemAction(type,action='pickup'){
    // Small material-specific foley. AI loudness is separately derived in
    // interactions.js rather than assuming this audio volume is AI hearing.
    const metallic=type==='can'||type==='alarm'||type==='radio';
    const picked=action==='pickup',dropped=action==='drop';
    const intensity=dropped?.21:picked?.09:.17;
    if(metallic){
      noise(dropped?1650:1000,dropped?.21:.11,intensity,'bandpass');
      if(dropped)tone(type==='can'?720:460,.15,.12);
    }else if(type==='glow'){
      noise(action==='use'?1450:800,.10,action==='use'?.17:intensity);
    }else if(type==='lube'){
      noise(action==='use'?2500:970,action==='use'?.29:.12,
        action==='use'?.26:intensity,'highpass');
    }else if(type==='energy'){
      noise(action==='use'?2300:970,action==='use'?.20:.13,
        action==='use'?.32:intensity);
      if(action==='use')tone(270,.12,.12);
    }else if(type==='battery'){
      // Plastic pack and metallic battery-terminal taps.
      noise(action==='use'?1680:980,action==='use'?.23:.10,
        action==='use'?.23:intensity);
      tone(action==='use'?560:370,.08,.095);
    }
  }
  let carAlarmNodes=null;
  function stopCarAlarm(){
    if(!carAlarmNodes)return;
    const {source,gain}=carAlarmNodes;
    carAlarmNodes=null;
    if(ctx.state==='closed')return;
    const now=ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(.0001,now,.07);
    try{source.stop(now+.28);}catch{}
  }
  function startCarAlarm(position=[0,.8,0],seconds=5.5){
    stopCarAlarm();
    if(!enabled||ctx.state==='closed')return;
    const now=ctx.currentTime,end=now+Math.max(1,Math.min(8,seconds));
    const panner=ctx.createPanner();
    panner.panningModel='HRTF';
    panner.distanceModel='inverse';panner.refDistance=11;
    panner.maxDistance=80;panner.rolloffFactor=.7;
    if(panner.positionX){
      panner.positionX.value=position[0];panner.positionY.value=position[1]||.8;
      panner.positionZ.value=position[2];
    }else panner.setPosition(position[0],position[1]||.8,position[2]);
    const source=ctx.createOscillator();
    source.type='sawtooth';
    const filter=ctx.createBiquadFilter();
    filter.type='lowpass';filter.frequency.value=1450;
    const gain=ctx.createGain();
    gain.gain.setValueAtTime(.0001,now);
    for(let t=now;t<end;t+=.58){
      gain.gain.setValueAtTime(.001,Math.max(now,t));
      gain.gain.linearRampToValueAtTime(.29,Math.min(end,t+.05));
      gain.gain.setValueAtTime(.29,Math.min(end,t+.35));
      gain.gain.linearRampToValueAtTime(.001,Math.min(end,t+.51));
      source.frequency.setValueAtTime((Math.round((t-now)/.58)%2)?610:740,t);
    }
    gain.gain.setValueAtTime(.0001,end);
    source.connect(filter);filter.connect(gain);gain.connect(panner);panner.connect(master);
    source.start(now);source.stop(end+.02);
    carAlarmNodes={source,gain};
    source.onended=()=>{
      try{source.disconnect();filter.disconnect();gain.disconnect();panner.disconnect();}catch{}
      if(carAlarmNodes?.source===source)carAlarmNodes=null;
    };
  }
  function cctvRead(){
    tone(760,.12,.08,'square');
    noise(1600,.17,.11);
  }
  function vehicleLatch(){
    noise(1150,.30,.32);
    tone(220,.26,.23,'triangle');
    tone(510,.16,.09,'square');
  }
  function securityKeyClick(){
    // Heavily damped metal-on-metal tumbler inside the wall reader.
    noise(1750,.11,.21,'bandpass');
    tone(390,.09,.17,'square');
    tone(255,.19,.13,'triangle');
  }
  let shutterAudio=null;
  function stopShutterMotor(){
    if(!shutterAudio)return;
    const {sources,gain}=shutterAudio;
    shutterAudio=null;
    if(ctx.state==='closed')return;
    const now=ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(.0001,now,.05);
    for(const source of sources)try{source.stop(now+.22);}catch{}
  }
  function startShutterMotor(position=[0,1.1,-38],duration=5.25){
    stopShutterMotor();
    if(!enabled||ctx.state==='closed')return;
    const t=ctx.currentTime;
    const end=t+Math.max(.3,Math.min(9,duration));
    const panner=ctx.createPanner();
    panner.panningModel='HRTF';panner.distanceModel='inverse';
    panner.refDistance=11;panner.maxDistance=85;panner.rolloffFactor=.46;
    if(panner.positionX){
      panner.positionX.value=position[0];panner.positionY.value=position[1];
      panner.positionZ.value=position[2];
    }else panner.setPosition(position[0],position[1],position[2]);
    const gain=ctx.createGain();
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.linearRampToValueAtTime(.32,Math.min(t+.18,end));
    gain.gain.setValueAtTime(.32,Math.max(t+.2,end-.45));
    gain.gain.linearRampToValueAtTime(.0001,end);
    gain.connect(panner);panner.connect(master);
    const motor=ctx.createOscillator();
    motor.type='sawtooth';motor.frequency.value=70;
    const motorFilter=ctx.createBiquadFilter();
    motorFilter.type='lowpass';motorFilter.frequency.value=205;
    const motorLevel=ctx.createGain();motorLevel.gain.value=.23;
    motor.connect(motorFilter);motorFilter.connect(motorLevel);motorLevel.connect(gain);
    const grinding=ctx.createBufferSource();
    grinding.buffer=noiseBuffer;grinding.loop=true;
    const scrapeFilter=ctx.createBiquadFilter();
    scrapeFilter.type='bandpass';scrapeFilter.frequency.value=470;scrapeFilter.Q.value=.48;
    const scrapeLevel=ctx.createGain();scrapeLevel.gain.value=.20;
    grinding.connect(scrapeFilter);scrapeFilter.connect(scrapeLevel);scrapeLevel.connect(gain);
    motor.start(t);grinding.start(t);
    motor.stop(end+.03);grinding.stop(end+.03);
    const sources=[motor,grinding];
    const nodes=[panner,gain,motor,motorFilter,motorLevel,grinding,scrapeFilter,scrapeLevel];
    let remaining=2;
    for(const source of sources)source.onended=()=>{
      remaining--;
      if(remaining===0){
        for(const node of nodes)try{node.disconnect();}catch{}
        if(shutterAudio?.sources===sources)shutterAudio=null;
      }
    };
    shutterAudio={sources,gain};
  }
  function switchStart(lubricated=false) {
    const scale=lubricated?.40:1;
    noise(1900,.38,.65*scale);
    tone(180,.32,.34*scale,'sawtooth');
  }
  function powerRestore(lubricated=false) {
    const scale=lubricated?.4:1;
    noise(750,.62,.75*scale);
    tone(110,.65,.58*scale);
    tone(440,.26,.24*scale);
  }
  function loopTransition() {
    // Uncanny, descending garage hum and a backwards-feeling ventilation pulse.
    noise(180, .76, .52, 'lowpass');
    tone(370, .84, .37, 'sawtooth');
    tone(67, 1.10, .36);
    noise(1400,.28,.12);
  }
  function horrorCue(type) {
    // Small positional illusion cues, purposely NOT player noise events for the AI.
    if(type==='phantom') {
      noise(500,.44,.18,'lowpass');
      tone(127,.42,.16);
    } else if(type==='false-exit') {
      noise(2500,.16,.24);
      tone(290,.26,.14,'sawtooth');
    } else if(type==='clock') {
      // Very faint player-only backwards-sounding double tick.
      // Does not enter the game's noise-event log or affect either enemy.
      tone(265,.17,.055,'triangle');
      noise(1240,.10,.045);
    }
  }

  function gearClick(type) {
    if(type==='energy'){
      noise(1700,.12,.33);
      tone(500,.18,.19);
    }else if(type!=='glow'){
      noise(1150,.09,.12);
    }
  }
  function devicePulse(type,position=[0,.2,0]){
    if(!enabled || ctx.state==='closed')return;
    const time=ctx.currentTime;
    const panner=ctx.createPanner();
    panner.panningModel='HRTF';
    panner.distanceModel='inverse';
    panner.refDistance=3;
    panner.maxDistance=38;
    panner.rolloffFactor=1;
    if(panner.positionX){
      panner.positionX.value=position[0];
      panner.positionY.value=position[1]||.3;
      panner.positionZ.value=position[2];
    }else panner.setPosition(position[0],position[1]||.3,position[2]);
    const gain=ctx.createGain();
    gain.gain.setValueAtTime(.0001,time);
    gain.gain.exponentialRampToValueAtTime(type==='alarm'?.55:.28,time+.025);
    gain.gain.exponentialRampToValueAtTime(.0001,time+(type==='alarm'?.42:.75));
    let source,filter=null;
    if(type==='radio'){
      source=ctx.createBufferSource();source.buffer=noiseBuffer;
      filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1170;filter.Q.value=.47;
      source.connect(filter);filter.connect(gain);
    }else{
      source=ctx.createOscillator();source.type='sine';source.frequency.setValueAtTime(820,time);
      source.frequency.setValueAtTime(1050,time+.14);source.connect(gain);
    }
    gain.connect(panner);panner.connect(master);
    source.start(time);
    source.stop(time+(type==='alarm'?.45:.77));
    source.onended=()=>{
      try{source.disconnect();if(filter)filter.disconnect();gain.disconnect();panner.disconnect();}catch{}
    };
  }
  function observerAlert(){
    tone(410,.27,.14,'sawtooth');
    noise(1880,.12,.15);
  }

  function death() {
    // Synthetic short gasp/scream, blunt fall, wet scrape and muffled crunch.
    // No recorded person, licensed assets or visual gore textures.
    creatureAudio.update({active:false});
    if(!enabled || ctx.state==='closed')return;
    const start=ctx.currentTime;

    const scream=ctx.createOscillator();
    const throat=ctx.createBiquadFilter();
    const vocal=ctx.createGain();
    scream.type='sawtooth';
    scream.frequency.setValueAtTime(345,start);
    scream.frequency.exponentialRampToValueAtTime(630,start+.21);
    scream.frequency.exponentialRampToValueAtTime(145,start+.8);
    throat.type='bandpass';
    throat.frequency.value=900;
    throat.Q.value=.55;
    vocal.gain.setValueAtTime(.0001,start);
    vocal.gain.exponentialRampToValueAtTime(.19,start+.12);
    vocal.gain.exponentialRampToValueAtTime(.26,start+.29);
    vocal.gain.exponentialRampToValueAtTime(.0001,start+.91);
    scream.connect(throat);
    throat.connect(vocal);
    vocal.connect(master);
    scream.start(start);
    scream.stop(start+.94);
    scream.onended=()=>{scream.disconnect();throat.disconnect();vocal.disconnect();};

    const shriek=ctx.createBufferSource();
    shriek.buffer=noiseBuffer;
    const airy=ctx.createBiquadFilter();
    airy.type='bandpass';
    airy.frequency.value=1580;
    airy.Q.value=.4;
    const breath=ctx.createGain();
    breath.gain.setValueAtTime(.0001,start);
    breath.gain.exponentialRampToValueAtTime(.29,start+.1);
    breath.gain.exponentialRampToValueAtTime(.0001,start+.74);
    shriek.connect(airy);airy.connect(breath);breath.connect(master);
    shriek.start(start,Math.random()*.1);
    shriek.stop(start+.76);
    shriek.onended=()=>{shriek.disconnect();airy.disconnect();breath.disconnect();};

    function impact(delay,low,volume,length){
      const at=start+delay;
      const noiseSource=ctx.createBufferSource();
      noiseSource.buffer=noiseBuffer;
      const filter=ctx.createBiquadFilter();
      filter.type='lowpass';filter.frequency.value=low;
      const gain=ctx.createGain();
      gain.gain.setValueAtTime(.0001,at);
      gain.gain.exponentialRampToValueAtTime(volume,at+.009);
      gain.gain.exponentialRampToValueAtTime(.0001,at+length);
      noiseSource.connect(filter);filter.connect(gain);gain.connect(master);
      noiseSource.start(at,Math.random()*.45);
      noiseSource.stop(at+length+.01);
      noiseSource.onended=()=>{noiseSource.disconnect();filter.disconnect();gain.disconnect();};
    }
    impact(.28,340,.67,.28);
    impact(.83,740,.37,.22);
    impact(1.18,280,.24,.25);
    const thud=ctx.createOscillator();
    const lowGain=ctx.createGain();
    thud.type='triangle';
    thud.frequency.setValueAtTime(100,start+.28);
    thud.frequency.exponentialRampToValueAtTime(43,start+.61);
    lowGain.gain.setValueAtTime(.0001,start+.28);
    lowGain.gain.exponentialRampToValueAtTime(.62,start+.3);
    lowGain.gain.exponentialRampToValueAtTime(.0001,start+.68);
    thud.connect(lowGain);lowGain.connect(master);
    thud.start(start+.28);thud.stop(start+.69);
    thud.onended=()=>{thud.disconnect();lowGain.disconnect();};
  }

  return {
    step, jump, land, metal, splash, throwCan, flicker, flashlightClick, switchStart, powerRestore, startSiren, stopSiren, setSirenVolume, startCarAlarm, stopCarAlarm, cctvRead, vehicleLatch, securityKeyClick, startShutterMotor, stopShutterMotor, itemAction, loopTransition, horrorCue, gearClick, devicePulse, observerAlert, death,
    updateCreature: creatureAudio.update,
    updateObserver: observerAudio.update,
    updateVitals: playerVitalsAudio.update,
    resume() {
      if (ctx.state === 'suspended') return ctx.resume();
      return Promise.resolve();
    },
    setEnabled(value) {
      enabled = Boolean(value);
      if (ctx.state !== 'closed') {
        master.gain.setTargetAtTime(enabled ? .85 : 0, ctx.currentTime, .035);
      }
    },
    dispose() {
      stopSiren();
      stopCarAlarm();
      stopShutterMotor();
      emergencyAudio.dispose();
      creatureAudio.dispose();
      observerAudio.dispose();
      playerVitalsAudio.dispose();
      try { hum.stop(); } catch {}
      if (ctx.state !== 'closed') ctx.close();
    }
  };
}
