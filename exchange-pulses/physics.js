// Ideal isotropic exchange, one electron per dot, fixed Sz=+1/2.
// Logical order: singlet12*up3; (2*uud-udu-duu)/sqrt(6).
// State storage: [Re(a), Im(a), Re(b), Im(b)], normalized.
export const AXES={12:[0,0,-1],23:[Math.sqrt(3)/2,0,.5]};
export const INITIAL={zero:[1,0,0,0],one:[0,0,1,0],plus:[Math.SQRT1_2,0,Math.SQRT1_2,0],plusi:[Math.SQRT1_2,0,0,Math.SQRT1_2]};
export function evolve(state,pair,angle){
 if(!AXES[pair]||!Number.isFinite(angle)||state.length!==4||!state.every(Number.isFinite))throw Error('Invalid pulse');
 const [x,,z]=AXES[pair],c=Math.cos(angle/2),s=Math.sin(angle/2),[ar,ai,br,bi]=state;
 // U=cos(angle/2) I - i sin(angle/2) (x X+z Z). Global phase omitted.
 return [c*ar+s*(z*ai+x*bi),c*ai-s*(z*ar+x*br),c*br+s*(x*ai-z*bi),c*bi-s*(x*ar-z*br)];
}
export function observables(state){
 const [ar,ai,br,bi]=state,p0=ar*ar+ai*ai,p1=br*br+bi*bi;
 const amplitudes=[[2*br/Math.sqrt(6),2*bi/Math.sqrt(6)],[ar/Math.sqrt(2)-br/Math.sqrt(6),ai/Math.sqrt(2)-bi/Math.sqrt(6)],[-ar/Math.sqrt(2)-br/Math.sqrt(6),-ai/Math.sqrt(2)-bi/Math.sqrt(6)]];
 const probabilities=amplitudes.map(([r,i])=>r*r+i*i);
 return {bloch:[2*(ar*br+ai*bi),2*(ar*bi-ai*br),p0-p1],logical:[p0,p1],amplitudes,probabilities,spinZ:[1-2*probabilities[2],1-2*probabilities[1],1-2*probabilities[0]]};
}
export function durationNs(angle,frequencyMHz){
 if(!Number.isFinite(angle)||!Number.isFinite(frequencyMHz)||angle<0||frequencyMHz<=0)throw Error('Invalid duration input');
 return 1000*angle/(2*Math.PI*frequencyMHz);
}

// Simultaneous exchange: H_logical/h = (fx X + fz Z)/2, up to identity.
// MHz × ns / 1000 is cycles; the quaternion angle is half the Bloch angle.
export function evolveExchange(state,j12,j23,timeNs){
 if(state.length!==4||!state.every(Number.isFinite)||![j12,j23,timeNs].every(Number.isFinite)||Math.min(j12,j23,timeNs)<0)throw Error('Invalid exchange evolution');
 const fx=Math.sqrt(3)*j23/2,fz=-j12+j23/2,f=Math.hypot(fx,fz);
 if(f===0||timeNs===0)return [...state];
 const half=Math.PI*f*timeNs/1000,c=Math.cos(half),s=Math.sin(half),x=fx/f,z=fz/f,[ar,ai,br,bi]=state;
 return [c*ar+s*(z*ai+x*bi),c*ai-s*(z*ar+x*br),c*br+s*(x*ai-z*bi),c*bi-s*(x*ar-z*br)];
}
