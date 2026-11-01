export const INITIAL_LAMP_ON = true;
export const ROOM_BOUNDS = Object.freeze({ minX: -2.76, maxX: 2.72, minZ: -2.62, maxZ: 2.68 });
export const HALL_BOUNDS = Object.freeze({ minX: 2.73, maxX: 14.15, minZ: .48, maxZ: 2.64 });

export function passageAllowed(position, doorOpen) {
  const { x, z } = position;
  const inRoom = x >= ROOM_BOUNDS.minX && x <= ROOM_BOUNDS.maxX && z >= ROOM_BOUNDS.minZ && z <= ROOM_BOUNDS.maxZ;
  const inHall = x >= HALL_BOUNDS.minX && x <= HALL_BOUNDS.maxX && z >= HALL_BOUNDS.minZ && z <= HALL_BOUNDS.maxZ;
  if (!(inRoom || inHall)) return false;
  // Solid desk: players can inspect the screens from its front, not walk through it.
  if (inRoom && x >= -2.77 && x <= 1.35 && z <= -1.06) return false;
  if (!doorOpen && x >= 2.53 && x <= 3.15 && z >= .48 && z <= 1.92) return false;
  if (inHall && x < 3.2 && (z < .48 || z > 1.92)) return false;
  return true;
}

export function isLiveFeedUpdated(feedId, lampOn, initialLampOn = INITIAL_LAMP_ON) {
  return feedId === 'cam1' ? lampOn : initialLampOn;
}

export function canRecordVideoMismatch(lampTested) {
  return Boolean(lampTested);
}

export function focusTarget({ x, z, fx, fz, targets, maxRange = 2.1 }) {
  let best = null, bestScore = -Infinity;
  for (const t of targets) {
    const dx = t.x - x, dz = t.z - z, d = Math.hypot(dx, dz);
    if (d > maxRange || d < .05) continue;
    const facing = (fx * dx + fz * dz) / d;
    if (facing < .2) continue;
    const score = facing * 1.2 - d / maxRange;
    if (score > bestScore) { bestScore = score; best = t.id; }
  }
  return best;
}
