import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { focusTarget, passageAllowed, canRecordVideoMismatch, doorCloseObstructed, DOOR_OPEN_ANGLE } from './rules.js';

const TARGETS = [
  { id: 'chair', x: -.34, z: .45, label: '관제 의자에 앉기' },
  { id: 'monitor', x: -.45, z: -1.12, label: 'CCTV 감시 모니터' },
  { id: 'relay', x: 1.8, z: -1.25, label: '보안 제어반' },
  { id: 'door', x: 2.45, z: 1.10, label: '경비실 출입문' },
  { id: 'log', x: -1.8, z: -.98, label: '야간 근무일지' }
];
const COLOR = { ink: '#101918', plaster: '#69716a', ceiling: '#626b62', concrete: '#575e59',
  floor: '#515d56', steel: '#273b3a', wood: '#51483e', trim: '#29312e',
  glass: '#506d6a', paper: '#d8d1ae', rubber: '#171d1d' };

function makeGrunge(base, seed) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  let v = seed;
  const rnd = () => { v = (v * 1664525 + 1013904223) >>> 0; return v / 4294967296; };
  for (let i = 0; i < 4800; i++) {
    const x = rnd() * 256, y = rnd() * 256, a = rnd() * .09;
    g.fillStyle = rnd() > .55 ? 'rgba(230,226,205,' + a + ')' : 'rgba(13,19,17,' + a + ')';
    g.fillRect(x, y, 1 + rnd() * 8, 1 + rnd() * 4);
  }
  for (let i = 0; i < 19; i++) {
    g.strokeStyle = 'rgba(11,15,13,' + (rnd() * .08) + ')';
    g.beginPath(); const x = rnd() * 256;
    g.moveTo(x, 0); g.lineTo(x + rnd() * 8, 256); g.stroke();
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function useMaterials() {
  const mats = useMemo(() => {
    const wallMap = makeGrunge('#858984', 17);
    const floorMap = makeGrunge('#858b84', 47);
    return {
      wall: new THREE.MeshStandardMaterial({ color: '#afb8ad', map: wallMap, roughness: .93 }),
      floor: new THREE.MeshStandardMaterial({ color: '#8e9b8f', map: floorMap, roughness: .86, metalness: .06 }),
      concrete: new THREE.MeshStandardMaterial({ color: COLOR.concrete, roughness: .95 }),
      ceiling: new THREE.MeshStandardMaterial({ color: COLOR.ceiling, roughness: .94 }),
      trim: new THREE.MeshStandardMaterial({ color: COLOR.trim, roughness: .65, metalness: .45 }),
      steel: new THREE.MeshStandardMaterial({ color: COLOR.steel, roughness: .43, metalness: .64 }),
      wood: new THREE.MeshStandardMaterial({ color: COLOR.wood, roughness: .78 }),
      rubber: new THREE.MeshStandardMaterial({ color: COLOR.rubber, roughness: .9 }),
      paper: new THREE.MeshStandardMaterial({ color: COLOR.paper, roughness: .95 }),
      amber: new THREE.MeshStandardMaterial({ color: '#e5bd6a', emissive: '#9b6725', emissiveIntensity: .42, roughness: .6 })
    };
  }, []);
  useEffect(() => () => {
    Object.values(mats).forEach(m => m.dispose());
    mats.wall.map.dispose(); mats.floor.map.dispose();
  }, [mats]);
  return mats;
}

function Block({ p, s, mat, rot = [0, 0, 0], cast = true }) {
  return <mesh position={p} rotation={rot} material={mat} castShadow={cast} receiveShadow>
    <boxGeometry args={s} />
  </mesh>;
}

function Envelope({ m }) {
  return <>
    <Block p={[0, -.16, 0]} s={[6.5, .32, 6]} mat={m.floor}/>
    <Block p={[0, 2.78, 0]} s={[6.5, .18, 6]} mat={m.ceiling} cast={false}/>
    <Block p={[0, 1.35, -3]} s={[6.5, 2.72, .22]} mat={m.wall}/>
    <Block p={[0, 1.35, 3]} s={[6.5, 2.72, .22]} mat={m.wall}/>
    <Block p={[-3.25, 1.35, 0]} s={[.22, 2.72, 6]} mat={m.wall}/>
    <Block p={[3.25, 1.35, -1.58]} s={[.22, 2.72, 2.84]} mat={m.wall}/>
    <Block p={[3.25, 1.35, 2.45]} s={[.22, 2.72, 1.04]} mat={m.wall}/>
    <Block p={[3.25, 2.42, 1.02]} s={[.22, .58, 1.98]} mat={m.wall}/>
    <Block p={[3.25, .075, 1.02]} s={[.26, .15, 1.98]} mat={m.trim}/>
    <Block p={[-3.02, .9, 0]} s={[.06, 1.8, 5.9]} mat={m.trim}/>
    <Block p={[0, .07, -2.86]} s={[6.2, .14, .12]} mat={m.trim}/>
    <Block p={[0, .07, 2.86]} s={[6.2, .14, .12]} mat={m.trim}/>
    <Block p={[8.65, -.16, 1.55]} s={[11.6, .32, 3.12]} mat={m.floor}/>
    <Block p={[8.65, 2.65, 1.55]} s={[11.6, .18, 3.12]} mat={m.ceiling}/>
    <Block p={[8.65, 1.29, -.04]} s={[11.6, 2.63, .16]} mat={m.concrete}/>
    <Block p={[8.65, 1.29, 3.13]} s={[11.6, 2.63, .16]} mat={m.concrete}/>
    <Block p={[14.47, 1.29, 1.55]} s={[.18, 2.63, 3.12]} mat={m.concrete}/>
    <Block p={[14.33, 1.19, 1.53]} s={[.12, 2.32, 1.41]} mat={m.steel}/>
    <Block p={[14.23, 1.38, 1.54]} s={[.13, 1.82, 1.12]} mat={m.trim}/>
    <Block p={[14.14, 1.18, 1.88]} s={[.15, .17, .05]} mat={m.amber}/>
    {Array.from({ length: 8 }, (_,i) =>
      <Block key={'floor'+i} p={[4+i*1.28,.005,1.6]} s={[.035,.015,2.85]} mat={m.trim} cast={false}/>
    )}
    {Array.from({ length: 8 }, (_,i) =>
      <Block key={'wall'+i} p={[4+i*1.28,1.2,-.035]} s={[.025,2.3,.03]} mat={m.trim} cast={false}/>
    )}
    <Block p={[7.2,2.35,-.02]} s={[8,.13,.15]} mat={m.steel} cast={false}/>
    <Block p={[7.2,2.17,-.02]} s={[8,.09,.07]} mat={m.trim} cast={false}/>
  </>;
}

function LampFixture({ p, on, m }) {
  return <group position={p}>
    <Block p={[0,0,0]} s={[.82,.11,.31]} mat={m.trim}/>
    <mesh position={[0,-.073,0]}>
      <boxGeometry args={[.66,.018,.19]}/>
      <meshBasicMaterial color={on ? '#eff3d8' : '#47564e'} toneMapped={false}/>
    </mesh>
    {on && <pointLight position={[0,-.26,0]} color="#d6e2c8" intensity={5.5} distance={7} decay={2}/>}
  </group>;
}

function Decor({ m }) {
  return <>
    <Block p={[-.7,.72,-1.95]} s={[3.9,.16,1.26]} mat={m.wood}/>
    {[-2.42,.98].map(x=><Block key={'deskleg'+x} p={[x,.39,-1.99]} s={[.12,.71,1.13]} mat={m.steel}/>)}
    <Block p={[-.7,.73,-1.85]} s={[3.7,.025,1.1]} mat={m.trim} cast={false}/>
    <Block p={[-1.78,.83,-1.23]} s={[.68,.035,.48]} mat={m.paper}/>
    {Array.from({ length: 6 }, (_,i)=><Block key={'paper'+i} p={[-1.86+i*.025,.85+i*.006,-1.28+i*.008]} s={[.43,.008,.32]} mat={m.paper}/>)}
    <Block p={[1.02,.9,-1.35]} s={[.51,.21,.39]} mat={m.steel}/>
    {Array.from({ length: 15 }, (_,i)=><Block key={'key'+i} p={[.82+(i%5)*.1,1.014,-1.5+Math.floor(i/5)*.12]} s={[.067,.013,.07]} mat={m.rubber} cast={false}/>)}
    <Block p={[.05,.86,-1.17]} s={[.63,.045,.22]} mat={m.rubber}/>
    {Array.from({ length: 10 }, (_,i)=><Block key={'kb'+i} p={[-.19+(i%5)*.11,.89,-1.18+Math.floor(i/5)*.1]} s={[.077,.02,.072]} mat={m.trim} cast={false}/>)}
    <mesh position={[-2.35,.87,-1.62]}><cylinderGeometry args={[.13,.13,.25,16]}/><primitive object={m.paper} attach="material"/></mesh>
    <mesh position={[-2.35,1.01,-1.62]}><cylinderGeometry args={[.105,.105,.01,16]}/><primitive object={m.rubber} attach="material"/></mesh>
    <Block p={[1.83,1.16,-2.86]} s={[.55,.75,.21]} mat={m.steel}/>
    {Array.from({ length: 12 }, (_,i)=><Block key={'panel'+i} p={[1.66+(i%3)*.17,1.05+Math.floor(i/3)*.15,-2.73]} s={[.08,.07,.03]} mat={i===3?m.amber:m.rubber} cast={false}/>)}
    <Block p={[-2.55,1.71,-2.87]} s={[.71,.62,.07]} mat={m.trim}/>
    <Block p={[-2.55,1.71,-2.82]} s={[.59,.5,.02]} mat={m.paper} cast={false}/>
    <Block p={[-2.05,.9,2.62]} s={[.63,1.72,.43]} mat={m.steel}/>
    {Array.from({ length: 5 }, (_,i)=><Block key={'drawer'+i} p={[-2.04,.33+i*.28,2.375]} s={[.51,.22,.035]} mat={m.trim}/>)}
    <Block p={[1.1, .45, 2.1]} s={[1.02,.9,.63]} mat={m.wood}/>
    {Array.from({ length: 5 }, (_,i)=><Block key={'book'+i} p={[.74+i*.15,1.03,2.1]} s={[.1,.28+(i%2)*.16,.36]} mat={i%2?m.paper:m.steel}/>)}
    <Block p={[-1.85,2.15,-2.86]} s={[.25,.27,.08]} mat={m.trim}/>
    <mesh position={[-1.85,2.16,-2.81]}><circleGeometry args={[.105,24]}/><meshBasicMaterial color="#a7b1a3"/></mesh>
    <Block p={[-.25,2.66,-.1]} s={[1.3,.12,.29]} mat={m.trim}/>
    <mesh position={[-.25,2.57,-.1]}><boxGeometry args={[1.16,.02,.18]}/><meshBasicMaterial color="#d8dfc5" toneMapped={false}/></mesh>
    <Block p={[-.25,2.49,-.1]} s={[.04,.14,.03]} mat={m.trim}/>
    {/* Fixed swivel chair: physical seat makes the seated camera mode legible. */}
    <mesh position={[-.35,.42,.42]} material={m.rubber} castShadow receiveShadow>
      <cylinderGeometry args={[.36,.30,.10,16]}/>
    </mesh>
    <Block p={[-.35,.83,.81]} s={[.64,.76,.12]} mat={m.steel}/>
    <Block p={[-.35,.20,.42]} s={[.065,.40,.065]} mat={m.trim}/>
    <mesh position={[-.35,.05,.42]} material={m.trim}>
      <cylinderGeometry args={[.33,.28,.05,6]}/>
    </mesh>
    {[-1,1].map(side=><Block key={'chairarm'+side} p={[-.35+side*.36,.63,.45]} s={[.055,.065,.48]} mat={m.trim}/>)}
    <Block p={[-2.66,1.5,1.5]} s={[.03,1.55,1.18]} mat={m.trim}/>
    <mesh position={[-2.62,1.5,1.5]} rotation={[0,Math.PI/2,0]}>
      <planeGeometry args={[1.05,1.4]}/>
      <meshPhysicalMaterial color="#537674" transmission={.28} transparent opacity={.59} roughness={.32} metalness={.25}/>
    </mesh>
  </>;
}

function SwingDoor({ doorState, playerPosition, m, audio }) {
  const hinge = useRef(null);
  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, .04);
    const d = doorState.current;
    if (d.phase === 'holding') {
      d.holdFor -= dt;
      if (d.holdFor <= 0) d.phase = 'closing';
    }
    if (d.phase === 'opening' || d.phase === 'closing') {
      const target = d.phase === 'opening' ? DOOR_OPEN_ANGLE : 0;
      const acceleration = (target - d.angle) * 27 - d.velocity * 8.5;
      const nextVelocity = THREE.MathUtils.clamp(d.velocity + acceleration * dt, -3.3, 3.3);
      const nextAngle = THREE.MathUtils.clamp(d.angle + nextVelocity * dt, DOOR_OPEN_ANGLE, 0);
      if (d.phase === 'closing' && doorCloseObstructed(playerPosition.current, nextAngle)) {
        // The closer must reopen, not cut through a person occupying its sweep.
        d.phase = 'opening';
        d.velocity = 0;
      } else {
        d.angle = nextAngle;
        d.velocity = nextVelocity;
        if (Math.abs(d.angle - target) < .012 && Math.abs(d.velocity) < .21) {
          d.angle = target;
          d.velocity = 0;
          if (d.phase === 'opening') {
            d.phase = 'holding';
            d.holdFor = 3.0;
          } else {
            d.phase = 'closed';
            audio?.current?.soundAt(3.16, .94, 360, .18);
          }
        }
      }
    }
    if (hinge.current) hinge.current.rotation.y = d.angle;
  });
  return <group ref={hinge} position={[3.18, 0, .32]}>
    <Block p={[0,1.05,.72]} s={[.105,2.1,1.41]} mat={m.steel}/>
    <Block p={[-.068,1.44,.70]} s={[.05,.47,.73]} mat={m.trim}/>
    <mesh position={[-.108,1.44,.70]} rotation={[0,-Math.PI/2,0]}>
      <planeGeometry args={[.67,.4]}/>
      <meshPhysicalMaterial color="#7e9d9b" transparent opacity={.53} metalness={.22} roughness={.21}/>
    </mesh>
    <group position={[-.18,.93,1.15]}>
      <Block p={[0,0,0]} s={[.10,.09,.19]} mat={m.amber}/>
      <Block p={[-.06,-.035,0]} s={[.05,.06,.25]} mat={m.steel}/>
    </group>
    {/* hinge pins, closer arm, and latch plate add physical cues */}
    {[.22,1.82].map(y => <mesh key={y} position={[0,y,0]}>
      <cylinderGeometry args={[.042,.042,.15,10]}/><primitive attach="material" object={m.trim}/>
    </mesh>)}
    <Block p={[0,2.02,.33]} s={[.10,.10,.52]} mat={m.trim}/>
    <Block p={[0,2.04,1.35]} s={[.11,.12,.17]} mat={m.amber}/>
  </group>;
}

