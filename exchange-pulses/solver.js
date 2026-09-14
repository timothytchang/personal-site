import {evolveExchange} from './physics.js';
const TAU=2*Math.PI;
const wrap=a=>((a%TAU)+TAU)%TAU;
const product=(a,b)=>[
 a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],
 a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],
 a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],
 a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]
];
export function pulseQuaternion({j12,j23,durationNs}){
 const x=Math.sqrt(3)*j23/2,z=-j12+j23/2,f=Math.hypot(x,z),half=Math.PI*f*durationNs/1000;
 return f===0?[1,0,0,0]:[Math.cos(half),Math.sin(half)*x/f,0,Math.sin(half)*z/f];
}
export function solveRotation(axis,angle,maxMHz){
 if(!Array.isArray(axis)||axis.length!==3||!axis.every(Number.isFinite)||!Number.isFinite(angle)||angle<0||angle>TAU||!Number.isFinite(maxMHz)||maxMHz<=0)throw Error('Choose a finite axis, angle from 0 to 360°, and positive exchange limit.');
 const norm=Math.hypot(...axis);if(!Number.isFinite(norm)||norm===0)throw Error('Choose a finite, nonzero axis.');
 const n=axis.map(x=>x/norm),target=[Math.cos(angle/2),...n.map(x=>x*Math.sin(angle/2))];
 const candidates=[];
 // U = Rz(alpha) Rx(beta) Rz(gamma). Pulses run right to left.
 // Rx is available with f12=f23/2; Rz uses positive exchange about -z.
 const [w,x,y,z]=target,plus=Math.atan2(z,w),minus=Math.atan2(y,x),beta=2*Math.atan2(Math.hypot(x,y),Math.hypot(w,z));
 const zPulse=a=>({j12:maxMHz,j23:0,durationNs:1000*wrap(-a)/(TAU*maxMHz)});
 const xPulse={j12:maxMHz/2,j23:maxMHz,durationNs:1000*beta/(TAU*Math.sqrt(3)*maxMHz/2)};
 candidates.push([zPulse(plus-minus),xPulse,zPulse(plus+minus)]);
 // A directly accessible axis needs one pulse. Test both equivalent signs.
 for(const sign of [1,-1]){
  const t=sign===1?angle:TAU-angle;
  const f23=2*sign*n[0]/Math.sqrt(3),f12=f23/2-sign*n[2];
  if(Math.abs(n[1])<1e-14&&f12>=-1e-14&&f23>=-1e-14){
   const scale=maxMHz/Math.max(f12,f23);
   if(Number.isFinite(scale)&&scale>0)candidates.push([{j12:Math.max(0,f12*scale),j23:Math.max(0,f23*scale),durationNs:1000*t/(TAU*scale)}]);
  }
 }
 if(angle===0||angle===TAU)candidates.push([]);
 const clean=seq=>seq.filter(p=>p.durationNs>1e-13).reduce((out,p)=>{
  const last=out.at(-1);if(last&&last.j12===p.j12&&last.j23===p.j23)last.durationNs+=p.durationNs;else out.push({...p});return out;
 },[]);
 const sequences=candidates.map(clean).sort((a,b)=>a.reduce((s,p)=>s+p.durationNs,0)-b.reduce((s,p)=>s+p.durationNs,0));
 const segments=sequences[0],durationNs=segments.reduce((s,p)=>s+p.durationNs,0);
 let actual=[1,0,0,0];for(const p of segments)actual=product(pulseQuaternion(p),actual);
 const d2=Math.min(...[1,-1].map(sign=>actual.reduce((s,q,i)=>s+(q-sign*target[i])**2,0)));
 if(d2>1e-20)throw Error('Pulse verification failed.');
 return {segments,durationNs,target,axis:n,angle,maxMHz,error:Math.max(0,2/3*(d2-d2*d2/4))};
}
export function evolveWaveform(initial,segments,timeNs){
 if(!Number.isFinite(timeNs)||timeNs<0)throw Error('Invalid playback time');
 let state=[...initial],remaining=timeNs;
 for(const pulse of segments){const dt=Math.min(remaining,pulse.durationNs);state=evolveExchange(state,pulse.j12,pulse.j23,dt);remaining-=dt;if(remaining<=0)break;}
 return state;
}
export function exchangeAt(segments,timeNs){
 let start=0;for(let i=0;i<segments.length;i++){const p=segments[i];if(timeNs>=start&&timeNs<start+p.durationNs)return {...p,index:i,start};start+=p.durationNs;}
 return {j12:0,j23:0,index:-1,start};
}
