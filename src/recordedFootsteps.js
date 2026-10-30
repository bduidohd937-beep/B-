// Kenney CC0 sampled shoe noises: concrete + varied hard-surface takes.
// Encoded Ogg blobs live as .b64 text due to the UTF-8 GitHub upload gateway.
// These real recordings replace the procedural 2-hit noise "puk-puk" loop.
export const FOOTSTEP_ASSET_NAMES=Object.freeze([
 'concrete_a','hard_a','hard_b','hard_c','hard_d'
]);
export const FOOTSTEP_MATERIAL_SETS=Object.freeze({
 concrete:Object.freeze(['concrete_a','hard_a','hard_b']),
 metal:Object.freeze(['hard_c','hard_d']),
 water:Object.freeze(['concrete_a','hard_c'])
});
export function pickRecordedStep(surface='concrete',counter=0){
 const set=FOOTSTEP_MATERIAL_SETS[surface]||FOOTSTEP_MATERIAL_SETS.concrete;
 return set[Math.abs(Math.floor(counter))%set.length];
}
export function recordedFootstepDynamics(mode='walk',surface='concrete',counter=0){
 // Avoid over-loud bass footsteps; dry contact and natural dynamics.
 const pace=mode==='sprint'?'sprint':mode==='crouch'?'crouch':'walk';
 const base=pace==='sprint'?.53:pace==='crouch'?.115:.35;
 const texture=surface==='metal'?.86:surface==='water'?.95:1;
 return {
  gain:base*texture,
  playbackRate:(pace==='sprint'?1.07:pace==='crouch'?.91:.98)
    *(1+[0,.035,-.02,.015,-.03][Math.abs(counter)%5]),
  highpass:surface==='metal'?410:surface==='concrete'?190:120,
  file:pickRecordedStep(surface,counter)
 };
}
export async function loadRecordedFootsteps(ctx,fetcher=fetch){
 const root=import.meta.env?.BASE_URL||'/B-/';
 const result=new Map();
 await Promise.all(FOOTSTEP_ASSET_NAMES.map(async name=>{
   try{
     const response=await fetcher(root+'audio/footsteps/'+name+'.b64');
     if(!response.ok)throw new Error('HTTP '+response.status);
     const encoded=(await response.text()).replace(/\s+/g,'');
     const bytes=atob(encoded);
     if(!bytes.startsWith('OggS'))throw new Error('Not an Ogg file');
     const data=new Uint8Array(bytes.length);
     for(let i=0;i<bytes.length;i++)data[i]=bytes.charCodeAt(i);
     const decoded=await ctx.decodeAudioData(data.buffer);
     if(decoded.duration>0)result.set(name,decoded);
   }catch(err){
     // A bad sample shouldn't destroy gameplay, audio routing or pointer lock.
     console.warn('Footstep audio unavailable:',name,err);
   }
 }));
 return result;
}
