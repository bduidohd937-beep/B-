// Synthetic, deterministic parking-lot plates: different for EVERY ordinary
// car, while the three special investigation cars retain their exact numbers.
export function plateForCar(index){
 const n=Math.max(0,Math.floor(Number.isFinite(index)?index:0));
 return 'B2-'+String(1200+(n*73)%8500).padStart(4,'0');
}
export function uniquePlateCount(count){
 return new Set(Array.from({length:count},(_,i)=>plateForCar(i))).size;
}
