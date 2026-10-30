// B∞ first escape puzzle — shared gameplay geometry and testable rules.
export const POWER_PANEL = Object.freeze([-16, -25]);
export const GATE_Z = -38;
export const GATE_HALF_OPENING = 3.1;
export const POWER_HOLD_SECONDS = 2.2;

export function distance2D(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

export function canUsePanel(x, z) {
  return distance2D(x, z, POWER_PANEL[0], POWER_PANEL[1]) <= 2.25;
}

export function isNearGate(x, z) {
  return Math.abs(x) <= 5.1 && Math.abs(z - GATE_Z) <= 5.5;
}

export function gateBlocksPlayer(x, z, powered) {
  if (Math.abs(z - GATE_Z) >= .85) return false;
  // Side walls always block. Only the central security shutter can rise.
  return Math.abs(x) >= GATE_HALF_OPENING || !powered;
}

export function objectiveText(powered) {
  return powered
    ? '전력 복구. 중앙 비상문이 열렸다. 통로 끝으로 이동하라.'
    : '비상문 전력 차단. 좌측 벽의 적색 비상 배전반을 찾아 전원을 복구하라.';
}
