import React,{useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';

// Sampling is OFF by default; when F3 is on it updates React only once per
// ~0.8 second. Real FPS comes from rendered frame intervals, not theoretical
// GPU specs. Surface these measurements instead of claiming untested 60fps.
export default React.memo(function PerformanceSampler({enabled=false,onSample}){
 const {gl}=useThree();
 const clock=useRef({seconds:0,frames:0,slowest:0});
 useFrame((_,delta)=>{
   if(!enabled){clock.current={seconds:0,frames:0,slowest:0};return;}
   const c=clock.current;
   const ms=Math.max(0,delta*1000);
   c.seconds+=Math.min(.25,delta);
   c.frames++;
   c.slowest=Math.max(c.slowest,ms);
   if(c.seconds>=.8){
     onSample?.({
       fps:Math.round(c.frames/c.seconds),
       worstMs:Math.round(c.slowest*10)/10,
       drawCalls:gl.info.render.calls,
       triangles:gl.info.render.triangles,
       pixelRatio:gl.getPixelRatio()
     });
     clock.current={seconds:0,frames:0,slowest:0};
   }
 });
 return null;
});
