import React from 'react';
import {Text} from '@react-three/drei';
import {STAGE_ONE_SAFE_CENTER} from './stageOneRules.js';

// A physical three-tumbler security safe, in the same realistic industrial
// style as the existing parking-garage cabinet. Reappears inert in loop 02
// so the shared footprint stays visually consistent across both loops.
export default React.memo(function StageOneWorld({floor=1,state=null}){
  const [x,z]=STAGE_ONE_SAFE_CENTER;
  return <group position={[x,0,z]}>
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
  </group>;
});