function CCTVFeeds({ m }) {
  const { gl, scene } = useThree();
  const feeds = useRef(null);
  const feed1 = useFBO(320,180,{depthBuffer:true});
  const feed2 = useFBO(320,180,{depthBuffer:true});
  const camera1 = useMemo(()=> {
    const c = new THREE.PerspectiveCamera(56,16/9,.05,23);
    c.position.set(6.3,2.27,2.67); c.lookAt(10.0,1.3,1.4); return c;
  },[]);
  const camera2 = useMemo(()=> {
    const c = new THREE.PerspectiveCamera(54,16/9,.05,17);
    c.position.set(10.4,2.31,2.46); c.lookAt(14.27,1.26,1.53); return c;
  },[]);
  const elapsed = useRef(0), frozen = useRef(false);
  useFrame((_,dt)=>{
    elapsed.current += dt;
    if(elapsed.current < .125) return;
    elapsed.current=0;
    const previous=gl.getRenderTarget();
    if (feeds.current) feeds.current.visible = false;
    try {
      gl.setRenderTarget(feed1);gl.clear();gl.render(scene,camera1);
      if(!frozen.current) {
        gl.setRenderTarget(feed2);gl.clear();gl.render(scene,camera2);
        frozen.current=true;
      }
    } finally {
      gl.setRenderTarget(previous);
      if (feeds.current) feeds.current.visible = true;
    }
  });
  return <group ref={feeds}>
    {[-.96,.32].map((x,i)=><group key={i}>
      <Block p={[x,1.31,-1.99]} s={[1.12,.72,.18]} mat={m.rubber}/>
      <mesh position={[x,1.31,-1.887]}>
        <planeGeometry args={[.98,.55]}/>
        <meshBasicMaterial map={i===0?feed1.texture:feed2.texture} toneMapped={false}/>
      </mesh>
      <Block p={[x,.97,-1.94]} s={[.13,.08,.15]} mat={m.steel}/>
      <Block p={[x,.925,-1.89]} s={[.48,.03,.31]} mat={m.steel}/>
      <mesh position={[x-.43,1.62,-1.879]}><circleGeometry args={[.016,12]}/><meshBasicMaterial color={i?'#ecb46a':'#91e4af'}/></mesh>
    </group>)}
  </group>;
}

