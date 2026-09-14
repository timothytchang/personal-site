import {build} from './scene.js';
import {math} from './math.js';
import {observables,INITIAL} from './physics.js';
import {solveRotation,evolveWaveform,exchangeAt} from './solver.js';
const $=id=>document.getElementById(id),views=build(),inputs=['nx','ny','nz'].map($);
let solution=null,time=0,running=false,lastFrame=0,timer=0,draft=null,engaged=false,worker=null,cancelPending=null,searching=false;
const initial=()=>INITIAL[$('initial').value];
const number=value=>Number(value).toFixed(2);
function stop(){running=false;clearTimeout(timer);$('play').textContent='Play';}
function targetResult(){
 if(!draft)return null;const r=observables(initial()).bloch,n=draft.axis,c=Math.cos(draft.angle),s=Math.sin(draft.angle),dot=n.reduce((v,x,i)=>v+x*r[i],0),cross=[n[1]*r[2]-n[2]*r[1],n[2]*r[0]-n[0]*r[2],n[0]*r[1]-n[1]*r[0]];
 return r.map((v,i)=>c*v+s*cross[i]+(1-c)*dot*n[i]);
}
function display(){
 const segments=solution?.segments??[],duration=solution?.durationNs??0;
 const state=evolveWaveform(initial(),segments,time),points=[];
 if(time>0){const count=Math.min(200,Math.max(2,Math.ceil(160*time/Math.max(duration,1e-12))));for(let i=0;i<=count;i++)points.push(observables(evolveWaveform(initial(),segments,time*i/count)).bloch);}
 views.setState(observables(state),points);views.setTarget(targetResult());
 const active=engaged?exchangeAt(segments,time):{j12:0,j23:0,index:-1};views.setExchanges(active.j12,active.j23,draft?.maxMHz??100);
 $('level12').value=number(active.j12);$('level23').value=number(active.j23);
 $('elapsed').value=number(time)+' ns';$('scrub').value=duration?1000*time/duration:0;
 $('scrub').setAttribute('aria-valuetext',number(time)+' nanoseconds');
 const x=duration?1000*time/duration:0;
 for(const pair of ['12','23']){$('cursor'+pair).setAttribute('x1',x);$('cursor'+pair).setAttribute('x2',x);}
 document.querySelectorAll('[data-pulse]').forEach(row=>row.classList.toggle('active',Number(row.dataset.pulse)===active.index));
}
function plot(){
 const duration=solution?.durationNs??0,maximum=solution?.maxMHz??draft?.maxMHz??100;
 for(const pair of ['12','23']){
  let path='M 0 52',t=0;
  for(const p of solution?.segments??[]){const x=1000*t/duration,y=52-46*p['j'+pair]/maximum;t+=p.durationNs;path+=` L ${x} ${y} L ${1000*t/duration} ${y}`;}
  path+=' L 1000 52';$('wave'+pair).setAttribute('d',path);$('fill'+pair).setAttribute('d',path+' Z');
  $('chart'+pair).setAttribute('aria-label',`Exchange ${pair} waveform, 0 to ${number(maximum)} MHz, ${number(duration)} nanoseconds total`);
 }
 $('ticks').replaceChildren(...[0,.25,.5,.75,1].map(f=>{const span=document.createElement('span');span.textContent=number(f*duration)+(f===1?' ns':'');return span;}));
 $('current-exchange').value='0–'+number(maximum);
}
function availability(){const ready=Boolean(solution);$('solve').hidden=searching;$('solve').disabled=!draft||searching;$('cancel-search').hidden=!searching;$('play').disabled=searching||!draft||(ready&&solution.durationNs===0);$('play').textContent=ready?'Play':'Solve & play';$('reset').disabled=searching||!ready;$('scrub').disabled=searching||!ready||solution.durationNs===0;}
function updateDraft(){
 cancelSearch();stop();solution=null;time=0;engaged=false;draft=null;
 const n=inputs.map(input=>input.value===''?NaN:Number(input.value)),length=Math.hypot(...n),validAxis=Number.isFinite(length)&&length>0;
 const maxMHz=Number($('jmax').value),degrees=$('angle-value').value===''?NaN:Number($('angle-value').value),angle=degrees*Math.PI/180;
 const validAngle=Number.isFinite(degrees)&&degrees>=0&&degrees<=360;
 $('axis-error').hidden=validAxis;$('angle-value').setAttribute('aria-invalid',String(!validAngle));
 document.querySelectorAll('[data-axis]').forEach((button,i)=>button.setAttribute('aria-pressed',String(validAxis&&n[i]>0&&n.every((x,j)=>i===j||x===0))));
 const validLimit=Number.isFinite(maxMHz)&&maxMHz>=1&&maxMHz<=2000;
 $('solve-error').hidden=validLimit&&validAngle;$('solve-error').textContent=!validAngle?'Angle must be 0–360°.':!validLimit?'Maximum exchange must be 1–2000 MHz.':'';
 if(validAxis&&validLimit&&validAngle){draft={axis:n.map(v=>v/length),angle,maxMHz};views.setPair(null,draft.axis);}
 $('solve').disabled=!draft;$('status').textContent=draft?'Ready to solve':'Check target';
 $('duration').value='—';$('gate-error').value='—';$('segment-count').textContent='';$('search-result').textContent='';$('pulse-table').replaceChildren();
 availability();plot();display();
}
function cancelSearch(){
 if(worker)worker.terminate();worker=null;searching=false;
 if(cancelPending){const reject=cancelPending;cancelPending=null;reject(new DOMException('Search cancelled','AbortError'));}
}
function search(baseline){
 searching=true;availability();$('status').textContent='Searching…';
 return new Promise((resolve,reject)=>{
  cancelPending=reject;
  try{worker=new Worker(new URL('./optimizer-worker.js',import.meta.url),{type:'module'});}
  catch(error){searching=false;cancelPending=null;reject(error);return;}
  const job=worker;const finish=()=>{job.terminate();if(worker===job){worker=null;searching=false;cancelPending=null;}};
  job.onmessage=({data})=>{
   if(worker!==job)return;
   if(data.type==='progress'){$('status').textContent=(data.mesh?data.mesh+' segments · ':'Searching ')+data.done+'/'+data.total;return;}
   finish();if(data.type==='result')resolve(data.result);else reject(Error(data.message));
  };
  job.onerror=()=>{if(worker!==job)return;finish();reject(Error('Search unavailable'));};
  worker.postMessage({axis:baseline.axis,angle:baseline.angle,maxMHz:baseline.maxMHz});
 });
}
function renderSolution(){
 time=0;engaged=false;
 $('duration').value=number(solution.durationNs);const [coefficient,exponent]=solution.error.toExponential(2).split('e');
 const power=solution.error<1e-14?-14:Number(exponent);
 $('gate-error').innerHTML=math((solution.error<1e-14?'<mo>&lt;</mo>':'<mn>'+coefficient+'</mn><mo>×</mo>')+'<msup><mn>10</mn><mrow>'+(power<0?'<mo>−</mo>':'')+'<mn>'+Math.abs(power)+'</mn></mrow></msup>');
 $('segment-count').textContent=solution.segments.length+(solution.segments.length===1?' pulse':' pulses');
 $('search-result').textContent=solution.method==='search'?(solution.improved?'Best found · '+(100*(1-solution.durationNs/solution.baselineDurationNs)).toFixed(1)+'% shorter':'No shorter sequence found'):'';
 if(Number.isFinite(solution.lowerBoundNs))$('search-result').textContent+=' · Lower bound '+number(solution.lowerBoundNs)+' ns';
 $('status').textContent=solution.durationNs===0?'Identity':'Ready';$('solve-error').hidden=true;
 let start=0;$('pulse-table').replaceChildren(...solution.segments.map((p,i)=>{const row=document.createElement('tr');row.dataset.pulse=i;for(const v of [i+1,number(start),number(p.durationNs),number(p.j12),number(p.j23)]){const td=document.createElement('td');td.textContent=v;row.append(td);}start+=p.durationNs;return row;}));
 availability();plot();display();
}
async function solve(){
 cancelSearch();stop();if(!draft)return;
 const requested=draft;
 try{
  const baseline=solveRotation(draft.axis,draft.angle,draft.maxMHz);solution=baseline;renderSolution();
  if($('method').value==='search'&&baseline.durationNs>0){
   try{const result=await search(baseline);if(draft!==requested)return;solution=result;renderSolution();}
   catch(error){if(error.name==='AbortError')return false;solution=baseline;renderSolution();$('search-result').textContent='Search unavailable · exact sequence kept';}
  }else if($('method').value==='search'){$('search-result').textContent='Identity · zero duration';}
  return true;
 }catch(error){solution=null;$('solve-error').textContent=error.message;$('solve-error').hidden=false;$('status').textContent='Could not solve';availability();}
}
$('cancel-search').addEventListener('click',()=>{cancelSearch();if(solution)renderSolution();$('search-result').textContent='Search cancelled · exact sequence kept';});
function playbackError(error){stop();$('status').textContent='Playback error';$('solve-error').textContent='Playback stopped: '+error.message;$('solve-error').hidden=false;}
function frame(){
 if(!running||!solution)return;
 try{
  const stamp=performance.now(),dt=Math.max(0,(stamp-lastFrame)/1000);lastFrame=stamp;
  time=Math.min(solution.durationNs,time+dt*solution.durationNs/6*Number($('speed').value));display();
  if(time>=solution.durationNs){stop();$('status').textContent='Complete';}else timer=setTimeout(frame,1000/30);
 }catch(error){playbackError(error);}
}
$('play').addEventListener('click',async()=>{
 if(running){stop();$('status').textContent='Paused';return;}
 const requested=draft;if(!solution){const completed=await solve();if(!completed)return;}
 if(draft!==requested||searching)return;
 if(!solution||!solution.durationNs)return;
 if(time>=solution.durationNs)time=0;
 engaged=true;running=true;lastFrame=performance.now();$('play').textContent='Pause';$('status').textContent='Playing';try{display();timer=setTimeout(frame,0);}catch(error){playbackError(error);}
});
$('reset').addEventListener('click',()=>{stop();time=0;engaged=false;$('status').textContent=solution?.durationNs?'Ready':'Identity';display();});
function seek(fraction){if(!solution)return;stop();engaged=true;time=Math.max(0,Math.min(1,fraction))*solution.durationNs;$('status').textContent=time>=solution.durationNs?'Complete':'Paused';display();}
$('scrub').addEventListener('input',e=>seek(Number(e.target.value)/1000));
for(const pair of ['12','23'])$('chart'+pair).addEventListener('pointerdown',e=>{const chart=e.currentTarget,rect=chart.getBoundingClientRect();seek((e.clientX-rect.left)/rect.width);});
inputs.forEach(input=>input.addEventListener('input',updateDraft));
document.querySelectorAll('[data-axis]').forEach((button,i)=>button.addEventListener('click',()=>{inputs.forEach((input,j)=>input.value=Number(i===j));updateDraft();}));
$('method').addEventListener('change',updateDraft);$('angle').addEventListener('input',()=>{$('angle-value').value=$('angle').value;updateDraft();});
$('angle-value').addEventListener('input',()=>{const v=$('angle-value').valueAsNumber;if(Number.isFinite(v)&&v>=0&&v<=360)$('angle').value=String(v);updateDraft();});$('jmax').addEventListener('input',updateDraft);$('solve').addEventListener('click',solve);
$('initial').addEventListener('change',()=>{stop();time=0;engaged=false;$('status').textContent=solution?'Ready':'Ready to solve';display();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){stop();$('status').textContent='Paused';}});
$('explode').dispatchEvent(new Event('change'));
updateDraft();solve();
