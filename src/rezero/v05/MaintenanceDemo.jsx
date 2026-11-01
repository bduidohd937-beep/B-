import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import * as THREE from 'three';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {PointerLockControls} from '@react-three/drei';
import {AREAS,WALLS,OBSTACLES,STOPS,AREA_BY_ID,DEMO_ROUTE,walkable,stepMove,floorHeight,getArea} from './level.js';
import './style.css';

const CUBE=new THREE.BoxGeometry(1,1,1);
const EYE=1.68;
const OBJECTIVE_STEPS=[
  '계단을 내려가 지하 전기실을 찾아가자',
  '전기실 확인 완료 — 우회통로를 통해 정비실로 이동',
  '정비실 통과 — 관리 창고로 이동',
  '창고 확인 완료 — 중앙복도를 통해 경비실로 복귀',
  '이동 동선 검증 성공 · 현재는 괴물과 정전 이벤트 미구현'
];

function proceduralTexture(base,seed){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d');c.fillStyle=base;c.fillRect(0,0,256,256);
  let value=seed>>>0;const rand=()=>{value=(1664525*value+1013904223)>>>0;return value/4294967296;};
  for(let i=0;i<5000;i++){
    const x=rand()*256,y=rand()*256,w=1+rand()*5,h=1+rand()*7;
    c.fillStyle=rand()>.51?'rgba(225,229,213,'+(rand()*.07)+')':'rgba(4,18,13,'+(rand()*.14)+')';
    c.fillRect(x,y,w,h);
  }
  for(let j=0;j<18;j++){
    c.strokeStyle='rgba(22,26,25,'+(rand()*.1)+')';c.lineWidth=1+rand()*3;c.beginPath();
    c.moveTo(rand()*256,rand()*256);c.lineTo(rand()*256,rand()*256);c.stroke();
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  return t;
}
function useMaterials(){
  const mats=useMemo(()=>{
    const wallTexture=proceduralTexture('#b3b8b0',1234);
    const floorTexture=proceduralTexture('#a3aca5',8910);
    const wall=new THREE.MeshStandardMaterial({color:'#8b9589',map:wallTexture,roughness:.98});
    const floor=new THREE.MeshStandardMaterial({color:'#76827b',map:floorTexture,roughness:.89});
    return {
      wall,floor,
      metal:new THREE.MeshStandardMaterial({color:'#344a47',roughness:.5,metalness:.44}),
      dark:new THREE.MeshStandardMaterial({color:'#131e20',roughness:.84,metalness:.18}),
      wood:new THREE.MeshStandardMaterial({color:'#544c40',roughness:.86}),
      rusty:new THREE.MeshStandardMaterial({color:'#725447',roughness:.92,metalness:.19}),
      marker:new THREE.MeshStandardMaterial({color:'#d7cc9e',roughness:.86}),
      glass:new THREE.MeshStandardMaterial({color:'#668d8b',transparent:true,opacity:.37,metalness:.1,roughness:.27}),
      screen:new THREE.MeshBasicMaterial({color:'#86bdb0'}),
      red:new THREE.MeshBasicMaterial({color:'#a54f47'}),
      green:new THREE.MeshBasicMaterial({color:'#67ad7d'})
    };
  },[]);
  useEffect(()=>()=>{Object.values(mats).forEach(m=>{m.map?.dispose();m.dispose();});},[mats]);
  return mats;
}
function Box({x=0,y=0,z=0,w=1,h=1,d=1,mat,cast=false,rotate=0}){
  return <mesh position={[x,y,z]} scale={[w,h,d]} rotation={[0,rotate,0]}
    geometry={CUBE} material={mat} castShadow={cast} receiveShadow/>;
}
function Wire({a,b,mat,radius=.045}){
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b);
  const delta=to.clone().sub(from), mid=from.clone().add(to).multiplyScalar(.5);
  const quaternion=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize());
  return <mesh position={mid.toArray()} quaternion={quaternion} material={mat}>
    <cylinderGeometry args={[radius,radius,delta.length(),8]}/>
  </mesh>;
}
function EmergencyLamp({x,z,at=2.55,red=false,m}){
  return <group position={[x,at,z]}>
    <Box w={.72} h={.09} d={.26} mat={m.metal}/>
    <Box y={-.07} w={.54} h={.025} d={.16} mat={red?m.red:m.marker}/>
    <pointLight position={[0,-.21,0]} color={red?'#ed6557':'#b8d5b9'}
      intensity={red?3.3:3.8} distance={6.5} decay={2}/>
  </group>;
}
function RoomArchitecture({m}){
  return <>
    {AREAS.map(a=><group key={a.id}>
      {a.kind==='stair'
        ?Array.from({length:8},(_,i)=>{
          const z=3+i+.5;
          const top=floorHeight(0,z);
          return <Box key={i} x={0} y={top-.12} z={z} w={3.3} h={.24} d={1.02} mat={m.floor}/>;
        })
        :<Box x={(a.x0+a.x1)/2} y={(a.elevation||0)-.14} z={(a.z0+a.z1)/2}
          w={a.x1-a.x0} h={.28} d={a.z1-a.z0} mat={m.floor}/>}
      <Box x={(a.x0+a.x1)/2} y={(a.kind==='office'?1.08:0)+2.94}
        z={(a.z0+a.z1)/2} w={a.x1-a.x0} h={.16} d={a.z1-a.z0} mat={m.dark}/>
      {/* Base boards make doorways and wall ends read as physical partitions. */}
    </group>)}
    {WALLS.map(w=><Box key={w.id} x={w.x} y={w.elevation+w.h/2} z={w.z}
      w={w.w} h={w.h} d={w.d} mat={m.wall}/>)}
    {AREAS.map(a=>['N','S','E','W'].flatMap(side=>(a.doors[side]||[]).map(([lo,hi],idx)=>{
      const horizontal=side==='N'||side==='S';
      const edge=side==='N'?a.z0:side==='S'?a.z1:side==='W'?a.x0:a.x1;
      const y=a.kind==='office'?1.08:0;
      return <group key={a.id+side+idx}>
        <Box x={horizontal?lo:edge} z={horizontal?edge:lo}
          y={y+1.16} w={horizontal?.10:.10} d={horizontal?.10:.10} h={2.32} mat={m.metal}/>
        <Box x={horizontal?hi:edge} z={horizontal?edge:hi}
          y={y+1.16} w={.10} d={.10} h={2.32} mat={m.metal}/>
        <Box x={horizontal?(lo+hi)/2:edge} z={horizontal?edge:(lo+hi)/2}
          y={y+2.37} w={horizontal?(hi-lo):.12} d={horizontal?.12:(hi-lo)} h={.13} mat={m.metal}/>
      </group>;
    })))}
    {OBSTACLES.map(o=><group key={o.id}>
      <Box x={o.x} y={floorHeight(o.x,o.z)+o.h/2} z={o.z}
        w={o.w} h={o.h} d={o.d} mat={o.kind==='wood'?m.wood:o.kind==='panel'?m.dark:m.metal} cast/>
      {o.kind==='panel'&&<Box x={o.x} y={1.32} z={o.z+.23} w={o.w*.76} h={.68} d={.035} mat={m.screen}/>}
      {o.kind==='metal'&&<Box x={o.x} y={.89} z={o.z+o.d/2+.016} w={o.w*.65} h={.07} d={.03} mat={m.rusty}/>}
    </group>)}
  </>;
}
function WorldProps({m}){
  return <>
    {/* The office preserves the recognizable CCTV duty station without duplicating the old game systems. */}
    <Box x={-1.5} y={1.08+.79/2} z={-1.95} w={2.55} h={.79} d={.76} mat={m.wood}/>
    {[-2.09,-.93].map((x,i)=><group key={i}>
      <Box x={x} y={2.3} z={-2.12} w={.86} h={.59} d={.12} mat={m.dark}/>
      <Box x={x} y={2.3} z={-2.04} w={.73} h={.44} d={.02} mat={m.screen}/>
      <Box x={x} y={2.01} z={-2.1} w={.12} h={.12} d={.14} mat={m.metal}/>
    </group>)}
    <Box x={1.98} y={1.61} z={-2.83} w={.85} h={.85} d={.15} mat={m.dark}/>
    {Array.from({length:8},(_,i)=><Box key={i} x={1.72+(i%4)*.17} y={1.35+Math.floor(i/4)*.22} z={-2.73} w={.12} h={.09} d={.035} mat={i===0?m.green:m.metal}/>)}
    {/* Real stairwell treads, rails, conduit, and floor transitions. */}
    <Wire a={[-1.40,2.0,3.2]} b={[-1.40,.92,10.9]} mat={m.metal} radius={.042}/>
    <Wire a={[1.40,2.0,3.2]} b={[1.40,.92,10.9]} mat={m.metal} radius={.042}/>
    {Array.from({length:7},(_,i)=><Wire key={i}
      a={[-1.40,1.80-i*.135,3.7+i]} b={[-1.40,.75-i*.135,3.7+i]}
      mat={m.metal} radius={.025}/>)}
    {/* Industrial maintenance services / close-range visual detail. */}
    {['hub','electrical','service','storage','sealed-link'].map(id=>{
      const a=AREA_BY_ID[id],mid=(a.x0+a.x1)/2;
      return <group key={'pipes'+id}>
        <Wire a={[mid-.85,2.57,a.z0+.25]} b={[mid-.85,2.57,a.z1-.25]} mat={m.rusty} radius={.10}/>
        <Wire a={[mid-.55,2.68,a.z0+.25]} b={[mid-.55,2.68,a.z1-.25]} mat={m.metal} radius={.048}/>
      </group>;
    })}
    <EmergencyLamp x={0} z={-.9} at={1.08+2.54} m={m}/>
    <EmergencyLamp x={0} z={7.7} at={2.51} m={m}/>
    <EmergencyLamp x={0} z={14} m={m}/>
    <EmergencyLamp x={0} z={19.7} m={m}/>
    <EmergencyLamp x={9} z={16} m={m}/>
    <EmergencyLamp x={9} z={26.5} m={m}/>
    <EmergencyLamp x={0} z={27} m={m}/>
    <EmergencyLamp x={-4.3} z={16.5} red m={m}/>
    <EmergencyLamp x={5.0} z={16.5} at={2.55} m={m}/>
    <EmergencyLamp x={4.8} z={27} at={2.55} m={m}/>
    {/* Sealed G: you can approach it but not enter, until a later story patch. */}
    <Box x={-5.88} y={1.12} z={16.5} w={.20} h={2.26} d={2.62} mat={m.rusty}/>
    <Box x={-5.74} y={1.05} z={16.15} w={.04} h={.12} d={.22} mat={m.red}/>
    {/* An OPEN security shutter during the route-proof prototype. */}
    <Box x={0} y={2.53} z={11.0} w={2.20} h={.72} d={.20} mat={m.rusty}/>
    <Box x={-1.20} y={1.5} z={11} w={.17} h={2.74} d={.23} mat={m.metal}/>
    <Box x={1.20} y={1.5} z={11} w={.17} h={2.74} d={.23} mat={m.metal}/>
  </>;
}
function Flashlight({enabled}){
  const {camera}=useThree();
  const light=useRef(null),target=useRef(null);
  const facing=useMemo(()=>new THREE.Vector3(),[]);
  useFrame(()=>{
    if(!light.current||!target.current)return;
    camera.getWorldDirection(facing);
    light.current.position.copy(camera.position);
    target.current.position.copy(camera.position).addScaledVector(facing,7);
    target.current.updateMatrixWorld();
  });
  return <>
    <object3D ref={target}/>
    <spotLight ref={light} target={target.current||undefined} color="#e0e8d8"
      intensity={enabled?19:0} angle={.33} penumbra={.53} distance={11} decay={2}/>
  </>;
}
function Space({flashlight}){
  const mats=useMaterials();
  return <>
    <color attach="background" args={['#0b1112']}/>
    <fog attach="fog" args={['#0b1112',16,37]}/>
    <ambientLight intensity={.33} color="#c5d0c1"/>
    <hemisphereLight args={['#adbdad','#0d1615',.37]}/>
    <RoomArchitecture m={mats}/>
    <WorldProps m={mats}/>
    <Flashlight enabled={flashlight}/>
  </>;
}
function useSound(){
  const store=useRef(null);
  useEffect(()=>()=>{store.current?.close?.();},[]);
  const start=useCallback(()=>{
    if(store.current){store.current.ctx.resume();return;}
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return;
    const ctx=new AC(),master=ctx.createGain();master.gain.value=.18;master.connect(ctx.destination);
    const hum=ctx.createOscillator(),tone=ctx.createGain();
    hum.type='sawtooth';hum.frequency.value=53;
    tone.gain.value=.028;hum.connect(tone);tone.connect(master);hum.start();
    store.current={ctx,close:()=>{hum.stop();ctx.close();},tick:()=>{
      if(ctx.state!=='running')return;
      const osc=ctx.createOscillator(),vol=ctx.createGain();
      osc.type='triangle';osc.frequency.value=120;
      osc.connect(vol);vol.connect(master);
      vol.gain.setValueAtTime(.0005,ctx.currentTime);
      vol.gain.linearRampToValueAtTime(.11,ctx.currentTime+.016);
      vol.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.13);
      osc.start();osc.stop(ctx.currentTime+.15);
      osc.onended=()=>{osc.disconnect();vol.disconnect();};
    }};
  },[]);
  return {start,sound:store};
}
function CameraController({started,zoneChanged,progressed,onSteps,flashlight}){
  const {camera,gl}=useThree();
  const held=useRef({});
  const lastZone=useRef('');
  const stepDistance=useRef(0);
  const forward=useMemo(()=>new THREE.Vector3(),[]);
  const lateral=useMemo(()=>new THREE.Vector3(),[]);
  const callbackRef=useRef({zoneChanged,progressed,onSteps});
  callbackRef.current={zoneChanged,progressed,onSteps};
  useEffect(()=>{
    camera.position.set(0,1.08+EYE,0.4);
    camera.rotation.set(0,Math.PI,0); // Look DOWN the stairs, +Z.
  },[camera]);
  useEffect(()=>{
    const down=e=>{
      if(['KeyW','KeyS','KeyA','KeyD','ShiftLeft','KeyC'].includes(e.code))e.preventDefault();
      held.current[e.code]=true;
    };
    const up=e=>{held.current[e.code]=false;};
    const blur=()=>{held.current={};};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);
    window.addEventListener('blur',blur);
    return ()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);};
  },[]);
  useFrame((_,delta)=>{
    if(!started||!document.pointerLockElement)return;
    const dt=Math.min(delta,.04);
    const moveX=(held.current.KeyD?1:0)-(held.current.KeyA?1:0);
    const moveZ=(held.current.KeyW?1:0)-(held.current.KeyS?1:0);
    const norm=Math.hypot(moveX,moveZ);
    camera.getWorldDirection(forward);forward.y=0;forward.normalize();
    lateral.set(-forward.z,0,forward.x);
    let actual=0;
    if(norm){
      const speed=held.current.KeyC?1.0:held.current.ShiftLeft?4.2:2.5;
      const dx=(forward.x*moveZ+lateral.x*moveX)*speed*dt/norm;
      const dz=(forward.z*moveZ+lateral.z*moveX)*speed*dt/norm;
      const before={x:camera.position.x,z:camera.position.z};
      const next=stepMove(before,dx,dz);
      actual=Math.hypot(next.x-before.x,next.z-before.z);
      camera.position.x=next.x;camera.position.z=next.z;
    }
    const eye=held.current.KeyC?1.06:EYE;
    const goal=floorHeight(camera.position.x,camera.position.z)+eye;
    camera.position.y=THREE.MathUtils.damp(camera.position.y,goal,11,dt);
    if(actual){
      stepDistance.current+=actual;
      if(stepDistance.current>.78){stepDistance.current-=.78;callbackRef.current.onSteps();}
    }
    const a=getArea(camera.position.x,camera.position.z);
    if(a && a.id!==lastZone.current){
      lastZone.current=a.id;
      callbackRef.current.zoneChanged(a);
      callbackRef.current.progressed(a.id);
    }
  });
  return <PointerLockControls/>;
}
function LevelMap({current}){
  return <div className="map-panel">
    <div className="map-heading">시설 개요도 · 이동 동선 검증</div>
    <svg viewBox="-14 -5 30 39" role="img" aria-label="경비실, 계단, 중앙복도, 전기실, 정비실, 창고가 연결된 2차원 시설 지도">
      {AREAS.map(a=><rect key={a.id}
        x={a.x0} y={a.z0} width={a.x1-a.x0} height={a.z1-a.z0}
        fill={a.id===current?'#729b88':a.kind==='sealed'?'#624340':'#283c36'} stroke="#a3c0ac"
        strokeWidth=".08"/>)}
      <g fontSize="1.0" fill="#eef2e6" textAnchor="middle">
        <text x="0" y="0">경비실</text><text x="0" y="7">계단</text>
        <text x="0" y="16">중앙복도</text><text x="9" y="16">전기실</text>
        <text x="9" y="27">정비실</text><text x="0" y="27">창고</text>
        <text x="-4.6" y="15.6" fontSize=".6">폐쇄</text>
      </g>
      <circle cx="0" cy={0} r=".38" fill="#f2db89"/>
    </svg>
    <div className="map-note">방향·연결 검수용 지도 (M으로 닫기)<br/>폐쇄 설비 구역은 후속 단계에서 개방</div>
  </div>;
}
export default function MaintenanceDemo(){
  const [started,setStarted]=useState(false);
  const [zone,setZone]=useState(AREA_BY_ID.guard);
  const [progress,setProgress]=useState(0);
  const [steps,setSteps]=useState(0);
  const [showMap,setShowMap]=useState(false);
  const [flashlight,setFlashlight]=useState(true);
  const [debug,setDebug]=useState(false);
  const [fps,setFps]=useState(0);
  const frameT=useRef(0),frameN=useRef(0);
  const {start,sound}=useSound();
  const progressRef=useRef(0);
  const zoneChanged=useCallback(a=>setZone(a),[]);
  const progressed=useCallback(id=>{
    const p=progressRef.current;
    const next=p===0&&id==='electrical'?1:
      p===1&&id==='service'?2:
      p===2&&id==='storage'?3:
      p===3&&id==='guard'?4:p;
    if(next!==p){progressRef.current=next;setProgress(next);sound.current?.tick();}
  },[sound]);
  const onSteps=useCallback(()=>setSteps(n=>n+1),[]);
  useEffect(()=>{
    const keys=e=>{
      if(e.repeat)return;
      if(e.code==='KeyM'){setShowMap(a=>!a);}
      if(e.code==='KeyF'){setFlashlight(a=>!a);}
      if(e.code==='F3'){e.preventDefault();setDebug(a=>!a);}
    };
    window.addEventListener('keydown',keys);
    return ()=>window.removeEventListener('keydown',keys);
  },[]);
  const begin=()=>{
    start();setStarted(true);
    const canvas=document.querySelector('.map-demo canvas');
    try{canvas?.requestPointerLock?.();}catch{}
  };
  return <main className="map-demo">
    <Canvas dpr={[1,1.5]} camera={{fov:72,near:.045,far:44,position:[0,2.76,.4]}} gl={{antialias:true,powerPreference:'high-performance'}}>
      <Space flashlight={flashlight}/>
      <CameraController started={started} zoneChanged={zoneChanged} progressed={progressed} onSteps={onSteps}/>
    </Canvas>
    <div className="world-vignette"/>
    <header className="level-header">
      <span>B∞ RE:ZERO / V0.5-A</span>
      <strong>{zone?.name||'지하 관리구역'}</strong>
      <span className="level-status">지도 M · 손전등 F · 상태 F3</span>
    </header>
    {started&&<div className="cursor-dot">+</div>}
    <div className="objective">
      <div className="mission-label">ROUTE TEST · {Math.min(progress,4)}/4</div>
      <p>{OBJECTIVE_STEPS[progress]}</p>
      <small>WASD 이동 · Shift 달리기 · C 웅크리기 · ESC 포인터 해제</small>
    </div>
    {showMap&&<LevelMap current={zone?.id}/>}
    {debug&&<div className="performance">V0.5-A BLOCKOUT<br/>이동 구역 {zone?.id}<br/>발걸음 {steps}<br/>괴물/추격 미구현<br/>테스트 FPS {fps||'브라우저 측정 필요'}</div>}
    {!started&&<div className="start-screen">
      <div className="supra">B∞ RE:ZERO · SURVIVE THE NIGHT</div>
      <h1>마지막 야간근무</h1>
      <h2>V0.5-A / 지하층 동선 프로토타입</h2>
      <p>이번 빌드에서는 경비실에서 지하 전기실과 정비실·창고를 거쳐 돌아오는 동선을 테스트합니다.<br/>
      괴물과 정전, 셔터 봉쇄는 다음 단계에서 추가됩니다.</p>
      <button onClick={begin}>지하층 동선 점검 시작</button>
      <small>PC 키보드·마우스 전용 · 기존 RE:ZERO CCTV 프로토타입과 별도 실행</small>
    </div>}
    {progress===4&&<div className="route-success">
      <strong>동선 점검 완료</strong>
      <p>두 경로를 연결한 지하 맵의 기본 이동 확인.<br/>추격전의 실제 공포·AI는 아직 구현 전입니다.</p>
      <button onClick={()=>setShowMap(a=>!a)}>맵 구조 확인 (M)</button>
    </div>}
    <div className="build-notice">BLOCKOUT · 고품질 아트/AI/정전·탈출 사건 미구현 · 첫 단계 검수용</div>
  </main>;
}
