// Estimates real displayed frame intervals, not a synthetic GPU benchmark.
// Mutable fixed-size memory: no per-frame React allocations or growing arrays.
export const FRAME_WINDOW_SECONDS=1.0;
export const HITCH_MS=33.34;
const SAMPLE_COUNT=180;
export function freshFrameWindow(){
 return {seconds:0,frames:0,worstMs:0,hitches:0,
  samples:new Float32Array(SAMPLE_COUNT)};
}
export function observeFrame(w,delta){
 // A resumed background browser tab should not poison the live play sample.
 if(!w||!Number.isFinite(delta)||delta<=0||delta>2)return false;
 const ms=delta*1000;
 w.samples[w.frames%SAMPLE_COUNT]=ms;
 w.frames++;
 w.seconds+=delta;
 w.worstMs=Math.max(w.worstMs,ms);
 if(ms>HITCH_MS)w.hitches++;
 return w.seconds>=FRAME_WINDOW_SECONDS;
}
export function frameSummary(w){
 if(!w||!w.frames||!w.seconds)return {fps:0,p95Ms:0,worstMs:0,hitches:0};
 const count=Math.min(SAMPLE_COUNT,w.frames);
 const sorted=Array.from(w.samples.slice(0,count)).sort((a,b)=>a-b);
 const p95=sorted[Math.max(0,Math.ceil(.95*count)-1)];
 return {
  fps:Math.round(w.frames/w.seconds),
  p95Ms:Math.round(p95*10)/10,
  worstMs:Math.round(w.worstMs*10)/10,
  hitches:w.hitches
 };
}
