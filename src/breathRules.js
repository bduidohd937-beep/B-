// Non-positional 1st-person body sounds. Breath is a two-phase nasal
// inhalation/exhalation, not the prior constant 760Hz white-noise "broom".
export function humanBreathProfile(level=0){
 const l=Math.max(0,Math.min(24,Number.isFinite(level)?level:0));
 if(l<=0)return {gain:0,interval:Infinity,inhale:.0,exhale:0};
 const severe=l>=17,heavy=l>=10;
 return {
  gain:Math.min(.105,.025+l*.0031),
  interval:severe?1.10:heavy?1.42:1.86,
  inhale:severe?.33:.39,
  exhale:severe?.52:.66,
  pitch:severe?345:heavy?315:270
 };
}
