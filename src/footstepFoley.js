// B∞ V0.12.7: dry shoe foley rather than repeated bass sine "THUD"s.
// A two-part transient plays heel contact followed by sole drag/toe release.
// Material is exclusive: metal/water never stack on top of a concrete thump.
export const SHOE_SURFACES=Object.freeze(['concrete','metal','water']);
const PROFILES=Object.freeze({
 concrete:Object.freeze({heelHz:610,dragHz:1550,heelType:'bandpass',dragType:'highpass',dragDelay:.048}),
 metal:Object.freeze({heelHz:1360,dragHz:2580,heelType:'bandpass',dragType:'bandpass',dragDelay:.026}),
 water:Object.freeze({heelHz:880,dragHz:2180,heelType:'lowpass',dragType:'bandpass',dragDelay:.075})
});
export function shoeFootstep(mode='walk',surface='concrete',foot=0){
 const kind=mode==='sprint'?'sprint':mode==='crouch'?'crouch':'walk';
 const material=SHOE_SURFACES.includes(surface)?surface:'concrete';
 const profile=PROFILES[material];
 const left=foot%2===0;
 const pace=kind==='sprint'?1.12:kind==='crouch'?.48:1;
 const amp=kind==='sprint'?.52:kind==='crouch'?.075:.28;
 return {
  surface:material,mode:kind,
  heelHz:profile.heelHz*(left?.94:1.07),
  dragHz:profile.dragHz*(left?1.04:.96),
  heelType:profile.heelType,dragType:profile.dragType,
  heelDuration:kind==='sprint'?.055:kind==='crouch'?.072:.067,
  dragDelay:profile.dragDelay/pace,
  dragDuration:kind==='sprint'?.093:kind==='crouch'?.105:.095,
  heelVolume:amp,dragVolume:amp*(material==='metal'?.39:.48)
 };
}
