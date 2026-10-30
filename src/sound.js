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

  return {
    step, jump, land, metal, splash, throwCan, flicker,
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
