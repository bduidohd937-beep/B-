// Small portable flashlight — finite battery, no free recharge from OFF.
// Gameplay is frame-rate independent. Seconds drain only during ACTIVE play.
export const FLASHLIGHT_RUNTIME_SECONDS = 420;
export const FLASHLIGHT_DRAIN_PER_SECOND = 100/FLASHLIGHT_RUNTIME_SECONDS;
export const BATTERY_PACK_RESTORE = 45;
export const LOW_BATTERY_THRESHOLD = 18;
export const FLASHLIGHT_CLICK_NOISE = 12;
export function clampCharge(value){
 return Math.min(100,Math.max(0,Number.isFinite(value)?value:0));
}
export function freshFlashlight(){
 return {charge:100,enabled:true};
}
export function tickFlashlight(charge,{active=false,enabled=false,dt=0}={}){
 const current=clampCharge(charge);
 const delta=Math.min(.1,Math.max(0,Number.isFinite(dt)?dt:0));
 const next=active&&enabled?clampCharge(current-FLASHLIGHT_DRAIN_PER_SECOND*delta):current;
 return {charge:next,lit:enabled&&next>0,low:next>0&&next<=LOW_BATTERY_THRESHOLD,empty:next<=0};
}
export function rechargeFlashlight(charge,amount=BATTERY_PACK_RESTORE){
 return clampCharge(clampCharge(charge)+Math.max(0,Number.isFinite(amount)?amount:0));
}
export function lowBatteryBrightness(charge,time=0,reducedEffects=false){
 if(charge<=0)return 0;
 if(charge>LOW_BATTERY_THRESHOLD||reducedEffects)return 1;
 // Slow irregular-looking warm pulses; no full blackout or fast strobes.
 const wobble=.85+.12*Math.sin(Math.max(0,time)*4.5)
    +.03*Math.sin(Math.max(0,time)*1.31);
 return Math.max(.68,Math.min(1,wobble));
}
