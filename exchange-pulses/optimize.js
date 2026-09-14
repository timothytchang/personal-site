import {solveRotation,pulseQuaternion} from './solver.js';
const TAU=2*Math.PI;
const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1]-a[2]*b[2]-a[3]*b[3],a[0]*b[1]+a[1]*b[0]+a[2]*b[3]-a[3]*b[2],a[0]*b[2]-a[1]*b[3]+a[2]*b[0]+a[3]*b[1],a[0]*b[3]+a[1]*b[2]-a[2]*b[1]+a[3]*b[0]];
// Dimensionless time tau=2pi*fmax*t/1000. Each pair is (f12,f23)/fmax.
const CONTROLS=[[1,0],[0,1],[1,1]];
function values(pattern,times){
 const pulses=pattern.map(([a,b],i)=>{const x=Math.sqrt(3)*b/2,z=-a+b/2,g=Math.hypot(x,z),h=g*times[i]/2;return {q:[Math.cos(h),x/g*Math.sin(h),0,z/g*Math.sin(h)],d:[-g/2*Math.sin(h),x/2*Math.cos(h),0,z/2*Math.cos(h)]};});
 const prefix=[[1,0,0,0]],suffix=Array(pulses.length+1);suffix[pulses.length]=[1,0,0,0];
 for(let i=0;i<pulses.length;i++)prefix.push(mul(pulses[i].q,prefix[i]));
 for(let i=pulses.length-1;i>=0;i--)suffix[i]=mul(suffix[i+1],pulses[i].q);
 return {q:prefix.at(-1),columns:pulses.map((p,i)=>mul(suffix[i+1],mul(p.d,prefix[i])))};
}
function linear(matrix,rhs){
 const n=rhs.length,a=matrix.map((row,i)=>[...row,rhs[i]]);
 for(let k=0;k<n;k++){let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;if(Math.abs(a[pivot][k])<1e-18)return null;[a[k],a[pivot]]=[a[pivot],a[k]];const v=a[k][k];for(let j=k;j<=n;j++)a[k][j]/=v;for(let i=0;i<n;i++)if(i!==k){const f=a[i][k];for(let j=k;j<=n;j++)a[i][j]-=f*a[k][j];}}
 return a.map(row=>row[n]);
}
function residual(pattern,times,target,budget){
 const {q,columns}=values(pattern,times),sign=q.reduce((s,x,i)=>s+x*target[i],0)>=0?1:-1;
 const r=[...q.map((x,i)=>x-sign*target[i]),.25*(times.reduce((s,t)=>s+t,0)-budget)];
 return {r,columns:columns.map(c=>[...c,.25]),cost:r.reduce((s,x)=>s+x*x,0)};
}
function fit(pattern,guess,target,budget){
 let times=guess.map(t=>Math.max(0,Math.min(budget,t))),lambda=1e-3,current=residual(pattern,times,target,budget);
 for(let iteration=0;iteration<100;iteration++){
  if(current.cost<1e-22)break;
  const n=times.length,J=current.columns;
  const matrix=J.map((col,i)=>J.map((other,j)=>col.reduce((s,x,k)=>s+x*other[k],0)+(i===j?lambda:0)));
  const step=linear(matrix,J.map(col=>-col.reduce((s,x,k)=>s+x*current.r[k],0)));if(!step)break;
  const next=times.map((t,i)=>Math.max(0,Math.min(budget,t+step[i]))),candidate=residual(pattern,next,target,budget);
  if(candidate.cost<current.cost){times=next;current=candidate;lambda=Math.max(1e-12,lambda*.3);}else{lambda*=8;if(lambda>1e10)break;}
 }
 return {times,cost:current.cost};
}
export function optimizeRotation(axis,angle,maxMHz,{trials=48,onProgress=()=>{}}={}){
 if(!Number.isInteger(trials)||trials<1||trials>128)throw Error('Invalid search budget');
 const baseline=solveRotation(axis,angle,maxMHz),factor=1000/(TAU*maxMHz),lower=Math.min(angle,TAU-angle);
 let best={...baseline,method:'search',baselineDurationNs:baseline.durationNs,improved:false,trials:0},bestTime=baseline.durationNs/factor;
 if(bestTime===0)return best;
 let seed=73429;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const accept=(pattern,times)=>{
  const segments=[];for(let i=0;i<times.length;i++){if(times[i]<=1e-12)continue;const [a,b]=pattern[i],last=segments.at(-1);if(last&&last.j12===a*maxMHz&&last.j23===b*maxMHz)last.durationNs+=times[i]*factor;else segments.push({j12:a*maxMHz,j23:b*maxMHz,durationNs:times[i]*factor});}
  let q=[1,0,0,0];for(const p of segments)q=mul(pulseQuaternion(p),q);
  const d2=Math.min(...[1,-1].map(sign=>q.reduce((s,x,i)=>s+(x-sign*baseline.target[i])**2,0))),durationNs=segments.reduce((s,p)=>s+p.durationNs,0);
  if(d2>1e-18||!Number.isFinite(d2)||durationNs>=best.durationNs-1e-8)return false;
  bestTime=durationNs/factor;best={...baseline,segments,durationNs,error:2/3*(d2-d2*d2/4),method:'search',baselineDurationNs:baseline.durationNs,improved:true,trials:best.trials};return true;
 };
 for(let trial=0;trial<trials;trial++){
  if(bestTime-lower<1e-7)break;
  let pattern,guess;
  if(trial%4===0){
   pattern=baseline.segments.map(p=>[p.j12/maxMHz,p.j23/maxMHz]);guess=baseline.segments.map(p=>p.durationNs/factor);
   for(let i=0;i<3;i++){const at=Math.floor(random()*(pattern.length+1));pattern.splice(at,0,CONTROLS[Math.floor(random()*3)]);guess.splice(at,0,.05);}
  }else{
   pattern=Array.from({length:5+trial%3},()=>CONTROLS[Math.floor(random()*3)]);for(let i=1;i<pattern.length;i++)if(pattern[i]===pattern[i-1])pattern[i]=CONTROLS[(CONTROLS.indexOf(pattern[i])+1)%3];
   guess=pattern.map(()=>.2+random());
  }
  let budget=Math.max(lower+1e-5,bestTime*(trial%3===0?.95:.8)),sum=guess.reduce((s,t)=>s+t,0);guess=guess.map(t=>t*budget/sum);
  let attempt=fit(pattern,guess,baseline.target,budget);
  if(attempt.cost>1e-18){budget=bestTime*.995;attempt=fit(pattern,guess,baseline.target,budget);}
  if(attempt.cost<1e-18){
   accept(pattern,attempt.times);let feasible=attempt.times,upper=feasible.reduce((s,t)=>s+t,0),lo=lower;
   for(let k=0;k<9;k++){budget=(lo+upper)/2;attempt=fit(pattern,feasible.map(t=>t*budget/upper),baseline.target,budget);if(attempt.cost<1e-18){feasible=attempt.times;upper=feasible.reduce((s,t)=>s+t,0);accept(pattern,feasible);}else lo=budget;}
  }
  best.trials=trial+1;onProgress({done:trial+1,total:trials,durationNs:best.durationNs});
 }
 return best;
}

