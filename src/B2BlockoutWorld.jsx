import React from 'react';
import { Text } from '@react-three/drei';
import { B2_CEILINGS, B2_DOORS, B2_WALLS, B2_ZONES } from './b2Blockout.js';

const material = { color: '#465154', roughness: .94, metalness: .08 };
export default function B2BlockoutWorld({ shortcutOpen = false, shutterOpen = false }) {
  return <group name="B2-V0.14.0-A-blockout">
    <mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[44,60]}/><meshStandardMaterial color="#303738" roughness={.98}/></mesh>
    {B2_WALLS.map(w => <mesh key={w.id} position={[w.x, B2_CEILINGS.general/2, w.z]}>
      <boxGeometry args={[w.halfX*2, B2_CEILINGS.general, w.halfZ*2]}/><meshStandardMaterial {...material}/>
    </mesh>)}
    {B2_DOORS.map(d => {
      const open = d.locked ? shortcutOpen : d.id === 'C-F' || d.id === 'D-F' ? shutterOpen || true : true;
      return <group key={d.id} position={[d.x, open ? B2_CEILINGS.general+.4 : B2_CEILINGS.general/2, d.z]}>
        {!open && <mesh><boxGeometry args={[d.halfX*2, B2_CEILINGS.general, d.halfZ*2]}/><meshStandardMaterial color="#596467" metalness={.55} roughness={.6}/></mesh>}
        <Text position={[0, .18, 0]} rotation={[-Math.PI/2,0,0]} fontSize={.18} color="#b7bcae">{d.id}</Text>
      </group>;
    })}
    {Object.entries(B2_ZONES).map(([id,z]) => <Text key={id} position={[z.center[0], .04, z.center[1]]} rotation={[-Math.PI/2,0,0]} fontSize={.52} color="#777f78">{id} · {z.name.toUpperCase()}</Text>)}
  </group>;
}