function Scene({ lampOn, doorState, playerPosition, audio }) {
  const m = useMaterials();
  return <>
    <color attach="background" args={['#0b1010']}/>
    <fog attach="fog" args={['#0b1010',12,27]}/>
    <hemisphereLight args={['#b8c9b4','#101b1a',.26]}/>
    <spotLight position={[-.25,2.54,-.1]} angle={1.13} intensity={22} distance={8} penumbra={.85} color="#d3dfd0" castShadow shadow-mapSize-width={512} shadow-mapSize-height={512}/>
    <pointLight position={[-.75,1.15,-1.5]} intensity={1.6} distance={3.4} color="#94b6ad"/>
    <LampFixture p={[5.15,2.5,1.55]} on m={m}/>
    <LampFixture p={[9.12,2.5,1.55]} on={lampOn} m={m}/>
    <LampFixture p={[12.91,2.5,1.55]} on m={m}/>
    <Envelope m={m}/>
    <Decor m={m}/>
    <SwingDoor doorState={doorState} playerPosition={playerPosition} audio={audio} m={m}/>
    <CCTVFeeds m={m}/>
    <Block p={[3.26,2.2,1.0]} s={[.19,.15,1.75]} mat={m.trim}/>
    <Block p={[3.34,2.38,1.06]} s={[.18,.12,.26]} mat={m.trim}/>
    {Array.from({length:8},(_,i)=><Block key={'tray'+i} p={[3.8+i*1.25,2.38,-.06]} s={[.3,.06,.21]} mat={m.steel} cast={false}/>)}
    <Block p={[10,1.2,3.0]} s={[1.25,1.4,.14]} mat={m.steel}/>
    <Block p={[10,1.48,2.90]} s={[.89,.55,.05]} mat={m.trim}/>
    <Block p={[5.3,1.26,-.14]} s={[.46,.58,.12]} mat={m.trim}/>
  </>;
}

