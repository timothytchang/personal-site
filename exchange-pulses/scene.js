import {math,ket,sub} from './math.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const orange=0xcc5500;
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
function label(text,position,size=.28,color='#000'){
 const c=document.createElement('canvas');c.width=512;c.height=96;const ctx=c.getContext('2d');ctx.font='48px Helvetica, Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=color;ctx.fillText(text,256,48);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));sprite.position.copy(position);sprite.scale.set(size*512/96,size,1);return sprite;
}
function mathLabel(body,position,size=18){const anchor=new THREE.Object3D();anchor.position.copy(position);const element=document.createElement('span');element.className='math-label';element.setAttribute('aria-hidden','true');element.innerHTML=math(body);element.style.fontSize=size+'px';anchor.userData.mathElement=element;return anchor;}
function line(points,color=0x999999){return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color}));}
function makeView(id,position,target){
 const host=document.getElementById(id),scene=new THREE.Scene();scene.background=new THREE.Color('white');
 const camera=new THREE.OrthographicCamera(-2,2,2,-2,.01,100);camera.position.copy(position);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 host.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label',id==='sphere'?'Rotatable logical Bloch sphere. Drag to orbit, scroll to zoom, arrow keys to rotate.':'Rotatable illustrative Si/SiGe three-dot cutaway. Drag to orbit, scroll to zoom, arrow keys to rotate.');
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(target);controls.enablePan=false;controls.minZoom=.65;controls.maxZoom=2.5;controls.minDistance=id==='sphere'?2.8:5;controls.maxDistance=id==='sphere'?9:22;controls.update();controls.saveState();
 const projected=new THREE.Vector3();
 const render=()=>{renderer.render(scene,camera);scene.traverse(object=>{const element=object.userData.mathElement;if(!element)return;if(!element.parentElement)host.append(element);object.getWorldPosition(projected);projected.project(camera);element.hidden=projected.z < -1 || projected.z > 1; element.style.left=(projected.x*.5+.5)*host.clientWidth+'px';element.style.top=(-projected.y*.5+.5)*host.clientHeight+'px';});};controls.addEventListener('change',render);
 renderer.domElement.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const p=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));p.theta+=e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0;p.phi+=e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0;p.makeSafe();camera.position.copy(new THREE.Vector3().setFromSpherical(p).add(controls.target));controls.update();});
 new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const aspect=w/h,height=Math.max(id==='sphere'?3.25:4.7,(id==='sphere'?3.25:8.2)/aspect);camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();renderer.setSize(w,h);render();}).observe(host);
 return {scene,camera,controls,render};
}
export function build(){
 const device=makeView('device',V(0,13,1.1),V(0,.5,0));
 device.scene.add(new THREE.HemisphereLight(0xffffff,0x777777,2.4));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(0,8,6);device.scene.add(light);const rim=new THREE.DirectionalLight(0xffffff,1.5);rim.position.set(-6,2,-4);device.scene.add(rim);
 const material=(color,metalness=0,roughness=.5)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 const metal=material(0xa7a7a7,.65,.3),inactive=material(0x858585,.55,.35),active=material(orange,.45,.35);
 const box=(parent,position,size,mat)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);o.position.copy(position);parent.add(o);const edge=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:0x555555,transparent:true,opacity:.22}));o.add(edge);return o;};
 // Illustrative exploded layer stack, not a calibrated electrostatic model.
 box(device.scene,V(0,-.5,0),[6.8,.65,3.3],material(0xc6c8ca));
 box(device.scene,V(0,-.13,0),[6.8,.09,3.3],material(0xefb48a));
 const barrier=new THREE.MeshStandardMaterial({color:0xdce1e4,transparent:true,opacity:.16,depthWrite:false,roughness:.4});
 box(device.scene,V(0,.12,0),[6.8,.4,3.3],barrier);
 device.scene.add(label('SiGe',V(-2.5,-.56,1.72),.25),label('Si well',V(2.55,-.13,1.72),.25));
 const gates=new THREE.Group();device.scene.add(gates);
 const clouds=[], spinArrows=[];
 for(const [i,x] of [-2,0,2].entries()){
  const envelope=new THREE.Group();envelope.position.set(x,-.04,0);
  // Nested ellipsoidal surfaces are illustrative localized density envelopes.
  for(let k=0;k<5;k++){const m=new THREE.MeshBasicMaterial({color:orange,transparent:true,opacity:.055+.02*k,depthWrite:false});const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,40,24),m);const s=1-k*.14;mesh.scale.set(.65*s,.15*s,.46*s);envelope.add(mesh);}
  device.scene.add(envelope);clouds.push(envelope);
  const spin=new THREE.ArrowHelper(V(0,1,0),V(x,.02,.42),.65,0x111111,.12,.065);device.scene.add(spin);spinArrows.push(spin);
  box(gates,V(x,.57,0),[.94,.19,.83],metal);
  box(gates,V(x,.57,-.95),[.25,.19,1.1],metal);
  box(gates,V(x,.61,-1.57),[.62,.27,.32],metal);
  gates.add(mathLabel(sub('P','<mn>'+(i+1)+'</mn>'),V(x,.9,-.35)));
  device.scene.add(label('QD '+(i+1),V(x,-.015,.69),.24,'#a34400'));
 }
 const exchanges=[];
 for(const [i,x] of [-1,1].entries()){
  const g=new THREE.Group();gates.add(g);
  const m=i===0?active:inactive;
  exchanges.push([box(g,V(x,.57,.03),[.34,.17,.66],m),box(g,V(x,.57,.85),[.22,.17,1.1],m),box(g,V(x,.61,1.5),[.6,.25,.36],m)]);
  g.add(mathLabel(sub('X','<mn>'+(i===0?'12':'23')+'</mn>'),V(x,.88,1.3)));
 }
 for(const z of [-1.1,1.1])box(device.scene,V(0,.35,z),[5.8,.09,.17],metal);
 gates.position.y=.95;
 document.getElementById('explode').addEventListener('change',e=>{gates.position.y=e.target.checked?.95:0;device.render();});
 document.getElementById('device-reset').addEventListener('click',()=>device.controls.reset());
 const sphere=makeView('sphere',V(.5,.3,6),V(0,0,0));
 // Logical coordinates map (x,y,z) -> Three.js (x,z,-y), preserving handedness.
 const logical=(x,y,z)=>V(x,z,-y);
 // Translucent shaded surface, without great-circle guides.
 sphere.scene.add(new THREE.AmbientLight(0xffffff,2.4));
 const sphereLight=new THREE.DirectionalLight(0xffffff,.45);sphereLight.position.set(-3,5,4);sphere.scene.add(sphereLight);
 const shell=new THREE.Mesh(new THREE.SphereGeometry(1,80,56),new THREE.MeshLambertMaterial({color:0xb7c1c8,transparent:true,opacity:.25,depthWrite:false}));sphere.scene.add(shell);
 for(const [name,end] of [['x',logical(1,0,0)],['y',logical(0,1,0)],['z',logical(0,0,1)]]){
  sphere.scene.add(line([end.clone().multiplyScalar(-1.13),end.clone().multiplyScalar(1.2)],0x999999));
  if(name!=='z')sphere.scene.add(mathLabel('<mi>'+name+'</mi>',end.clone().multiplyScalar(1.35)));
 }
 sphere.scene.add(mathLabel(ket('<mn>0</mn>'),logical(0,0,1.3),22),mathLabel(ket('<mn>1</mn>'),logical(0,0,-1.3),22));
 const stateArrow=new THREE.ArrowHelper(logical(0,0,1),V(0,0,0),1,orange,.10,.055);sphere.scene.add(stateArrow);
 const tip=new THREE.Mesh(new THREE.SphereGeometry(.035,20,16),new THREE.MeshBasicMaterial({color:orange}));tip.position.copy(logical(0,0,1));sphere.scene.add(tip);
 document.getElementById('sphere-reset').addEventListener('click',()=>sphere.controls.reset());
 const trajectory=line([V(0,1,0),V(0,1,0)],orange);sphere.scene.add(trajectory);
 const rotationAxis=line([V(0,-1.15,0),V(0,1.15,0)],0x444444);sphere.scene.add(rotationAxis);
 const pulseMaterials=[inactive.clone(),inactive.clone()];
 const targetTip=new THREE.Mesh(new THREE.SphereGeometry(.048,12,8),new THREE.MeshBasicMaterial({color:0x111111,wireframe:true}));targetTip.visible=false;sphere.scene.add(targetTip);
 function setTarget(bloch){targetTip.visible=Boolean(bloch);if(bloch)targetTip.position.copy(logical(...bloch));sphere.render();}
 function setExchanges(j12,j23,maximum){[j12,j23].forEach((j,i)=>{const strength=Math.max(0,Math.min(1,j/maximum)),mat=pulseMaterials[i];mat.color.copy(inactive.color).lerp(new THREE.Color(orange),strength);mat.emissive.setHex(orange);mat.emissiveIntensity=.16*strength;exchanges[i].forEach(mesh=>mesh.material=mat);});device.render();}
 let selected='23';
 function setPair(pair,axis){selected=pair;exchanges.forEach((list,i)=>list.forEach(mesh=>mesh.material=(pair==='12'?i===0:pair==='23'?i===1:false)?active:inactive));rotationAxis.geometry.dispose();const n=logical(...axis);rotationAxis.geometry=new THREE.BufferGeometry().setFromPoints([n.clone().multiplyScalar(-1.15),n.clone().multiplyScalar(1.15)]);device.render();sphere.render();}
 function setState(o,points){const direction=logical(...o.bloch).normalize();stateArrow.setDirection(direction);tip.position.copy(direction);o.spinZ.forEach((z,i)=>{const arrow=spinArrows[i];arrow.visible=Math.abs(z)>.015;arrow.setDirection(V(0,z<0?-1:1,0));arrow.setLength(Math.max(.02,.65*Math.abs(z)),Math.min(.12,.2*Math.abs(z)),.065);});trajectory.geometry.dispose();trajectory.geometry=new THREE.BufferGeometry().setFromPoints(points.length>1?points.map(p=>logical(...p)):[direction,direction]);device.render();sphere.render();}
 function setPulsing(on){active.emissive.setHex(on?0x803000:0);active.emissiveIntensity=on?.5:0;device.render();}
 device.render();sphere.render();return {setPair,setState,setPulsing,setExchanges,setTarget};
}
