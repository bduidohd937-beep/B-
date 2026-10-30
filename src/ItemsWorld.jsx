import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { ITEM_TYPES, gadgetTiming } from './items.js';

function Shape({type}){
  if(type==='alarm')return <group>
    <mesh position={[0,.19,0]}><boxGeometry args={[.52,.38,.20]}/><meshStandardMaterial color="#a8a99d" metalness={.65} roughness={.42}/></mesh>
    <mesh position={[0,.19,.108]}><circleGeometry args={[.16,12]}/><meshStandardMaterial color="#e5e2cb" emissive="#796b48" emissiveIntensity={.25}/></mesh>
    <mesh position={[0,.41,0]}><torusGeometry args={[.14,.035,6,12]}/><meshStandardMaterial color="#a4aaa3" metalness={.75}/></mesh>
  </group>;
  if(type==='radio')return <group>
    <mesh position={[0,.16,0]}><boxGeometry args={[.35,.43,.16]}/><meshStandardMaterial color="#222f35" metalness={.52}/></mesh>
    <mesh position={[0,.25,.09]}><boxGeometry args={[.22,.08,.025]}/><meshBasicMaterial color="#8ea8a3"/></mesh>
    <mesh position={[.12,.53,0]} rotation={[0,0,.27]}><cylinderGeometry args={[.016,.017,.36,6]}/><meshStandardMaterial color="#9bb0ae"/></mesh>
  </group>;
  if(type==='glow')return <group rotation={[0,0,.3]}>
    <mesh position={[0,.22,0]}><cylinderGeometry args={[.048,.048,.48,8]}/><meshStandardMaterial color="#7adab5" emissive="#2ece94" emissiveIntensity={.8}/></mesh>
    <mesh position={[0,.49,0]}><cylinderGeometry args={[.055,.055,.07,8]}/><meshStandardMaterial color="#647d78"/></mesh>
  </group>;
  if(type==='energy')return <mesh position={[0,.22,0]}>
    <cylinderGeometry args={[.13,.13,.45,12]}/><meshStandardMaterial color="#c8a866" metalness={.6} roughness={.42}/>
  </mesh>;
  return <group>
    <mesh position={[0,.19,0]}><cylinderGeometry args={[.12,.15,.35,10]}/><meshStandardMaterial color="#a2b3ac" metalness={.48}/></mesh>
    <mesh position={[.14,.18,0]} rotation={[0,0,-.45]}><boxGeometry args={[.28,.065,.065]}/><meshStandardMaterial color="#e3ddac"/></mesh>
  </group>;
}
const Pickup=React.memo(function Pickup({item}){
  return <group position={item.position}>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,-.17,0]}>
      <ringGeometry args={[.29,.38,18]}/>
      <meshBasicMaterial color="#b6a777" transparent opacity={.68} depthWrite={false}/>
    </mesh>
    <Shape type={item.type}/>
    <Text position={[0,.92,0]} fontSize={.2} color="#ded7bf" outlineWidth={.012} outlineColor="#07090a" anchorY="middle">{ITEM_TYPES[item.type]?.label||'ITEM'}</Text>
  </group>;
});
const Gadget=React.memo(function Gadget({device,active,onNoise,onExpire}){
  const time=useRef(0),next=useRef(0),expired=useRef(false),lamp=useRef();
  const kind=device.type;
  useFrame((_,delta)=>{
    if(!active||expired.current)return;
    time.current+=Math.min(.08,delta);
    const phase=gadgetTiming(kind,time.current);
    if(lamp.current)lamp.current.intensity=kind==='glow'?1.7:
      phase.active?2.5:0.15;
    if(phase.active && time.current>=next.current){
      onNoise({type:'decoy',device:kind,loudness:phase.loudness,position:[device.position[0],.4,device.position[2]]});
      next.current=time.current+phase.interval;
    }
    if(phase.end){expired.current=true;onExpire(device.id);}
  });
  return <group position={device.position}>
    <Shape type={kind}/>
    {['alarm','radio','glow'].includes(kind)&&<pointLight ref={lamp} position={[0,.5,0]} color={kind==='glow'?'#6bffbc':kind==='radio'?'#739bbd':'#e8776e'} intensity={kind==='glow'?1.7:.1} distance={kind==='glow'?9:4} decay={2}/>}
  </group>;
});
export default React.memo(function ItemsWorld({pickups=[],deployed=[],active,onNoise,onExpire}){
  return <group>
    {pickups.map(item=><Pickup key={item.id} item={item}/>)}
    {deployed.map(device=><Gadget key={device.id} device={device} active={active} onNoise={onNoise} onExpire={onExpire}/>)}
  </group>;
});
