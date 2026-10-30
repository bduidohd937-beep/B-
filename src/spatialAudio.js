// Original synthesized 3D creature audio; no external samples or music.
// PannerNode gives direction and distance. A low-pass filter simulates columns/cars.
export function createSpatialCreatureAudio(ctx, master, sharedNoise) {
  const panner = ctx.createPanner();
  panner.panningModel = 'HRTF';
  panner.distanceModel = 'inverse';
  panner.refDistance = 2.2;
  panner.maxDistance = 44;
  panner.rolloffFactor = 1.25;
  panner.coneInnerAngle = 360;
  panner.coneOuterAngle = 360;

  const occlusion = ctx.createBiquadFilter();
  occlusion.type = 'lowpass';
  occlusion.frequency.value = 2300;

  const creatureGain = ctx.createGain();
  creatureGain.gain.value = 0;
  occlusion.connect(panner);
  panner.connect(creatureGain);
  creatureGain.connect(master);

  // Soft harsh breathing with a slightly irregular rhythm as alertness rises.
  const breathSource = ctx.createBufferSource();
  breathSource.buffer = sharedNoise;
  breathSource.loop = true;
  const breathFilter = ctx.createBiquadFilter();
  breathFilter.type = 'bandpass';
  breathFilter.frequency.value = 540;
  breathFilter.Q.value = 0.45;
  const breathGain = ctx.createGain();
  breathGain.gain.value = 0.085;
  const breathingLfo = ctx.createOscillator();
  breathingLfo.type = 'sine';
  breathingLfo.frequency.value = 0.72;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.055;
  breathingLfo.connect(lfoDepth);
  lfoDepth.connect(breathGain.gain);
  breathSource.connect(breathFilter);
  breathFilter.connect(breathGain);
  breathGain.connect(occlusion);

  // Low, resonant vocal texture gives the creature weight without jump scares.
  const voiceSource = ctx.createOscillator();
  voiceSource.type = 'triangle';
  voiceSource.frequency.value = 62;
  const voiceGain = ctx.createGain();
  voiceGain.gain.value = 0.024;
  voiceSource.connect(voiceGain);
  voiceGain.connect(occlusion);

  breathSource.start();
  breathingLfo.start();
  voiceSource.start();

  const al = ctx.listener;
  const hasModernListener = Boolean(al.positionX && al.forwardX && al.upX);

  function positionListener(position, forward, t) {
    if (hasModernListener) {
      al.positionX.setTargetAtTime(position[0], t, 0.025);
      al.positionY.setTargetAtTime(position[1], t, 0.025);
      al.positionZ.setTargetAtTime(position[2], t, 0.025);
      al.forwardX.setTargetAtTime(forward[0], t, 0.025);
      al.forwardY.setTargetAtTime(forward[1], t, 0.025);
      al.forwardZ.setTargetAtTime(forward[2], t, 0.025);
      al.upX.setTargetAtTime(0, t, 0.025);
      al.upY.setTargetAtTime(1, t, 0.025);
      al.upZ.setTargetAtTime(0, t, 0.025);
    } else {
      al.setPosition(position[0], position[1], position[2]);
      al.setOrientation(forward[0], forward[1], forward[2], 0, 1, 0);
    }
  }

  function positionCreature(position, t) {
    if (panner.positionX) {
      panner.positionX.setTargetAtTime(position[0], t, 0.04);
      panner.positionY.setTargetAtTime(position[1], t, 0.04);
      panner.positionZ.setTargetAtTime(position[2], t, 0.04);
    } else {
      panner.setPosition(position[0], position[1], position[2]);
    }
  }

  let nextStep = 0;
  let disposed = false;

  function footfall(t, speed) {
    if (disposed) return;
    const source = ctx.createBufferSource();
    source.buffer = sharedNoise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1050 + speed * 80;
    const gain = ctx.createGain();
    const duration = 0.16;
    const loudness = Math.min(0.85, 0.34 + speed * 0.065);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(loudness, t + 0.007);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(occlusion); // Same occlusion and spatial panning as breathing.
    source.start(t, Math.random() * 0.7);
    source.stop(t + duration + 0.012);
    source.onended = () => {
      try { source.disconnect(); filter.disconnect(); gain.disconnect(); } catch {}
    };
  }

  function update(data) {
    if (disposed || ctx.state === 'closed') return;
    const t = ctx.currentTime;
    if (!data?.active) {
      creatureGain.gain.setTargetAtTime(0, t, 0.06);
      nextStep = t + 0.25;
      return;
    }
    const { listenerPosition, forward, creaturePosition, occluded, speed = 0, state = 'idle', excitement = 0 } = data;
    if (!listenerPosition || !forward || !creaturePosition) return;
    positionListener(listenerPosition, forward, t);
    positionCreature(creaturePosition, t);
    const dx = listenerPosition[0] - creaturePosition[0];
    const dz = listenerPosition[2] - creaturePosition[2];
    const distance = Math.hypot(dx, dz);
    const audible = distance < 41;
    creatureGain.gain.setTargetAtTime(audible ? 1 : 0, t, 0.09);
    occlusion.frequency.setTargetAtTime(occluded ? 560 : 2900, t, 0.12);
    breathingLfo.frequency.setTargetAtTime(0.65 + excitement * 0.006, t, 0.15);
    breathGain.gain.setTargetAtTime(
      state === 'investigate' ? 0.10 + excitement * 0.00042 : 0.065, t, 0.2
    );
    voiceSource.frequency.setTargetAtTime(59 + excitement * 0.13, t, 0.2);

    const walking = speed > 0.62 && (state === 'investigate' || state === 'return');
    if (!walking) {
      nextStep = t + 0.14;
    } else if (audible && t >= nextStep) {
      footfall(t, speed);
      nextStep = t + Math.max(0.23, 0.82 - Math.min(speed, 6) * 0.093);
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const source of [breathSource, breathingLfo, voiceSource]) {
      try { source.stop(); } catch {}
      try { source.disconnect(); } catch {}
    }
    for (const node of [lfoDepth, breathFilter, breathGain, voiceGain, occlusion, panner, creatureGain]) {
      try { node.disconnect(); } catch {}
    }
  }
  return { update, dispose };
}
