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

// Real front-facing breaker interaction. The physical switches face +Z
// (see EscapePuzzle meshes at z+.57). Distance ALONE is not enough:
// behind the panel, looking sideways or looking away must never show E.
export const PANEL_FRONT_OFFSET=.6;
export const PANEL_FACING_DOT=.73;
// Once the player STARTS an E hold while facing the switch, only physical
// distance and front-side access matter. Looking behind is permitted.
// Moving through/behind the cabinet or releasing E still interrupts it.
export function canHoldPanel(x,z,floor=1){
  const [px,pz]=panelPosition(floor);
  return Number.isFinite(x)&&Number.isFinite(z)&&canUsePanel(x,z,floor)
    &&z>=pz+.64&&Math.abs(x-px)<=1.65;
}
export function canOperatePanel(eye,looking,floor=1){
  if(!eye||!looking||eye.length<3||looking.length<3)return false;
  const [x,y,z]=eye;
  const [px,pz]=panelPosition(floor);
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z))return false;
  if(!canHoldPanel(x,z,floor))return false;
  const tx=px,ty=1.1,tz=pz+PANEL_FRONT_OFFSET;
  const dx=tx-x,dy=ty-y,dz=tz-z;
  const len=Math.hypot(dx,dy,dz);
  const lookLen=Math.hypot(looking[0],looking[1],looking[2]);
  if(len<.01||lookLen<.01||!Number.isFinite(lookLen))return false;
  const dot=(dx*looking[0]+dy*looking[1]+dz*looking[2])/(len*lookLen);
  return dot>=PANEL_FACING_DOT;
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

export function objectiveText(powered,floor=1){
  if(floor===SECOND_FLOOR)return powered
    ?'출입 통제 해제.' : '보안 기록이 손상되었다.';
  return powered?'전력 신호 복구.' : '비상 전력 차단.';
}
