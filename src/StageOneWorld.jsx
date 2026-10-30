import React from 'react';
import {Text} from '@react-three/drei';
import {STAGE_ONE_SAFE_CENTER} from './stageOneRules.js';
import {GARAGE_HEIGHT,STRUCTURE_WALLS,SERVICE_SHORTCUT} from './garageLayout.js';

function GarageStructures({shortcutOpen=false}){
  return <group>
    {STRUCTURE_WALLS.map((wall,index)=><mesh key={index}
      position={[wall.x,GARAGE_HEIGHT/2,wall.z]}>
      <boxGeometry args={[wall.halfX*2,GARAGE_HEIGHT,wall.halfZ*2]}/>
      <meshStandardMaterial color={index<5?'#4b5557':'#3f494b'} roughness={.94}/>
    </mesh>)}
    <group position={[SERVICE_SHORTCUT.x,shortcutOpen?GARAGE_HEIGHT+1:GARAGE_HEIGHT/2,SERVICE_SHORTCUT.z]}>
      <mesh>
        <boxGeometry args={[SERVICE_SHORTCUT.halfX*2,GARAGE_HEIGHT,SERVICE_SHORTCUT.halfZ*2]}/>
        <meshStandardMaterial color="#47575c" metalness={.58} roughness={.52}/>
      </mesh>
      {Array.from({length:8},(_,i)=><mesh key={i} position={[-.3,-2.55+i*.72,0]}>
        <boxGeometry args={[.04,.07,SERVICE_SHORTCUT.halfZ*2]}/>
        <meshBasicMaterial color="#252f32"/>
      </mesh>)}
    </group>
    <group position={[13.38,2.15,-2]} rotation={[0,Math.PI/2,0]}>
      <mesh><boxGeometry args={[3.8,.5,.12]}/><meshStandardMaterial color="#a58e47" roughness={.82}/></mesh>
      <Text position={[0,0,.07]} fontSize={.19} color="#182022">E · MAINTENANCE {shortcutOpen?'OPEN':'LOCKED'}</Text>
    </group>
    <pointLight position={[-17,4.7,14]} intensity={1.15} distance={12} color="#9fb9ad"/>
    <Text position={[-16.8,2.7,8.22]} fontSize={.38} color="#b8beb2">A · SECURITY</Text>
    <Text position={[0,.04,9]} rotation={[-Math.PI/2,0,0]} fontSize={.65} color="#777d70">B · PARKING</Text>
    <Text position={[17,2.65,-21.25]} fontSize={.27} color="#c6b46f">D · ELECTRICAL</Text>
  </group>;
}

// A physical three-tumbler security safe, in the same realistic industrial
// style as the existing parking-garage cabinet. Reappears inert in loop 02
// so the shared footprint stays visually consistent across both loops.
export default React.memo(function StageOneWorld({floor=1,state=null}){
  const [x,z]=STAGE_ONE_SAFE_CENTER;
  const shortcutOpen=floor===2||Boolean(state?.key);
  return <group>
   <GarageStructures shortcutOpen={shortcutOpen}/>
   <group position={[x,0,z]}>
    <mesh position={[0,.82,0]}>
      <boxGeometry args={[1.42,1.62,1.08]}/>
      <meshStandardMaterial color="#48565a" roughness={.73} metalness={.39}/>
    </mesh>
    <mesh position={[0,.84,.563]}>
      <boxGeometry args={[1.22,1.38,.10]}/>
      <meshStandardMaterial color="#343b3e" roughness={.69} metalness={.5}/>
    </mesh>
    <mesh position={[-.23,.85,.63]} rotation={[Math.PI/2,0,0]}>
      <cylinderGeometry args={[.21,.21,.06,20]}/>
      <meshStandardMaterial color="#8d9184" roughness={.5} metalness={.72}/>
    </mesh>
    <mesh position={[.28,.87,.635]}>
      <boxGeometry args={[.12,.35,.07]}/>
      <meshStandardMaterial color="#929e9e" metalness={.62} roughness={.48}/>
    </mesh>
    {[0,1,2].map(i=><mesh key={i} position={[-.3+i*.3,.41,.635]}>
      <boxGeometry args={[.18,.07,.018]}/>
      <meshBasicMaterial color={floor===1&&state?.tumblers>i?'#96b5a1':'#342c29'}/>
    </mesh>)}
    <Text position={[0,1.8,.58]} fontSize={.15} color="#c3c4b5" anchorX="center">
      {floor===1?'NIGHT SHIFT / SAFE':'SECURITY / SEALED'}
    </Text>
   </group>
  </group>;
});
