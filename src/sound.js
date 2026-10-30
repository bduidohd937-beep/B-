import { createSpatialCreatureAudio } from './spatialAudio.js';

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
  function switchStart() {
    noise(1900, .38, .65);
    tone(180, .32, .34, 'sawtooth');
  }
  function powerRestore() {
    noise(750, .62, .75);
    tone(110, .65, .58);
    tone(440, .26, .24);
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
    }
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
    step, jump, land, metal, splash, throwCan, flicker, switchStart, powerRestore, loopTransition, horrorCue, death,
    updateCreature: creatureAudio.update,
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
      creatureAudio.dispose();
      try { hum.stop(); } catch {}
      if (ctx.state !== 'closed') ctx.close();
    }
  };
}
