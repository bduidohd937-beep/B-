import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Text } from '@react-three/drei';
import * as THREE from 'three';
import { createSoundEngine } from './sound.js';

const pillars = [];
for (let z = -28; z <= 18; z += 9) for (const x of [-10, 10]) pillars.push([x, z]);
const parkedCars = [[-6,-20],[-6,-3],[-6,14],[6,-24],[6,-7],[6,11]];
const clamp = THREE.MathUtils.clamp;

function Car({ x, z, color = '#303b3e' }) {
  return <group position={[x,0,z]}>
    <mesh position={[0,.58,0]} castShadow><boxGeometry args={[2.45,.95,4.5]}/><meshStandardMaterial color={color} roughness={.47} metalness={.33}/></mesh>
    <mesh position={[0,1.22,-.22]}><boxGeometry args={[2.16,.55,2.5]}/><meshStandardMaterial color="#18282d" metalness={.3} roughness={.23}/></mesh>
    {[-1,1].flatMap(s=>[-1.5,1.5].map(t=><mesh key={s+':'+t} position={[s*1.23,.38,t]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.35,.35,.16,12]}/><meshStandardMaterial color="#101417"/></mesh>))}
    {[-.8,.8].map(x=><mesh key={x} position={[x,.64,2.26]}><boxGeometry args={[.45,.2,.04]}/><meshBasicMaterial color="#842d2b"/></mesh>)}
  </group>;
}
function Garage({ altered, flicker }) {
  return <group>
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow><planeGeometry args={[42,92]}/><meshStandardMaterial color="#32383a" roughness={.97}/></mesh>
    <mesh position={[0,4.7,-4]} receiveShadow><boxGeometry args={[42,.45,92]}/><meshStandardMaterial color="#3a4042" roughness={1}/></mesh>
    {[-20,20].map(x=><mesh key={x} position={[x,2,-4]}><boxGeometry args={[.6,4.5,92]}/><meshStandardMaterial color="#535a5a"/></mesh>)}
    <mesh position={[0,2,-49]}><boxGeometry args={[42,4.5,.6]}/><meshStandardMaterial color="#50585a"/></mesh>
    {pillars.map(([x,z],i)=><group key={i} position={[x,0,z]}>
      <mesh position={[0,2.15,0]} castShadow receiveShadow><boxGeometry args={[1.6,4.3,1.6]}/><meshStandardMaterial color="#687073" roughness={.98}/></mesh>
      <mesh position={[0,1.35,.81]}><boxGeometry args={[1.62,.57,.035]}/><meshStandardMaterial color={i%3===0?'#b59f53':'#5c6765'}/></mesh>
      <Text position={[0,2,.83]} fontSize={.3} color="#111c1e">B2</Text>
    </group>)}
    {parkedCars.map(([x,z],i)=><Car key={i} x={x} z={z} color={['#354149','#4b4942','#2e4541'][i%3]}/>)}
    {Array.from({length:10},(_,i)=><group key={i} position={[0,4.39,-42+i*8.2]}>
      <mesh><boxGeometry args={[1.1,.08,3.7]}/><meshBasicMaterial color={i===3 || i===7 || (flicker&&i===5)?'#3b4242':'#b2bcaf'} toneMapped={false}/></mesh>
      {(i===3||i===7)?null:<pointLight position={[0,-.65,0]} intensity={flicker&&i===5?.4:3.5} distance={17} decay={2} color="#dce8d5"/>}
    </group>)}
    {Array.from({length:12},(_,i)=><mesh key={i} rotation={[-Math.PI/2,0,0]} position={[0,.016,-41+i*7]}>
      <planeGeometry args={[.12,2.4]}/><meshBasicMaterial color="#858b77" transparent opacity={.65}/></mesh>)}
    <group position={[0,2.6,-34]}>
      <mesh><boxGeometry args={[4.3,1.15,.3]}/><meshStandardMaterial color={altered?'#662e30':'#24654e'} emissive={altered?'#681d20':'#176c46'} emissiveIntensity={1.5}/></mesh>
      <Text position={[0,0,.18]} fontSize={.56} color="#e6e8dd">{altered?'B ∞':'EXIT ↑'}</Text>
    </group>
    {altered && <mesh position={[0,1.8,-38]}><boxGeometry args={[7,3.6,.8]}/><meshStandardMaterial color="#596063"/></mesh>}
    {Array.from({length:10},(_,i)=><mesh key={'bay'+i} position={[i%2===0?-13.7:13.7,.018,-35+i*6]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.11,4.8]}/><meshBasicMaterial color="#9c9b76" transparent opacity={.48}/></mesh>)}
    <mesh position={[0,.05,-32]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[5,5]}/><meshBasicMaterial color="#22272b" transparent opacity={.5}/></mesh>
  </group>;
}
function Watcher({ shifted }) {
  return <group position={shifted?[-8,0,-8]:[9,0,-16]}>
    <mesh position={[0,1.35,0]}><capsuleGeometry args={[.27,1.25,5,8]}/><meshStandardMaterial color="#080b0b" roughness={1}/></mesh>
    <mesh position={[0,2.38,.03]}><sphereGeometry args={[.26,12,12]}/><meshStandardMaterial color="#080b0b"/></mesh>
    {[-.16,.16].map(x=><mesh key={x} position={[x,.47,0]}><boxGeometry args={[.18,.95,.19]}/><meshStandardMaterial color="#090b0c"/></mesh>)}
    <mesh position={[0,2.32,.23]}><boxGeometry args={[.31,.04,.02]}/><meshBasicMaterial color="#3a4141"/></mesh>
  </group>;
}
function Player({ active, torch, onNear, onTurn, onWatcherShift, altered, onFinish, onNoise, onMoveMode }) {
  const { camera } = useThree();
  const keys = useRef({});
  const hadLooked = useRef(false);
  const sawWatcher = useRef(false);
  const unseenTime = useRef(0);
  const shiftedOnce = useRef(false);
  const crouchToggle = useRef(false);
  const vertical = useRef(0);
  const velocityY = useRef(0);
  const stepClock = useRef(0);
  const bobClock = useRef(0);
  const jumpQueued = useRef(false);
  const crouchAlpha = useRef(0);
  const lastMode = useRef('walk');
  const forward = useMemo(()=>new THREE.Vector3(),[]);
  const right = useMemo(()=>new THREE.Vector3(),[]);
  const movement = useMemo(()=>new THREE.Vector3(),[]);
  const direction = useMemo(()=>new THREE.Vector3(),[]);
  useEffect(()=>{
    camera.position.set(0,1.7,17);
    const down=e=>{
      if(e.code==='KeyC'&&!e.repeat)crouchToggle.current=!crouchToggle.current;
      if(e.code==='Space'&&!e.repeat)jumpQueued.current=true;
      keys.current[e.code]=true;
      if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    };
    const up=e=>{keys.current[e.code]=false;};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);
    return ()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
  },[camera]);
  useEffect(()=>{
    const lamp = new THREE.SpotLight('#e4eadc', 28, 24, Math.PI/7, .66, 2);
    lamp.position.set(.12,-.09,-.05);
    lamp.target.position.set(0,-.18,-8);
    camera.add(lamp); camera.add(lamp.target);
    lamp.userData.flashlight=true;
    return ()=>{camera.remove(lamp);camera.remove(lamp.target);lamp.dispose?.();};
  },[camera]);
  useFrame((_,delta)=>{
    const lamp=camera.children.find(c=>c.userData?.flashlight);
    if(lamp)lamp.intensity=torch?28:0;
    if(!active)return;
    camera.getWorldDirection(direction);
    forward.set(direction.x,0,direction.z).normalize();
    right.crossVectors(forward,camera.up).normalize();
    movement.set(0,0,0);
    if(keys.current.KeyW||keys.current.ArrowUp)movement.add(forward);
    if(keys.current.KeyS||keys.current.ArrowDown)movement.sub(forward);
    if(keys.current.KeyD||keys.current.ArrowRight)movement.add(right);
    if(keys.current.KeyA||keys.current.ArrowLeft)movement.sub(right);
    const dt=Math.min(delta,.05);
    const crouching=Boolean(keys.current.ControlLeft||keys.current.ControlRight||crouchToggle.current);
    const sprinting=Boolean(!crouching&&(keys.current.ShiftLeft||keys.current.ShiftRight));
    const mode=crouching?'crouch':sprinting?'sprint':'walk';
    if(lastMode.current!==mode){lastMode.current=mode;onMoveMode(mode);}
    const moving=movement.lengthSq()>0;
    if(jumpQueued.current){
      if(!crouching&&vertical.current===0){velocityY.current=4.5;onNoise({type:'jump',loudness:48,position:camera.position.toArray()});}
      jumpQueued.current=false;
    }
    if(moving){
      movement.normalize().multiplyScalar(dt*(crouching?1.45:sprinting?6.2:3.35));
      let nx=clamp(camera.position.x+movement.x,-18.5,18.5);
      let nz=clamp(camera.position.z+movement.z,-46,39);
      const blocked=(x,z)=>pillars.some(([px,pz])=>Math.abs(x-px)<1.15&&Math.abs(z-pz)<1.15) || parkedCars.some(([cx,cz])=>Math.abs(x-cx)<1.7&&Math.abs(z-cz)<2.7) || (altered&&Math.abs(x)<4.1&&Math.abs(z+38)<.95);
      if(!blocked(nx,camera.position.z))camera.position.x=nx;
      if(!blocked(camera.position.x,nz))camera.position.z=nz;
    }
    if(vertical.current>0||velocityY.current>0){
      vertical.current=Math.max(0,vertical.current+velocityY.current*dt);
      velocityY.current-=12*dt;
      if(vertical.current===0){velocityY.current=0;onNoise({type:'land',loudness:100,position:camera.position.toArray()});}
    }
    crouchAlpha.current=THREE.MathUtils.damp(crouchAlpha.current,crouching?1:0,12,dt);
    if(moving&&vertical.current===0){
      stepClock.current+=dt;
      bobClock.current+=dt*(sprinting?11:crouching?3.5:7);
      const interval=sprinting?.3:crouching?.77:.49;
      if(stepClock.current>=interval){
        stepClock.current=0;
        onNoise({type:'step',mode,loudness:sprinting?90:crouching?8:35,position:camera.position.toArray()});
      }
    }else{stepClock.current=Math.min(stepClock.current,.15);}
    camera.position.y=1.7-.66*crouchAlpha.current+vertical.current+(moving&&vertical.current===0?Math.sin(bobClock.current)*.023:0);
    if(camera.position.z < -10)onNear();
    if(camera.position.z < -10 && direction.z>0.45&&!hadLooked.current){hadLooked.current=true;onTurn();}
    if(!shiftedOnce.current){
      const toWatcher=new THREE.Vector3(9-camera.position.x,2-camera.position.y,-16-camera.position.z);
      const distance=toWatcher.length();
      const visible=direction.dot(toWatcher.normalize())>.67;
      if(distance<20&&visible)sawWatcher.current=true;
      if(sawWatcher.current&&!visible)unseenTime.current+=delta;
      else unseenTime.current=0;
      if(unseenTime.current>1.2){shiftedOnce.current=true;onWatcherShift();}
    }
    if(altered&&camera.position.z<-30&&Math.abs(camera.position.x)<6)onFinish();
  });
  return null;
}
function World({ active, torch, onNear, onTurn, onWatcherShift, altered, shifted, onFinish, onNoise, onMoveMode }) {
  const [flicker,setFlicker]=useState(false);
  useEffect(()=>{
    if(!active)return;
    let timer;
    const cycle=()=>{
      setFlicker(true);onNoise({type:'electric',loudness:12,position:[0,4,-2]});
      timer=setTimeout(()=>{setFlicker(false);timer=setTimeout(cycle,1900+Math.random()*6000);},90+Math.random()*550);
    };
    timer=setTimeout(cycle,1100+Math.random()*3500);
    return ()=>clearTimeout(timer);
  },[active,onNoise]);
  const {camera}=useThree();
  return <>
    <color attach="background" args={['#101719']}/>
    <fog attach="fog" args={['#101719',9,49]}/>
    <ambientLight intensity={.43} color="#9cadad"/>
    <Garage altered={altered} flicker={flicker}/>
    <Watcher shifted={shifted}/>
    <Player active={active} torch={torch} onNear={onNear} onTurn={onTurn} onWatcherShift={onWatcherShift} altered={altered} onFinish={onFinish} onNoise={onNoise} onMoveMode={onMoveMode}/>
    <PointerLockControls makeDefault onLock={()=>{}} onUnlock={()=>{}} />
  </>;
}
export default function App(){
  const [started,setStarted]=useState(false);
  const [locked,setLocked]=useState(false);
  const [torch,setTorch]=useState(true);
  const [near,setNear]=useState(false);
  const [altered,setAltered]=useState(false);
  const [ending,setEnding]=useState(false);
  const [shifted,setShifted]=useState(false);
  const [audioOn,setAudioOn]=useState(true);
  const [moveMode,setMoveMode]=useState('walk');
  const soundRef=useRef(null);
  const noiseLog=useRef([]);
  const onMoveMode=useCallback(mode=>setMoveMode(mode),[]);
  const onNoise=useCallback(event=>{
    // Shared noise event contract for a future sound-sensitive creature.
    noiseLog.current.push({...event,time:performance.now()});
    if(noiseLog.current.length>32)noiseLog.current.shift();
    const sound=soundRef.current;
    if(!sound)return;
    if(event.type==='step')sound.step(event.mode);
    if(event.type==='land')sound.land();
    if(event.type==='electric')sound.flicker();
  },[]);
  const onWatcherShift=useCallback(()=>setShifted(true),[]);
  const onFinish=useCallback(()=>setEnding(true),[]);
  const onNear=useCallback(()=>setNear(true),[]);
  const onTurn=useCallback(()=>setAltered(true),[]);
  useEffect(()=>{
    const key=e=>{if(e.code==='KeyF'&&!e.repeat)setTorch(v=>!v);};
    const lock=()=>setLocked(document.pointerLockElement!==null);
    window.addEventListener('keydown',key);document.addEventListener('pointerlockchange',lock);
    return ()=>{window.removeEventListener('keydown',key);document.removeEventListener('pointerlockchange',lock);};
  },[]);
  useEffect(()=>()=>soundRef.current?.dispose(),[]);
  useEffect(()=>{soundRef.current?.setEnabled(audioOn);},[audioOn]);
  const begin=()=>{
    setStarted(true);
    if(!soundRef.current)soundRef.current=createSoundEngine();
    soundRef.current?.setEnabled(audioOn);
    soundRef.current?.resume();
    const canvas=document.querySelector('canvas');
    canvas?.requestPointerLock?.();
  };
  return <>
    <Canvas shadows={false} camera={{fov:74,near:.08,far:90,position:[0,1.7,17]}} gl={{antialias:true,powerPreference:'high-performance'}}>
      <World active={started&&locked&&!ending} torch={torch} onNear={onNear} onTurn={onTurn} onWatcherShift={onWatcherShift} altered={altered} shifted={shifted} onFinish={onFinish} onNoise={onNoise} onMoveMode={onMoveMode}/>
    </Canvas>
    <div className="vignette"/>
    <div className="hud">
      <div className="top">B<span>∞</span> / B2 · 03:17</div>
      <div className="stamp">PROTOTYPE 0.3 / WORK IN PROGRESS</div>
      <div className="reticle"/>
      <div className="audio-toggle" onClick={()=>setAudioOn(v=>!v)} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')setAudioOn(v=>!v)}}>{audioOn?'환경음 ON':'환경음 OFF'}</div>
      <div className="movement-indicator">{moveMode==='crouch'?'앉기 / 저소음':moveMode==='sprint'?'달리기 / 큰 발소리':'걷기 / 보통 발소리'}</div>
      <div className="controls">WASD 이동 · Shift 달리기 · Ctrl 누르기 / C 앉기 전환 · Space 점프 · F 손전등 · ESC 일시정지</div>
      {started&&locked&&!ending&&<div className="hint">{altered?'출구가 막혔다. 가까이 가서 확인하자.':shifted?'방금 전까지 저 기둥 뒤에 있지 않았나?':near?'기둥 뒤에 누군가 서 있다.':'출구를 찾아라. B2층 끝에 녹색 표시가 보인다.'}</div>}
    </div>
    {(!started||!locked||ending)&&<div className="overlay"><section className="panel">
      <div className="eyebrow">B∞ / THE ENDLESS PARKING GARAGE</div>
      <h1>{ending?'출구가 없다.':!started?'끝나지 않는 주차장':'일시정지'}</h1>
      <p>{ending?<>계단도, 출구도 사라졌다.<br/>조금 전 기둥 뒤의 사람은 지금 어디에 있을까?</>:!started?<>차를 찾으러 내려왔을 뿐이다.<br/>하지만 이곳에서 나가는 길은 보이지 않는다.</>:'마우스가 잠금 해제되었습니다. 다시 들어가려면 계속을 누르세요.'}</p>
      <button onClick={()=>{if(ending)window.location.reload();else begin();}}>{ending?'처음부터':'들어가기'}</button>
      {ending&&<p className="red">PROTOTYPE 0.3 — TO BE CONTINUED</p>}
    </section></div>}
  </>;
}
