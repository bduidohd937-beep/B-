// Reusable UI thresholds and selected equipment hints.
// High urgency should be clear without rapid red flashes or flashing game view.
export function noiseSeverity(value){
  const n=Math.max(0,Math.min(100,Number(value)||0));
  return n>=70?'danger':n>=35?'warning':'quiet';
}
export function staminaSeverity(value){
  const n=Math.max(0,Math.min(100,Number(value)||0));
  return n<=25?'low':n<=45?'tired':'stable';
}
export function inventoryControls(type){
  return {
    use:Boolean(type),
    drop:Boolean(type)&&type!=='can'
  };
}
export function observerCue(mode='scan',distance=Infinity){
  if(mode==='chase')return '움직임 포착! 멈추고 시야를 끊어라';
  if(mode==='alert')return '관조자가 움직임을 확인하고 있다';
  if(mode==='search')return distance<=22?'마지막 움직임을 수색 중':'시야가 끊어졌다';
  if(mode==='return')return '수색 종료 · 순찰 복귀';
  return '움직일 때 시야를 조심하라';
}
