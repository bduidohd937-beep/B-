// B∞ death/retry invariants.
// The security barrier is a STAGE puzzle, not a permanent door unlocked by
// a previous failed life. A death inside first B2 re-arms its breaker.
export function shouldRelockBreakerOnRespawn(floor){
 return floor===1;
}
export function gatePowerAfterRespawn(floor,wasPowered){
 return shouldRelockBreakerOnRespawn(floor)?false:Boolean(wasPowered);
}