function Player({ active, panel, selectedFeed, doorState, playerPosition, onFocus, onInteract, onStats, audio }) {
  const { camera } = useThree();
  const keys = useRef({});
  const looking = useRef(new THREE.Vector3()), right = useRef(new THREE.Vector3());
  const lastFocus = useRef(null);
  const savedPose = useRef(null), previousPanel = useRef(null);
  const fpsTime = useRef(0), fpsFrames = useRef(0);
  const seatPosition = useMemo(()=>new THREE.Vector3(-.35,1.35,-.06),[]);
  const lookDrag = useRef({pressed:false,yaw:0,pitch:0});
  const seatTarget = useMemo(()=>new THREE.Vector3(),[]);
  const seatQuaternion = useMemo(()=>new THREE.Quaternion(),[]);
  const seatMatrix = useMemo(()=>new THREE.Matrix4(),[]);
  const seatUp = useMemo(()=>new THREE.Vector3(0,1,0),[]);
  const turnY = useMemo(()=>new THREE.Quaternion(),[]);
  const turnX = useMemo(()=>new THREE.Quaternion(),[]);
  const verticalAxis = useMemo(()=>new THREE.Vector3(0,1,0),[]);
  const horizontalAxis = useMemo(()=>new THREE.Vector3(1,0,0),[]);
  const previousSelected = useRef(null);
  // A Three.Camera faces its local negative Z axis. Matrix4.lookAt generates
  // a camera-compatible orientation; Object3D.lookAt instead points +Z.
  useEffect(()=>{
    camera.position.set(-.2,1.68,1.55);
    camera.rotation.set(0,0,0);
    playerPosition.current.copy(camera.position);
  },[camera,playerPosition]);
  useLayoutEffect(()=>{
    if(panel && !previousPanel.current) {
      savedPose.current = {
        position:camera.position.clone(),
        quaternion:camera.quaternion.clone(),
        fov:camera.fov
      };
    }
    if(!panel && previousPanel.current && savedPose.current) {
      camera.position.copy(savedPose.current.position);
      camera.quaternion.copy(savedPose.current.quaternion);
      camera.fov = savedPose.current.fov;
      camera.updateProjectionMatrix();
      savedPose.current = null;
    }
    previousPanel.current=panel;
    keys.current={};
  },[camera,panel]);
  useEffect(()=>{
    // Free cursor for normal button clicks; hold right mouse to look around
    // the room while the player stays seated. No separate ESC step.
    if(panel!=='camera')return;
    const drag=lookDrag.current;
    drag.pressed=false;
    drag.yaw=0;
    drag.pitch=0;
    const mouseDown=e=>{
      if(e.button===2){e.preventDefault();drag.pressed=true;}
    };
    const mouseUp=e=>{if(e.button===2)drag.pressed=false;};
    const mouseMove=e=>{
      if(!drag.pressed || !(e.buttons & 2))return;
      drag.yaw=THREE.MathUtils.clamp(drag.yaw-(e.movementX||0)*.0035,-1.65,1.65);
      drag.pitch=THREE.MathUtils.clamp(drag.pitch-(e.movementY||0)*.0032,-.75,.8);
    };
    const context=e=>e.preventDefault();
    const cancel=()=>{drag.pressed=false;};
    window.addEventListener('mousedown',mouseDown);
    window.addEventListener('mouseup',mouseUp);
    window.addEventListener('mousemove',mouseMove);
    window.addEventListener('contextmenu',context);
    window.addEventListener('blur',cancel);
    return ()=>{
      window.removeEventListener('mousedown',mouseDown);
      window.removeEventListener('mouseup',mouseUp);
      window.removeEventListener('mousemove',mouseMove);
      window.removeEventListener('contextmenu',context);
      window.removeEventListener('blur',cancel);
    };
  },[panel]);
  useEffect(()=>{
    // Selecting a monitor centers the view on that screen. Right-drag still
    // overrides the base orientation without moving the player's body.
    if(selectedFeed!==previousSelected.current){
      lookDrag.current.yaw=0;
      lookDrag.current.pitch=0;
      previousSelected.current=selectedFeed;
    }
  },[selectedFeed]);
  useEffect(()=>{
    const down = e => {
      if (['KeyW','KeyA','KeyS','KeyD','ShiftLeft','KeyE'].includes(e.code)) e.preventDefault();
      keys.current[e.code] = true;
      if (e.code === 'KeyE' && !e.repeat && active && !panel && document.pointerLockElement) {
        if(lastFocus.current) onInteract(lastFocus.current);
      }
    };
    const up = e=>{ keys.current[e.code] = false; };
    const blur=()=>{keys.current={};};
    window.addEventListener('keydown',down);
    window.addEventListener('keyup',up);
    window.addEventListener('blur',blur);
    return ()=> {
      window.removeEventListener('keydown',down);
      window.removeEventListener('keyup',up);
      window.removeEventListener('blur',blur);
    };
  },[active,panel,onInteract]);
  useFrame((_,rawDt)=>{
    const dt=Math.min(.04,rawDt);
    fpsTime.current+=dt; fpsFrames.current++;
    if(fpsTime.current>=1){onStats(Math.round(fpsFrames.current/fpsTime.current));fpsTime.current=0;fpsFrames.current=0;}
    if (panel === 'camera') {
      const blend=1-Math.exp(-6*dt);
      seatTarget.set(
        selectedFeed==='cam1' ? -.96 : selectedFeed==='cam2' ? .32 : -.32,
        1.32,-1.887
      );
      seatMatrix.lookAt(seatPosition,seatTarget,seatUp);
      seatQuaternion.setFromRotationMatrix(seatMatrix);
      turnY.setFromAxisAngle(verticalAxis,lookDrag.current.yaw);
      turnX.setFromAxisAngle(horizontalAxis,lookDrag.current.pitch);
      seatQuaternion.premultiply(turnY).multiply(turnX);
      camera.position.lerp(seatPosition,blend);
      camera.quaternion.slerp(seatQuaternion,blend);
      camera.fov=THREE.MathUtils.damp(camera.fov,selectedFeed?42:57,6,dt);
      camera.updateProjectionMatrix();
      playerPosition.current.copy(seatPosition);
      if(lastFocus.current){lastFocus.current=null;onFocus(null);}
      return;
    }
    if (!active || panel || !document.pointerLockElement) {
      if(lastFocus.current){lastFocus.current=null;onFocus(null);}
      return;
    }
    camera.getWorldDirection(looking.current);
    looking.current.y=0; looking.current.normalize();
    right.current.crossVectors(looking.current,camera.up).normalize();
    const forward=(keys.current.KeyW?1:0)-(keys.current.KeyS?1:0);
    const sideways=(keys.current.KeyD?1:0)-(keys.current.KeyA?1:0);
    const sum=Math.hypot(forward,sideways);
    if(sum){
      const speed=keys.current.ShiftLeft?3.55:2.18;
      const dx=(looking.current.x*forward+right.current.x*sideways)/sum*speed*dt;
      const dz=(looking.current.z*forward+right.current.z*sideways)/sum*speed*dt;
      const x=camera.position.x,z=camera.position.z;
      if(passageAllowed({x:x+dx,z},doorState.current.angle))camera.position.x+=dx;
      if(passageAllowed({x:camera.position.x,z:z+dz},doorState.current.angle))camera.position.z+=dz;
    }
    playerPosition.current.copy(camera.position);
    const focus=focusTarget({
      x:camera.position.x,z:camera.position.z,fx:looking.current.x,fz:looking.current.z,
      targets:TARGETS
    });
    if(focus!==lastFocus.current) {lastFocus.current=focus;onFocus(focus);}
    audio?.current?.updateListener?.(camera.position,looking.current);
  });
  return !panel ? <PointerLockControls/> : null;
}

