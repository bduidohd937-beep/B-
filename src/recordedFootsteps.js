// Kenney CC0 sampled shoe noises: concrete + varied hard-surface takes.
// Encoded Ogg blobs live as .b64 text due to the UTF-8 GitHub upload gateway.
// These real recordings replace the procedural 2-hit noise "puk-puk" loop.
export const FOOTSTEP_ASSET_NAMES=Object.freeze([
 'concrete_a','hard_a','hard_b','hard_c','hard_d'
]);
export const FOOTSTEP_MATERIAL_SETS=Object.freeze({
 // A consistent shoe/ground texture; alternating unrelated RPG foley
 // files had mismatched attack timing and sounded like different shoes.
 concrete:Object.freeze(['concrete_a']),
 metal:Object.freeze(['hard_c','hard_d']),
 water:Object.freeze(['concrete_a','hard_c'])
});
// A sample might contain a long quiet lead-in OR two footfall transients.
// Trim the decoded PCM to its FIRST actual contact (relative RMS onset),
// then retain a single short shoe contact so the sound matches the camera
// step, instead of being heard as delayed "doom-THANG" double impacts.
export const FOOTSTEP_MAX_SECONDS=.235;
export function findFootstepOnset(samples,sampleRate){
 if(!samples?.length||!Number.isFinite(sampleRate)||sampleRate<=0)return 0;
 const len=Math.min(samples.length,Math.floor(sampleRate*.45));
 const win=Math.max(24,Math.floor(sampleRate*.005));
 let max=0, energies=[];
 for(let i=0;i<len;i+=win){
   let square=0;
   const end=Math.min(len,i+win);
   for(let j=i;j<end;j++)square+=samples[j]*samples[j];
   const rms=Math.sqrt(square/Math.max(1,end-i));
   energies.push(rms);max=Math.max(max,rms);
 }
 if(max<.00004)return 0;
 const threshold=Math.max(.00065,max*.20);
 for(let i=0;i<energies.length;i++)if(energies[i]>=threshold)
   return Math.max(0,i*win-Math.round(sampleRate*.006));
 return 0;
}
export function trimFootstepBuffer(ctx,buffer){
 if(!buffer||!buffer.length||!ctx?.createBuffer)return buffer;
 const rate=buffer.sampleRate;
 const onset=findFootstepOnset(buffer.getChannelData(0),rate);
 const frames=Math.min(buffer.length-onset,Math.ceil(rate*FOOTSTEP_MAX_SECONDS));
 if(frames<=0)return buffer;
 const copy=ctx.createBuffer(buffer.numberOfChannels,frames,rate);
 for(let channel=0;channel<buffer.numberOfChannels;channel++){
   const source=buffer.getChannelData(channel);
   copy.copyToChannel(source.subarray(onset,onset+frames),channel);
 }
 return copy;
}

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
     if(decoded.duration>0)result.set(name,trimFootstepBuffer(ctx,decoded));
   }catch(err){
     // A bad sample shouldn't destroy gameplay, audio routing or pointer lock.
     console.warn('Footstep audio unavailable:',name,err);
   }
 }));
 return result;
}
