import {logicalZero,logicalOne,logicalSuperposition} from './math.js';
import {build} from './scene.js';
import {INITIAL,AXES,evolve,observables,durationNs} from './physics.js';
const $=id=>document.getElementById(id);
let view;
try{view=build();}catch(error){$('run-status').textContent='3D unavailable';for(const id of ['device','sphere']){const p=document.createElement('p');p.className='error';p.textContent='WebGL 2 is required for the 3D view.';$(id).append(p);}console.error(error);}
let state=[...INITIAL.zero],pair='23',path=[],pulse=null,frame=0,totalNs=0;
const percent=p=>(100*Math.max(0,Math.min(1,p))).toFixed(1)+'%';
function display(){
 const o=observables(state);view?.setState(o,path);
 o.probabilities.forEach((p,i)=>{$('p'+i).textContent=percent(p);$('m'+i).value=p;});
 o.logical.forEach((p,i)=>{$('lp'+i).textContent=percent(p);$('lm'+i).value=p;});
 $('spin-z').textContent=o.spinZ.map(x=>Math.abs(x)<.0005?'0.00':x.toFixed(2)).join(' · ');
 const phase=(Math.atan2(state[3],state[2])-Math.atan2(state[1],state[0]))*180/Math.PI;
 $('phase').textContent=Math.min(...o.logical)<1e-10?'—':(((phase+540)%360)-180).toFixed(1)+'°';
 const ketHTML=o.logical[0]>1-1e-10?logicalZero:o.logical[1]>1-1e-10?logicalOne:logicalSuperposition;
 if($('state-ket').innerHTML!==ketHTML)$('state-ket').innerHTML=ketHTML;
 $('elapsed').textContent=totalNs.toFixed(2)+' ns';
}
function params(){const angle=Number($('angle').value)*Math.PI/180,f=Number($('frequency').value);if(!Number.isFinite(f)||f<1||f>2000||!Number.isFinite(angle)||angle<0||angle>2*Math.PI)throw Error('Use J/h between 1 and 2000 MHz');return {angle,f};}
function settings(){try{const {angle,f}=params();$('angle-out').textContent=$('angle').value+'°';$('duration').textContent=durationNs(angle,f).toFixed(2)+' ns';$('apply').disabled=!!pulse;if(!pulse)$('run-status').textContent='Ready';}catch(e){$('apply').disabled=true;$('duration').textContent='—';$('run-status').textContent=e.message;}}
function selectPair(next){if(pulse)return;if(!AXES[next])throw Error('Invalid pair');pair=next;document.querySelectorAll('[data-pair]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pair===pair)));$('axis-label').textContent='Axis: exchange '+(pair==='12'?'1–2':'2–3');view?.setPair(pair,AXES[pair]);}
function locked(on){for(const el of document.querySelectorAll('#initial,#angle,#frequency,[data-pair],[data-angle],[data-initial]'))el.disabled=on;$('apply').disabled=on;$('pause').disabled=!on;}
function stop(){cancelAnimationFrame(frame);frame=0;pulse=null;view?.setPulsing(false);locked(false);$('pause').textContent='Pause';}
function reset(){stop();document.querySelectorAll('[data-initial]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.initial===$('initial').value)));state=[...INITIAL[$('initial').value]];path=[];totalNs=0;$('run-status').textContent='Ready';settings();display();}
function tick(now){if(!pulse||pulse.paused)return;const fraction=Math.min(1,(now-pulse.started)/pulse.wallMs);state=evolve(pulse.start,pulse.pair,pulse.angle*fraction);totalNs=pulse.baseNs+pulse.ns*fraction;path.push(observables(state).bloch);if(path.length>1000)path.shift();display();if(fraction>=1){stop();$('run-status').textContent='Complete';}else frame=requestAnimationFrame(tick);}
function apply(){if(pulse)return;const {angle,f}=params();const ns=durationNs(angle,f);path=[observables(state).bloch];if(matchMedia('(prefers-reduced-motion: reduce)').matches||angle===0){for(let i=1;i<=64;i++)path.push(observables(evolve(state,pair,angle*i/64)).bloch);state=evolve(state,pair,angle);totalNs+=ns;display();$('run-status').textContent='Complete';return;}
 pulse={start:[...state],pair,angle,ns,baseNs:totalNs,wallMs:Math.max(600,angle/Math.PI*1800),started:performance.now(),paused:false};locked(true);view?.setPulsing(true);$('run-status').textContent='Running';frame=requestAnimationFrame(tick);
}
function pause(){if(!pulse)return;if(!pulse.paused){pulse.paused=true;pulse.pausedAt=performance.now();cancelAnimationFrame(frame);view?.setPulsing(false);$('pause').textContent='Resume';$('run-status').textContent='Paused';}else{pulse.started+=performance.now()-pulse.pausedAt;pulse.paused=false;view?.setPulsing(true);$('pause').textContent='Pause';$('run-status').textContent='Running';frame=requestAnimationFrame(tick);}}
document.querySelectorAll('[data-initial]').forEach(b=>b.addEventListener('click',()=>{$('initial').value=b.dataset.initial;reset();}));
$('apply').addEventListener('click',apply);$('pause').addEventListener('click',pause);$('reset').addEventListener('click',reset);$('initial').addEventListener('change',reset);$('angle').addEventListener('input',settings);$('frequency').addEventListener('input',settings);
document.querySelectorAll('[data-pair]').forEach(b=>b.addEventListener('click',()=>selectPair(b.dataset.pair)));
document.querySelectorAll('[data-angle]').forEach(b=>b.addEventListener('click',()=>{$('angle').value=b.dataset.angle;settings();}));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&pulse&&!pulse.paused)pause();});
selectPair(pair);settings();display();
// Optional WebMCP uses the same visible preparation and pulse actions.
const ctx=document.modelContext;
if(ctx?.registerTool){
 for(const tool of [
 {name:'read_exchange_state',description:'Read current logical amplitudes, Bloch coordinates, probabilities and pulse status.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({state:[...state],...observables(state),pair,totalNs,running:!!pulse&&!pulse.paused})},
 {name:'prepare_exchange_state',description:'Reset the visible explorer to a logical basis or superposition state.',inputSchema:{type:'object',properties:{state:{type:'string',enum:Object.keys(INITIAL)}},required:['state'],additionalProperties:false},execute:input=>{if(!INITIAL[input?.state])throw Error('Invalid initial state');$('initial').value=input.state;reset();return observables(state);}},
 {name:'apply_exchange_pulse',description:'Apply a complete ideal exchange pulse immediately and update both views.',inputSchema:{type:'object',properties:{pair:{type:'string',enum:['12','23']},degrees:{type:'number',minimum:0,maximum:360},frequencyMHz:{type:'number',minimum:1,maximum:2000}},required:['pair','degrees','frequencyMHz'],additionalProperties:false},execute:input=>{if(pulse)throw Error('Pause and reset the active pulse first');if(!AXES[input?.pair]||!Number.isFinite(input.degrees)||input.degrees<0||input.degrees>360||!Number.isFinite(input.frequencyMHz)||input.frequencyMHz<1||input.frequencyMHz>2000)throw Error('Invalid pulse');selectPair(input.pair);$('angle').value=input.degrees;$('frequency').value=input.frequencyMHz;settings();const {angle,f}=params();path=Array.from({length:65},(_,i)=>observables(evolve(state,pair,angle*i/64)).bloch);state=evolve(state,pair,angle);totalNs+=durationNs(angle,f);display();$('run-status').textContent='Complete';return observables(state);}}
 ]){try{Promise.resolve(ctx.registerTool(tool)).catch(console.warn);}catch(error){console.warn(error);}}
}