function createRoomAudio() {
  const C = window.AudioContext || window.webkitAudioContext;
  if(!C)return null;
  const ctx = new C();
  const mix=ctx.createGain(); mix.gain.value=.34; mix.connect(ctx.destination);
  const base=ctx.createOscillator(), filter=ctx.createBiquadFilter(), level=ctx.createGain();
  base.type='sawtooth';base.frequency.value=58;
  filter.type='lowpass';filter.frequency.value=140;
  level.gain.value=.012;
  base.connect(filter);filter.connect(level);level.connect(mix);base.start();
  const noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);
  const data=noise.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const panner=ctx.createPanner();
  panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=1.9;panner.maxDistance=22;panner.rolloffFactor=1.2;panner.connect(mix);
  const soundAt=(x,z,frequency=480,seconds=.5)=>{
    if(ctx.state==='closed')return;
    panner.positionX.setValueAtTime(x,ctx.currentTime);
    panner.positionY.setValueAtTime(1.4,ctx.currentTime);
    panner.positionZ.setValueAtTime(z,ctx.currentTime);
    const source=ctx.createBufferSource(),bp=ctx.createBiquadFilter(),vol=ctx.createGain();
    source.buffer=noise; bp.type='bandpass';bp.frequency.value=frequency;bp.Q.value=.7;
    source.connect(bp);bp.connect(vol);vol.connect(panner);
    const t=ctx.currentTime;
    vol.gain.setValueAtTime(.001,t);
    vol.gain.linearRampToValueAtTime(.42,t+.015);
    vol.gain.exponentialRampToValueAtTime(.001,t+seconds);
    source.start(t,0,seconds);
    source.stop(t+seconds+.02);
    source.onended=()=>{source.disconnect();bp.disconnect();vol.disconnect();};
  };
  return {
    resume:()=>ctx.resume(),
    soundAt,
    updateListener:(pos,dir)=>{
      if(ctx.state!=='running')return;
      const l=ctx.listener;
      if(l.positionX){l.positionX.value=pos.x;l.positionY.value=pos.y;l.positionZ.value=pos.z;l.forwardX.value=dir.x;l.forwardY.value=0;l.forwardZ.value=dir.z;}
    },
    close:()=>{try{base.stop();}catch{}return ctx.close();}
  };
}

