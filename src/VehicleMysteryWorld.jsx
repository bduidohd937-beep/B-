import React, {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Text} from '@react-three/drei';
import {CCTV_STATION,VEHICLES} from './vehiclePuzzle.js';

// The clue belongs to a physical security desk. No item beacons, floating
// quest arrows or x-ray interaction icons.
const SecurityDesk=React.memo(function SecurityDesk({reviewed=false}){
 const [x,y,z]=CCTV_STATION;
 return <group position={[x,0,z]}>
   {/* Security desk is in the open garage; old parking-garage security posts
       often use bolted-down metal cabinets and surface-mounted CRT screens. */}
   <mesh position={[0,.65,0]}>
     <boxGeometry args={[1.64,1.23,.78]}/>
     <meshStandardMaterial color="#3b494a" metalness={.48} roughness={.7}/>
   </mesh>
   <mesh position={[0,1.3,.03]}>
     <boxGeometry args={[1.83,.09,1]}/>
     <meshStandardMaterial color="#747b74" metalness={.6} roughness={.62}/>
   </mesh>
   <group position={[0,1.73,-.22]}>
     <mesh><boxGeometry args={[1.36,.85,.36]}/>
       <meshStandardMaterial color="#222c30" roughness={.8}/></mesh>
     <mesh position={[0,.035,.19]}>
       <planeGeometry args={[1.18,.65]}/>
       <meshBasicMaterial color={reviewed?"#243a35":"#1d2e30"}/>
     </mesh>
     <Text position={[0,.25,.205]} fontSize={.10} color="#97c1ad">SECURITY / B2</Text>
     <Text position={[0,.055,.206]} fontSize={.12} color="#9aafa5">
       {reviewed?"LOG C-17 / 03:17":"CAM-C / LOG"}
     </Text>
     <Text position={[0,-.14,.206]} fontSize={.083} color="#6f958d">
       {reviewed?"DATA RETRIEVED":"ARCHIVED FOOTAGE"}
     </Text>
   </group>
   <mesh position={[-.50,1.36,.32]} rotation={[-.09,0,-.09]}>
     <boxGeometry args={[.43,.012,.24]}/>
     <meshStandardMaterial color="#c4c5b5" roughness={.95}/>
   </mesh>
   <Text position={[0,.51,.4]} fontSize={.12} color="#c6cec1">B2 SECURITY DESK</Text>
 </group>;
});

const ParkingAlarm=React.memo(function ParkingAlarm({car,active=false,reducedEffects=false}){
 const left=useRef(),right=useRef(),clock=useRef(0);
 useFrame((_,dt)=>{
   if(!active){clock.current=0;return;}
   clock.current+=Math.min(.05,dt);
   // Hazard lamps flash slowly with a strict bounded output; no full-screen
   // white strobe, and motion preferences hold the light steady.
   const lit=reducedEffects?1:(Math.sin(clock.current*7.2)>-.05?1:.12);
   if(left.current)left.current.intensity=lit*3.6;
   if(right.current)right.current.intensity=lit*3.6;
 });
 if(!active||!car)return null;
 const [x,z]=car.position;
 return <group>
   <pointLight ref={left} position={[x-.84,.92,z+2.44]}
     intensity={2} color="#ef453e" distance={11} decay={2}/>
   <pointLight ref={right} position={[x+.84,.92,z+2.44]}
     intensity={2} color="#ef453e" distance={11} decay={2}/>
 </group>;
});
export default React.memo(function VehicleMysteryWorld({
 floor=1,reviewed=false,alarmId=null,reducedEffects=false
}){
 if(floor!==2)return null;
 const car=VEHICLES.find(v=>v.id===alarmId)||null;
 return <group>
   <SecurityDesk reviewed={reviewed}/>
   {car&&<ParkingAlarm key={alarmId} active car={car} reducedEffects={reducedEffects}/>}
 </group>;
});