// Free amplitudes and durations: no corner-control assumption. Refinement allows
// bounded time-dependent controls to be approximated by more constant segments.
function freeValues(vector){
 const pulses=[];
 for(let i=0;i<vector.length;i+=3){
  const [t,a,b]=vector.slice(i,i+3),x=Math.sqrt(3)*b/2,z=-a+b/2,g=Math.hypot(x,z),h=g*t/2;
  const k=g<1e-7?t/2-g*g*t**3/48:Math.sin(h)/g;
  const q=[Math.cos(h),k*x,0,k*z],derivatives=[[-g/2*Math.sin(h),x/2*Math.cos(h),0,z/2*Math.cos(h)]];
  for(const [dx,dz] of [[0,-1],[Math.sqrt(3)/2,.5]]){
   const dot=x*dx+z*dz,dk=g<1e-7?-(t**3)*dot/24:(h*Math.cos(h)-Math.sin(h))*dot/g**3;
   derivatives.push([-t/2*k*dot,k*dx+x*dk,0,k*dz+z*dk]);
  }
  pulses.push({q,derivatives});
 }
 const prefix=[[1,0,0,0]],suffix=Array(pulses.length+1);suffix[pulses.length]=[1,0,0,0];
 for(let i=0;i<pulses.length;i++)prefix.push(mul(pulses[i].q,prefix[i]));
 for(let i=pulses.length-1;i>=0;i--)suffix[i]=mul(suffix[i+1],pulses[i].q);
 const columns=pulses.flatMap((p,i)=>p.derivatives.map((d,k)=>[...mul(suffix[i+1],mul(d,prefix[i])),k===0?.25:0]));
 return {q:prefix.at(-1),columns};
}
function freeResidual(vector,target,budget){
 const {q,columns}=freeValues(vector),sign=q.reduce((s,x,i)=>s+x*target[i],0)>=0?1:-1;
 const total=vector.reduce((s,x,i)=>s+(i%3===0?x:0),0),r=[...q.map((x,i)=>x-sign*target[i]),.25*(total-budget)];
 return {r,columns,cost:r.reduce((s,x)=>s+x*x,0)};
}
function freeFit(guess,target,budget){
 let vector=[...guess],lambda=1e-3,current=freeResidual(vector,target,budget);
 for(let iteration=0;iteration<160&&current.cost>1e-22;iteration++){
  const J=current.columns,active=J.map(()=>true);let step;
  // Remove outward directions at active bounds before solving again. Clipping
  // an unconstrained step alone can stall while feasible directions remain.
  for(let pass=0;pass<=J.length;pass++){
   const gram=Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>J.reduce((s,col,j)=>s+(active[j]?col[r]*col[c]:0),0)+(r===c?lambda:0)));
   const y=linear(gram,current.r.map(x=>-x));if(!y)break;
   step=J.map((col,j)=>active[j]?col.reduce((s,v,k)=>s+v*y[k],0):0);
   let blocked=false;
   for(let j=0;j<J.length;j++)if(active[j]&&((vector[j]<=1e-12&&step[j]<0)||(vector[j]>=(j%3===0?budget:1)-1e-12&&step[j]>0))){active[j]=false;blocked=true;}
   if(!blocked)break;
  }
  if(!step)break;
  const next=vector.map((x,j)=>Math.max(0,Math.min(j%3===0?budget:1,x+step[j]))),candidate=freeResidual(next,target,budget);
  if(candidate.cost<current.cost){vector=next;current=candidate;lambda=Math.max(1e-12,lambda*.3);}else{lambda*=8;if(lambda>1e10)break;}
 }
 return {vector,cost:current.cost};
}
export function minimumTimeSearch(axis,angle,maxMHz,{onProgress=()=>{},starts=8,meshes=[8,12,20]}={}){
 if(!Number.isInteger(starts)||starts<1||starts>32||!Array.isArray(meshes)||!meshes.length||meshes.some(n=>!Number.isInteger(n)||n<3||n>32))throw Error('Invalid minimum-time search settings');
 let best=optimizeRotation(axis,angle,maxMHz,{onProgress:p=>onProgress({...p,phase:'Pulse orders'})});
 const factor=1000/(TAU*maxMHz),lower=Math.min(angle,TAU-angle),lowerBoundNs=lower*factor,history=[];
 if(best.durationNs===0)return {...best,lowerBoundNs,meshHistory:history,freeAmplitudes:true};
 let seed=89521;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 function accept(vector){
  const segments=[];
  for(let i=0;i<vector.length;i+=3){if(vector[i]<=1e-12)continue;const scale=Math.max(vector[i+1],vector[i+2]);if(scale===0)continue;const p={durationNs:vector[i]*factor*scale,j12:vector[i+1]/scale*maxMHz,j23:vector[i+2]/scale*maxMHz},last=segments.at(-1);if(last&&last.j12===p.j12&&last.j23===p.j23)last.durationNs+=p.durationNs;else segments.push(p);}
  let q=[1,0,0,0];for(const p of segments)q=mul(pulseQuaternion(p),q);
  const d2=Math.min(...[1,-1].map(sign=>q.reduce((s,x,i)=>s+(x-sign*best.target[i])**2,0))),durationNs=segments.reduce((s,p)=>s+p.durationNs,0);
  if(!Number.isFinite(d2)||d2>1e-18||durationNs>=best.durationNs-1e-8)return;
  best={...best,segments,durationNs,error:2/3*(d2-d2*d2/4),improved:true};
 }
 for(const mesh of meshes){
  for(let start=0;start<starts;start++){
   let pulses;
   if(start%3!==2){
    pulses=best.segments.map(p=>[p.durationNs/factor,p.j12/maxMHz,p.j23/maxMHz]);
    while(pulses.length<mesh){const i=pulses.reduce((at,p,k)=>p[0]>pulses[at][0]?k:at,0),p=pulses[i];pulses.splice(i,1,[p[0]/2,p[1],p[2]],[p[0]/2,p[1],p[2]]);}
    if(start%3===1)pulses=pulses.map(([t,a,b])=>[t,Math.max(0,Math.min(1,a+.2*(random()-.5))),Math.max(0,Math.min(1,b+.2*(random()-.5)))]);
   }else pulses=Array.from({length:mesh},()=>[.2+random(),random(),random()]);
   let upper=best.durationNs/factor,budget=upper*.99,total=pulses.reduce((s,p)=>s+p[0],0);
   let attempt=freeFit(pulses.flatMap(([t,a,b])=>[t*budget/total,a,b]),best.target,budget);
   if(attempt.cost>=1e-18){budget=upper;attempt=freeFit(pulses.flatMap(([t,a,b])=>[t*budget/total,a,b]),best.target,budget);}
   if(attempt.cost<1e-18){
    accept(attempt.vector);let feasible=attempt.vector,hi=feasible.reduce((s,x,i)=>s+(i%3===0?x:0),0),lo=lower;
    for(let k=0;k<12;k++){budget=(lo+hi)/2;attempt=freeFit(feasible.map((x,i)=>i%3===0?x*budget/hi:x),best.target,budget);if(attempt.cost<1e-18){feasible=attempt.vector;hi=feasible.reduce((s,x,i)=>s+(i%3===0?x:0),0);accept(feasible);}else lo=budget;}
   }
   onProgress({phase:'Free amplitudes',done:start+1,total:starts,mesh,durationNs:best.durationNs});
  }
  history.push({mesh,durationNs:best.durationNs});
 }
 return {...best,lowerBoundNs,meshHistory:history,freeAmplitudes:true};
}
