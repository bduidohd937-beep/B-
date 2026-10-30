import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// B∞'s original Listener: no humanoid face whatsoever. One giant asymmetrical
// ear forms its entire head, with cartilage/ridges and visible thin blood vessels.
// Deliberately silhouette-first: light, low-poly web geometry and no model files.
const SKIN='#9caaa3', DARK='#3a4b49', CARTILAGE='#c3b9a9', FLESH='#777f7a';

function EarCurve({points,color=CARTILAGE,radius=.032}){
  const curve=useMemo(()=>new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),[points]);
  return <mesh>
    <tubeGeometry args={[curve,20,radius,5,false]}/>
    <meshStandardMaterial color={color} roughness={.84}/>
  </mesh>;
}
const OUTER=[[-.12,-.82,.16],[-.48,-.47,.23],[-.54,.04,.27],[-.37,.66,.22],[.04,.94,.15],[.42,.68,.14],[.50,.20,.18],[.35,-.43,.16],[.08,-.84,.15]];
const HELIX=[[-.18,-.54,.38],[-.39,-.15,.39],[-.31,.42,.36],[.07,.70,.32],[.28,.40,.35],[.22,.11,.4]];
const ANTIHELIX=[[-.08,-.53,.43],[.13,-.25,.47],[-.09,.06,.48],[.11,.30,.45]];
const VESSEL=[[.32,-.38,.40],[.40,-.13,.33],[.32,.22,.32],[.28,.48,.26]];
function EarHead({headRef,innerRef}){
  return <group ref={headRef} position={[.03,2.92,.30]} rotation={[-.12,0,.22]} scale={[1.02,1.08,1]}>
    <mesh scale={[.55,.94,.27]} rotation={[0,-.10,-.12]}>
      <sphereGeometry args={[1,16,20]}/>
      <meshStandardMaterial color={SKIN} roughness={.94} flatShading/>
    </mesh>
    {/* The ear canal and curved folds are the only features on its 'face'. */}
    <mesh ref={innerRef} position={[-.04,-.02,.25]} rotation={[0,-.14,-.2]} scale={[.34,.67,.115]}>
      <sphereGeometry args={[1,13,16]}/>
      <meshStandardMaterial color="#162325" roughness={1}/>
    </mesh>
    <mesh position={[.01,-.16,.35]} scale={[.16,.27,.085]}>
      <sphereGeometry args={[1,12,12]}/>
      <meshStandardMaterial color="#080d0f" roughness={.9}/>
    </mesh>
    <mesh position={[.13,-.65,.11]} scale={[.27,.32,.25]}>
      <sphereGeometry args={[1,12,12]}/>
      <meshStandardMaterial color={FLESH} roughness={1}/>
    </mesh>
    <EarCurve points={OUTER} color={CARTILAGE} radius={.079}/>
    <EarCurve points={HELIX} color="#84948b" radius={.054}/>
    <EarCurve points={ANTIHELIX} color="#a6aba1" radius={.047}/>
    <EarCurve points={VESSEL} color="#713b46" radius={.020}/>
    <mesh position={[-.35,.15,.20]} rotation={[0,0,.5]} scale={[.13,.52,.12]}>
      <sphereGeometry args={[1,10,12]}/>
      <meshStandardMaterial color="#c1aca8" roughness={1}/>
    </mesh>
  </group>;
}
function Arm({side,armRef}){
  const sign=side<0?-1:1;
  return <group ref={armRef} position={[sign*.43,2.25,.06]} rotation={[.13,0,sign*.12]}>
    <mesh position={[sign*.13,-.50,.12]} rotation={[0,0,sign*.12]}>
      <capsuleGeometry args={[.10,.76,4,9]}/>
      <meshStandardMaterial color={SKIN} roughness={1}/>
    </mesh>
    <mesh position={[sign*.25,-1.18,.18]} rotation={[-.22,0,-sign*.11]}>
      <capsuleGeometry args={[.076,.89,4,8]}/>
      <meshStandardMaterial color="#718079" roughness={1}/>
    </mesh>
    <mesh position={[sign*.27,-1.80,.34]} scale={[.14,.16,.11]}>
      <sphereGeometry args={[1,10,8]}/>
      <meshStandardMaterial color={FLESH}/>
    </mesh>
    {[-.11,-.035,.045,.12].map((x,i)=><group key={i} position={[sign*.27+x,-1.91,.36]}>
      <mesh position={[0,-.19,.05]} rotation={[-.13,0,x*.7]}>
        <capsuleGeometry args={[.027,.28+i%2*.07,3,6]}/>
        <meshStandardMaterial color={SKIN} roughness={1}/>
      </mesh>
      <mesh position={[0,-.39-(i%2)*.06,.10]} rotation={[Math.PI,0,0]}>
        <coneGeometry args={[.031,.18,5]}/>
        <meshStandardMaterial color="#756f67" roughness={1}/>
      </mesh>
    </group>)}
  </group>;
}
function Leg({side,legRef}){
  const sign=side<0?-1:1;
  return <group ref={legRef} position={[sign*.25,1.16,.04]}>
    <mesh position={[sign*.045,-.32,.10]} rotation={[.12,0,sign*.13]}>
      <capsuleGeometry args={[.13,.50,4,8]}/>
      <meshStandardMaterial color={DARK} roughness={1}/>
    </mesh>
    <mesh position={[sign*.11,-.78,.18]} rotation={[-.1,0,-sign*.15]}>
      <capsuleGeometry args={[.088,.45,4,8]}/>
      <meshStandardMaterial color={SKIN} roughness={1}/>
    </mesh>
    <mesh position={[sign*.12,-1.10,.39]} scale={[.20,.10,.39]}>
      <sphereGeometry args={[1,12,8]}/>
      <meshStandardMaterial color="#5f706b" roughness={1}/>
    </mesh>
  </group>;
}
export default function ListenerModel({motionRef}){
  const torso=useRef(),ear=useRef(),earCanal=useRef();
  const left=useRef(),right=useRef(),leftLeg=useRef(),rightLeg=useRef();
  const clock=useRef(0),attackTime=useRef(0);
  useFrame((_,delta)=>{
    const dt=Math.min(.05,delta);
    clock.current+=dt;
    const t=clock.current;
    const m=motionRef.current||{};
    const alert=m.state==='investigate';
    const listening=m.state==='listen'||m.state==='search';
    const attack=m.state==='attack';
    const moving=alert||m.state==='return';
    const speed=moving?m.speed||0:0;
    const gait=t*(2.0+speed*1.45),swing=moving?Math.min(1,speed/3.4):.04;
    attackTime.current=attack?Math.min(1.4,attackTime.current+dt):0;
    const lunge=attack?THREE.MathUtils.smoothstep(attackTime.current,0,.33):0;
    if(torso.current){
      torso.current.rotation.x=.38+Math.sin(t*2.2)*.035+lunge*.38;
      torso.current.rotation.z=Math.sin(t*1.1)*.075+(alert?Math.sin(gait)*.07:0);
      torso.current.position.y=1.76+Math.sin(t*1.8)*.025-Math.abs(Math.sin(gait))*.045*swing-lunge*.21;
      torso.current.position.z=lunge*.35;
    }
    if(ear.current){
      const scan=listening?Math.sin(t*2.3)*.68:alert?Math.sin(gait*.25)*.15:Math.sin(t*.7)*.11;
      ear.current.rotation.y=THREE.MathUtils.damp(ear.current.rotation.y,scan,listening?5.8:2.1,dt);
      ear.current.rotation.z=.22+(listening?Math.sin(t*3.1)*.21:Math.sin(t*.9)*.055);
      ear.current.rotation.x=THREE.MathUtils.damp(ear.current.rotation.x,alert?-.37:attack?-.55:-.12,3.2,dt);
      ear.current.scale.y=1.06+Math.sin(t*3.3)*.018+(listening?.10:0);
    }
    if(earCanal.current)earCanal.current.scale.x=.34+(listening?.06:0);
    if(left.current){left.current.rotation.x=.12+Math.sin(gait)*.51*swing-lunge*1.25;left.current.rotation.z=-.13+lunge*.35;}
    if(right.current){right.current.rotation.x=.12-Math.sin(gait)*.51*swing-lunge*1.28;right.current.rotation.z=.13-lunge*.35;}
    if(leftLeg.current)leftLeg.current.rotation.x=-Math.sin(gait)*.39*swing;
    if(rightLeg.current)rightLeg.current.rotation.x=Math.sin(gait)*.39*swing;
  });
  return <group>
    <group ref={torso} position={[0,1.76,0]} rotation={[.38,0,0]}>
      {/* Emaciated skeletal thorax, neck tendons, jutting ribs. */}
      <mesh scale={[.40,.78,.30]} rotation={[0,0,-.08]}>
        <sphereGeometry args={[1,13,13]}/>
        <meshStandardMaterial color={SKIN} roughness={1} flatShading/>
      </mesh>
      <mesh position={[0,-.48,-.09]} scale={[.24,.39,.23]}>
        <sphereGeometry args={[1,12,12]}/>
        <meshStandardMaterial color={DARK} roughness={1}/>
      </mesh>
      <mesh position={[0,.18,.32]} scale={[.24,.42,.09]}>
        <sphereGeometry args={[1,12,12]}/>
        <meshStandardMaterial color="#24332f" roughness={1}/>
      </mesh>
      {[-1,1].flatMap(side=>[0,1,2,3].map(i=><mesh key={side+'-'+i}
        position={[side*(.21+i*.013),.30-i*.145,.25]} rotation={[.11,0,side*(.60+i*.065)]}>
        <capsuleGeometry args={[.030,.26,3,6]}/>
        <meshStandardMaterial color={CARTILAGE} roughness={1}/>
      </mesh>))}
      {[-.17,.0,.17,.34,.51].map((y,i)=><mesh key={i} position={[0,y,-.30]} rotation={[Math.PI/2,0,0]}>
        <coneGeometry args={[.065,.22+i*.018,5]}/>
        <meshStandardMaterial color="#6b7d70"/>
      </mesh>)}
      <mesh position={[0,.73,.035]} rotation={[-.3,0,0]}>
        <capsuleGeometry args={[.10,.47,4,9]}/>
        <meshStandardMaterial color="#718279" roughness={1}/>
      </mesh>
    </group>
    <EarHead headRef={ear} innerRef={earCanal}/>
    <Arm side={-1} armRef={left}/>
    <Arm side={1} armRef={right}/>
    <Leg side={-1} legRef={leftLeg}/>
    <Leg side={1} legRef={rightLeg}/>
    <mesh position={[0,.025,0]} rotation={[-Math.PI/2,0,0]}>
      <circleGeometry args={[.75,20]}/>
      <meshBasicMaterial color="#06090a" opacity={.55} transparent depthWrite={false}/>
    </mesh>
  </group>;
}
