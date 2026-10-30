// In-world security clock, not the user's actual local time.
// The first B2 shows an ordinary static timestamp; the second B2 occasionally
// runs two seconds backwards before snapping into the impossible timeline.
export const CLOCK_EPOCH=3*3600+17*60+17;
export const CLOCK_CYCLE_SECONDS=19;
export const CLOCK_REVERSE_START=11;
export const CLOCK_REVERSE_END=12;

export function formatB2Time(totalSeconds){
  const seconds=Math.max(0,Math.floor(totalSeconds));
  const hh=String(Math.floor(seconds/3600)%24).padStart(2,'0');
  const mm=String(Math.floor(seconds/60)%60).padStart(2,'0');
  const ss=String(seconds%60).padStart(2,'0');
  return `${hh}:${mm}:${ss}`;
}
export function clockSnapshot(elapsedSeconds=0,floor=1){
  if(floor!==2){
    return {text:'03:17',anomaly:false,cycle:-1};
  }
  const time=Math.max(0,Math.floor(Number.isFinite(elapsedSeconds)?elapsedSeconds:0));
  const cycle=Math.floor(time/CLOCK_CYCLE_SECONDS);
  const phase=time%CLOCK_CYCLE_SECONDS;
  const anomaly=phase>=CLOCK_REVERSE_START&&phase<=CLOCK_REVERSE_END;
  // 10s -> :27, 11s -> :26, 12s -> :25; resumes at 13s -> :30.
  const displayed=time-(anomaly?2*(phase-10):0);
  return {text:formatB2Time(CLOCK_EPOCH+displayed),anomaly,cycle};
}
