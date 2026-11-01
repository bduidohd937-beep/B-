export const INITIAL_LAMP_ON = true;
export const ROOM_BOUNDS = Object.freeze({ minX: -2.76, maxX: 2.72, minZ: -2.62, maxZ: 2.68 });
export const HALL_BOUNDS = Object.freeze({ minX: 2.73, maxX: 14.15, minZ: .48, maxZ: 2.64 });
export const DOOR_HINGE = Object.freeze({ x: 3.18, z: .32 });
export const DOOR_WIDTH = 1.42;
export const DOOR_OPEN_ANGLE = -1.42;
export const PLAYER_RADIUS = .32;

export function doorLeafDistance(position, angle) {
  const a = DOOR_HINGE, dx = Math.sin(angle) * DOOR_WIDTH, dz = Math.cos(angle) * DOOR_WIDTH;
  const den = dx * dx + dz * dz;
  const along = Math.max(0, Math.min(1, ((position.x-a.x)*dx + (position.z-a.z)*dz)/den));
  return Math.hypot(position.x-(a.x+dx*along), position.z-(a.z+dz*along));
}

export function doorCloseObstructed(position, angle) {
  if (!position) return false;
  // Conservative swept region at the threshold. The door never pushes the player
  // through solid geometry when its closer tries to shut.
  if(position.x>2.55 && position.x<3.65 && position.z>.45 && position.z<1.9) return true;
  return doorLeafDistance(position, angle) < PLAYER_RADIUS + .15;
}

export function passageAllowed(position, angle = 0) {
  const { x, z } = position;
  const inRoom = x >= ROOM_BOUNDS.minX && x <= ROOM_BOUNDS.maxX && z >= ROOM_BOUNDS.minZ && z <= ROOM_BOUNDS.maxZ;
  const inHall = x >= HALL_BOUNDS.minX && x <= HALL_BOUNDS.maxX && z >= HALL_BOUNDS.minZ && z <= HALL_BOUNDS.maxZ;
  if (!(inRoom || inHall)) return false;
  // Solid desk: camera interaction is from the player's side, not through the worktop.
  if (inRoom && x >= -2.77 && x <= 1.35 && z <= -1.06) return false;
  const opening = typeof angle === 'boolean' ? (angle ? DOOR_OPEN_ANGLE : 0) : angle;
  // Doorway frame / the structural wall have their own solid threshold.
  if (x >= 2.55 && x <= 3.65) {
    if (z < .64 || z > 1.58) return false;
    if (Math.abs(opening) < .72) return false;
    if (doorLeafDistance(position, opening) < PLAYER_RADIUS + .075) return false;
  }
  return true;
}

export function isLiveFeedUpdated(feedId, lampOn, initialLampOn = INITIAL_LAMP_ON) {
  return feedId === 'cam1' ? lampOn : initialLampOn;
}

export function canRecordVideoMismatch(lampTested, selectedFeed = 'cam2') {
  return Boolean(lampTested) && selectedFeed === 'cam2';
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
