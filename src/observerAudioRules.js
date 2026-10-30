// B∞ Observer (motion-only entity): audio feedback for PLAYER, not AI noise.
// The Listener should never investigate a UI/monster sound effect.
export const OBSERVER_AUDIO_RANGE=49;
export const OBSERVER_AUDIO_MAX_GAIN=.23;
export const OBSERVER_STEP_INTERVAL=.52;

export function observerSoundCue(previous,next,active=true){
 if(!active)return null;
 if(next==='alert'&&previous!=='alert'&&previous!=='chase')return 'detected';
 if(next==='chase'&&previous!=='chase')return 'lock';
 if(next==='search'&&previous==='chase')return 'lost';
 return null;
}
export function observerSoundProfile(mode,distance,suspicion=0){
 const d=Number.isFinite(distance)?Math.max(0,distance):Infinity;
 const close=Math.max(0,Math.min(1,(OBSERVER_AUDIO_RANGE-d)/OBSERVER_AUDIO_RANGE));
 const intensity=Math.max(0,Math.min(1,Number.isFinite(suspicion)?suspicion:0));
 const chasing=mode==='chase';
 const target=chasing?(.065+.17*close):
   mode==='alert'?.018+.048*close*intensity:
   mode==='search'?.025*close:0;
 return {
   gain:Math.min(OBSERVER_AUDIO_MAX_GAIN,Math.max(0,target)),
   steps:chasing&&d<OBSERVER_AUDIO_RANGE,
   // Low motor resonance, not mosquito-like 1kHz+ buzzing.
   lowpass:chasing?290+400*close:190+230*close,
   stepInterval:OBSERVER_STEP_INTERVAL
 };
}
