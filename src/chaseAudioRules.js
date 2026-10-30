// Metal-on-concrete contact is heard ONLY when the rushing Listener passes
// close to a real parked car and the player is near enough to hear it.
// Never hallucinate a target or magically track the player's position.
export const SCRAPE_MIN_SPEED=5.3;
export const SCRAPE_AUDIBLE_RADIUS=30;
export const SCRAPE_COOLDOWN_SECONDS=1.9;
export function passesParkedCar(x,z,cars,halfX=3.15,halfZ=4.05){
 if(!Array.isArray(cars))return false;
 return cars.some(([cx,cz])=>Math.abs(x-cx)<halfX&&Math.abs(z-cz)<halfZ);
}
export function shouldPlayRushScrape({
 state='idle',speed=0,nearCar=false,distanceToPlayer=Infinity,
 now=0,nextAllowedAt=0
}={}){
 return state==='investigate'&&speed>=SCRAPE_MIN_SPEED&&nearCar&&
   distanceToPlayer<=SCRAPE_AUDIBLE_RADIUS&&now>=nextAllowedAt;
}