function Surveillance({ lampOn, onLamp, tested, evidence, selected, onSelected, onEvidence, onClose }) {
  const [hint,setHint]=useState(0);
  const [feedback,setFeedback]=useState('');
  function record() {
    if(!tested) {setFeedback('아직 비교 실험이 실시되지 않았다.');return;}
    if(!selected){setFeedback('확인할 카메라를 먼저 선택하세요.');return;}
    const okay=onEvidence(selected);
    setFeedback(okay?'영상 이상에 대한 근거를 근무일지에 기록했다.':'선택한 카메라의 이상을 입증할 근거가 충분하지 않다.');
  }
  return <div className="console-ui" role="dialog" aria-label="실제 CCTV 화면과 연동된 조작 단말기">
    <header className="console-title"><strong>SEORIM / SEATED CONTROL</strong><span>착석 중 · INCIDENT 001 · B1 방화문</span></header>
    <div className="console-status">
      <span>출입 센서 <b>OPEN</b></span><span>CAM 02 보고 <b>CLOSED</b></span>
    </div>
    <div className="console-actions">
      <button className={!selected?'selected':''} onClick={()=>{onSelected(null);setFeedback('');}}>전체 모니터</button>
      <button className={selected==='cam1'?'selected':''} onClick={()=>{onSelected('cam1');setFeedback('');}}>CAM 01 확대</button>
      <button className={selected==='cam2'?'selected':''} onClick={()=>{onSelected('cam2');setFeedback('');}}>CAM 02 확대</button>
      <button onClick={()=>{onLamp();setFeedback('');}}>L-07 점검등 {lampOn?'OFF':'ON'}</button>
      <button onClick={record} disabled={evidence}>영상 이상 기록</button>
      <button className="quiet" onClick={()=>setHint(v=>Math.min(2,v+1))}>힌트</button>
      <button className="quit" onClick={onClose}>의자에서 일어서기</button>
    </div>
    {hint>0 && <p className="console-hint">{hint===1?'서로 다른 두 카메라가 동일한 점검등 L-07을 보여준다.':'점검등을 조작한 뒤 두 화면의 빛이 모두 변하는지 비교해 보세요.'}</p>}
    {(feedback||evidence) && <p className="console-feedback">{feedback||'근무일지에 영상 이상이 기록되었다.'}</p>}
    <p className="console-foot">의자에서 관제 중입니다. 마우스 오른쪽 버튼을 누른 채 움직이면 주변을 둘러볼 수 있습니다. ESC 없이 버튼을 클릭하세요.</p>
  </div>;
}

