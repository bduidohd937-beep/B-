// B∞ first escape puzzle — shared gameplay geometry and testable rules.
export const POWER_PANEL = Object.freeze([-16, -25]);
export const ECHO_PANEL = Object.freeze([16, -25]);
export const SECOND_FLOOR = 2;
export const SECOND_FLOOR_START = Object.freeze([0, 1.7, 17]);
export const GATE_Z = -38;
export const GATE_HALF_OPENING = 3.1;
export const POWER_HOLD_SECONDS = 2.2;

export function distance2D(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

export function panelPosition(floor = 1) {
  return floor === SECOND_FLOOR ? ECHO_PANEL : POWER_PANEL;
}

export function canUsePanel(x, z, floor = 1) {
  const position = panelPosition(floor);
  return distance2D(x, z, position[0], position[1]) <= 2.25;
}

export function gateIsPowered(floor, firstPowered, secondPowered) {
  return floor === SECOND_FLOOR ? Boolean(secondPowered) : Boolean(firstPowered);
}

export function canEnterNextArea(x, z, floor, gatePowered) {
  return Boolean(gatePowered) && (floor === 1 || floor === SECOND_FLOOR)
    && z < -43 && Math.abs(x) < 3;
}

export function isNearGate(x, z) {
  return Math.abs(x) <= 5.1 && Math.abs(z - GATE_Z) <= 5.5;
}

export function gateBlocksPlayer(x, z, powered) {
  if (Math.abs(z - GATE_Z) >= .85) return false;
  // Side walls always block. Only the central security shutter can rise.
  return Math.abs(x) >= GATE_HALF_OPENING || !powered;
}

export function objectiveText(powered, floor = 1) {
  if (floor === SECOND_FLOOR) {
    return powered
      ? '방송 복구 완료. 그러나 같은 B2가 반복된다. 열린 셔터 뒤를 확인하라.'
      : 'B2층으로 돌아왔다. 오른쪽 벽의 비상방송 재설정 장치를 찾아라.';
  }
  return powered
    ? '전력 복구. 중앙 비상문이 열렸다. 통로 끝으로 이동하라.'
    : '비상문 전력 차단. 좌측 벽의 적색 비상 배전반을 찾아 전원을 복구하라.';
}
