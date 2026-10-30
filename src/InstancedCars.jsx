import React,{useEffect,useMemo,useRef} from 'react';
import * as THREE from 'three';
import {PARKED_CARS} from './garageLayout.js';
import {VEHICLES} from './vehiclePuzzle.js';
import {plateForCar} from './carPlates.js';

const COLORS=['#36444a','#494d4b','#394842','#4b4b46'];
const temp=new THREE.Object3D();
function createAtlas(cars){
 const cols=8,rows=Math.ceil(cars.length/cols);
 const canvas=document.createElement('canvas');
 canvas.width=192*cols;canvas.height=84*rows;
 const ctx=canvas.getContext('2d');
 cars.forEach((car,i)=>{
   const x=(i%cols)*192,y=Math.floor(i/cols)*84;
   // Retroreflective off-white substrate with dark, high-contrast engraving.
   // No emissive cheating: this still needs the flashlight to read clearly.
   ctx.fillStyle='#d9ddd6';ctx.fillRect(x+3,y+3,186,78);
   ctx.strokeStyle='#435761';ctx.lineWidth=4;
   ctx.strokeRect(x+5,y+5,182,74);
   ctx.fillStyle='#18252b';ctx.font='bold 30px sans-serif';
   ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillText(plateForCar(car.index),x+96,y+43);
 });
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.magFilter=THREE.LinearFilter;
 texture.minFilter=THREE.LinearMipmapLinearFilter;
 texture.anisotropy=2;
 const position=[],uv=[],indices=[];
 cars.forEach((car,i)=>{
   const [x,z]=car.location;
   const left=x-.53,right=x+.53,bottom=.63,top=.99;
   const rear=z+2.292,front=z-2.292;
   const base=i*8;
   // Actual double-sided rear AND front plates, matching the object's body.
   position.push(left,bottom,rear,right,bottom,rear,right,top,rear,left,top,rear);
   position.push(left,bottom,front,right,bottom,front,right,top,front,left,top,front);
   const u0=(i%cols)/cols,u1=(i%cols+1)/cols;
   const v0=1-(Math.floor(i/cols)+1)/rows,v1=1-Math.floor(i/cols)/rows;
   for(let face=0;face<2;face++){
     uv.push(u0,v0,u1,v0,u1,v1,u0,v1);
     const p=base+face*4;
     indices.push(p,p+1,p+2,p,p+2,p+3);
   }
 });
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({
   map:texture,roughness:.79,metalness:.02,side:THREE.DoubleSide
 });
 return {geometry,material,texture};
}
function setInstances(meshes,cars){
 const put=(mesh,index,x,y,z,rotationZ=0,scale=null)=>{
   if(!mesh)return;
   temp.position.set(x,y,z);
   temp.rotation.set(0,0,rotationZ);
   temp.scale.set(scale?.[0]||1,scale?.[1]||1,scale?.[2]||1);
   temp.updateMatrix();mesh.setMatrixAt(index,temp.matrix);
 };
 cars.forEach((car,i)=>{
   const [x,z]=car.location;
   put(meshes.body.current,i,x,.6,z);
   meshes.body.current?.setColorAt(i,new THREE.Color(COLORS[car.index%COLORS.length]));
   put(meshes.roof.current,i,x,1.22,z-.15);
   for(const side of [-1,1])for(const ahead of [-1,1]){
     const j=i*4+(side===-1?0:2)+(ahead===-1?0:1);
     put(meshes.wheels.current,j,x+side*1.23,.34,z+ahead*1.48,Math.PI/2);
   }
   for(let side=0;side<2;side++){
     put(meshes.tail.current,i*2+side,x+(side===0?-.75:.75),.72,z+2.23);
   }
 });
 for(const mesh of Object.values(meshes)){
   if(mesh.current){
     mesh.current.instanceMatrix.needsUpdate=true;
     if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;
     mesh.current.computeBoundingSphere();
   }
 }
}
// A small number of instanced draw calls replace hundreds of disconnected
// geometry/material allocations. Special 317/371/713 cars remain fully modeled.
export default React.memo(function InstancedCars({floor=1}){
 const ordinary=useMemo(()=>PARKED_CARS.map((location,index)=>({location,index}))
   .filter(c=>floor!==2||!VEHICLES.some(v=>v.position[0]===c.location[0]&&v.position[1]===c.location[1])),
 [floor]);
 const meshes={body:useRef(),roof:useRef(),wheels:useRef(),tail:useRef()};
 const atlas=useMemo(()=>createAtlas(ordinary),[ordinary]);
 useEffect(()=>{setInstances(meshes,ordinary);},[ordinary]);
 useEffect(()=>()=>{atlas.geometry.dispose();atlas.material.dispose();atlas.texture.dispose();},[atlas]);
 return <group>
   <instancedMesh ref={meshes.body} args={[null,null,ordinary.length]} castShadow={false}>
     <boxGeometry args={[2.45,.95,4.45]}/>
     <meshStandardMaterial color="#ffffff" roughness={.65} metalness={.17}/>
   </instancedMesh>
   <instancedMesh ref={meshes.roof} args={[null,null,ordinary.length]}>
     <boxGeometry args={[2.14,.57,2.48]}/>
     <meshStandardMaterial color="#1c292e" roughness={.32} metalness={.17}/>
   </instancedMesh>
   <instancedMesh ref={meshes.wheels} args={[null,null,ordinary.length*4]}>
     <cylinderGeometry args={[.33,.33,.16,9]}/>
     <meshStandardMaterial color="#111719" roughness={.99}/>
   </instancedMesh>
   <instancedMesh ref={meshes.tail} args={[null,null,ordinary.length*2]}>
     <boxGeometry args={[.38,.19,.04]}/>
     <meshBasicMaterial color="#6b302e"/>
   </instancedMesh>
   <mesh geometry={atlas.geometry} material={atlas.material}/>
 </group>;
});