export default function FirstRoom() {
  const [started,setStarted] = useState(false);
  const [panel,setPanel] = useState(null);
  const [selectedFeed,setSelectedFeed] = useState(null);
  const [focus,setFocus] = useState(null);
  const [lampOn,setLampOn] = useState(true);
  const [tested,setTested] = useState(false);
  const [evidence,setEvidence] = useState(false);
  const [debug,setDebug] = useState(false);
  const [fps,setFps] = useState(null);
  const [resumeHint,setResumeHint] = useState(false);
  const sound=useRef(null), firstCue=useRef(false);
  const doorState=useRef({angle:0,velocity:0,phase:'closed',holdFor:0});
  const playerPosition=useRef(new THREE.Vector3(-.2,1.68,1.55));
  useEffect(()=>{
    const onKey=e=>{if(e.code==='F3'){e.preventDefault();setDebug(v=>!v);}if(e.code==='Escape' && panel)setPanel(null);};
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[panel]);
  useEffect(()=>()=>{sound.current?.close?.();},[]);
  const lockGamePointer=()=>{
    const canvas=document.querySelector('.room-app canvas');
    try {
      const result=canvas?.requestPointerLock?.();
      if(result?.catch)result.catch(()=>setResumeHint(true));
      setResumeHint(false);
    }catch{setResumeHint(true);}
  };
  const start=()=>{
    if(!sound.current)sound.current=createRoomAudio();
    sound.current?.resume();
    setStarted(true);
    lockGamePointer();
  };
  const interact=useCallback((id)=>{
    if(id==='chair'||id==='monitor'||id==='log'||id==='relay'){
      document.exitPointerLock?.();
      setSelectedFeed(null);
      setPanel(id==='log'?'log':'camera');
    }
    if(id==='door'){
      const d=doorState.current;
      if(d.phase==='closed'||d.phase==='closing'){
        d.phase='opening';
        d.velocity=0;
        sound.current?.soundAt(3.1,1.1,480,.16);
      }else{
        d.phase='closing';
        d.holdFor=0;
      }
    }
  },[]);
  const turnLamp=()=>{setLampOn(v=>!v);setTested(true);sound.current?.soundAt(8.5,1.5,760,.15);};
  const noteEvidence=(feed)=>{
    const valid=canRecordVideoMismatch(tested,feed);
    if(valid)setEvidence(true);
    return valid;
  };
  const closePanel=()=>{
    // Mount the FPS control before requesting lock in this same click gesture.
    flushSync(()=>setPanel(null));
    if(evidence&&!firstCue.current){
      firstCue.current=true;
      sound.current?.soundAt(10,1.55,220,.56);
    }
    lockGamePointer();
  };
  const label=TARGETS.find(t=>t.id===focus)?.label;
  return <main className="room-app">
    <Canvas shadows dpr={[1,1.5]} camera={{fov:72,near:.045,far:35,position:[-.2,1.68,1.55]}} gl={{antialias:true,powerPreference:'high-performance'}}>
      <Scene lampOn={lampOn} doorState={doorState} playerPosition={playerPosition} audio={sound}/>
      <Player active={started} panel={panel} selectedFeed={selectedFeed} doorState={doorState} playerPosition={playerPosition}
        onFocus={setFocus} onInteract={interact} onStats={setFps} audio={sound}/>
    </Canvas>
    <div className="vignette" aria-hidden="true"/>
    <div className="top-title">서림주택 / 야간 관리동 <span>03:17 · INCIDENT 001</span></div>
    {started && !panel && <><div className="crosshair" aria-hidden="true">+</div>
      <div className="bottom-instruction">{label ? 'E · '+label : 'WASD 이동 · 마우스 시점 · Shift 달리기 · E 상호작용'}</div>
    </>}
    {debug && <div className="perf-debug">RE:ZERO FIRST ROOM<br/>FPS {fps??'측정 중'}<br/>CCTV 320×180 / ~8fps<br/>괴물 AI 없음</div>}
    {!started && <div className="start-overlay">
      <div className="eyebrow">B∞ RE:ZERO · FIRST INCIDENT V0.4.2-A</div>
      <h1>마지막 야간근무</h1>
      <p>03:17. 지하 방화문 센서에서 열림 신호가 들어왔습니다.<br/>CCTV 화면은 여전히 문이 닫혀 있다고 주장합니다.</p>
      <button onClick={start}>근무 시작</button>
      <small>PC 키보드 + 마우스 전용 · 헤드폰 권장 · ESC 커서 해제</small>
    </div>}
    {panel==='camera'&&<Surveillance lampOn={lampOn} tested={tested} evidence={evidence}
      selected={selectedFeed} onSelected={setSelectedFeed}
      onLamp={turnLamp} onEvidence={noteEvidence} onClose={closePanel}/>}
    {panel==='log'&&<div className="screen-backdrop" role="dialog" aria-modal="true">
      <div className="logbook"><div className="eyebrow">야간근무 일지 · INCIDENT 001</div>
        <h2>열리지 않은 문</h2><p>03:17 — B1 방화문 센서: OPEN</p>
        <p>CAM 02 — 화면: CLOSED</p>
        <p>점검등 테스트: {tested?'실시':'미실시'}</p>
        <p>영상 이상 증거: {evidence?'확보':'미확보'}</p>
        <p className="muted">현장 조사와 사건 종결 기능은 V0.5 개발 대상입니다.</p>
        <button onClick={closePanel}>일지 덮기 / FPS 복귀</button></div>
    </div>}
    {started && !panel && resumeHint && <button className="resume-pointer" onClick={lockGamePointer}>화면 클릭하여 시점 조작 계속</button>}
    <footer>V0.4.2-A · 착석형 관제 검수 빌드 · 공포 사건 미구현</footer>
  </main>;
}
