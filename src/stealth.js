// Deterministic footstep cadence: movement distance persists across short key taps.
// Silent frame-by-frame W tapping can no longer reset an artificial time-only clock.
export const STRIDE_METERS = Object.freeze({
  walk: 1.5,
  sprint: 1.85,
  crouch: 1.35
});
export const MIN_STEP_SECONDS = 0.15;

export function footstepLoudness(mode, surface = 'concrete') {
  const base = mode === 'sprint' ? 90 : mode === 'crouch' ? 8 : 35;
  const multiplier = surface === 'metal' ? 1.5 : surface === 'water' ? 1.2 : 1;
  return Math.min(100, Math.round(base * multiplier));
}

export function tickFootsteps(previous, { distance = 0, grounded = true, mode = 'walk', dt = 0 }) {
  const old = previous || { meters: 0, elapsed: 1, moving: false };
  const elapsed = Math.max(0, Math.min(10, old.elapsed + Math.max(0, dt)));
  const actualDistance = grounded ? Math.max(0, distance) : 0;
  const moving = actualDistance > 0.0001;
  const stride = STRIDE_METERS[mode] ?? STRIDE_METERS.walk;
  let meters = Math.max(0, old.meters) + actualDistance;
  let nextElapsed = elapsed;
  let steps = 0;
  // Contact on the first movement after stopping is audible, but limited to
  // one transient per 150 ms. Remaining distance is never discarded on release.
  if (moving && !old.moving && elapsed >= MIN_STEP_SECONDS) {
    steps = 1;
    meters = 0;
    nextElapsed = 0;
  } else if (moving && meters >= stride && elapsed >= MIN_STEP_SECONDS) {
    steps = 1;
    meters -= stride;
    nextElapsed = 0;
  }
  return { state: { meters, elapsed: nextElapsed, moving }, steps };
}

export function crouchHearingRadius(excitement = 0, loudness = 8) {
  // Nearby crouching should create suspicion without giving the creature sight.
  return Math.max(2.7, Math.min(4.1, 2.7 + excitement * 0.012 + Math.max(0, loudness - 8) * 0.018));
}

export function crouchReaction(distance, excitement = 0, loudness = 8) {
  if (distance > crouchHearingRadius(excitement, loudness)) return 'none';
  return distance <= 1.65 ? 'investigate' : 'listen';
}
