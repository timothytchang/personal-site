import {minimumTimeSearch} from './optimize.js';
self.onmessage=({data})=>{
 try{const result=minimumTimeSearch(data.axis,data.angle,data.maxMHz,{onProgress:p=>{if(p.done%4===0)self.postMessage({type:'progress',...p});}});self.postMessage({type:'result',result});}
 catch(error){self.postMessage({type:'error',message:error.message});}
};
