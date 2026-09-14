// Native MathML keeps equations scalable, accessible, and independent of a CDN.
export const math=(body,block=false)=>`<math xmlns="http://www.w3.org/1998/Math/MathML"${block?' display="block"':''}>${body}</math>`;
export const sub=(base,index)=>`<msub><mi>${base}</mi><mrow>${index}</mrow></msub>`;
export const ket=(value,logical=true)=>`<mrow><mo form="prefix" fence="true" stretchy="false" lspace="0" rspace="0.08em">∣</mo>${logical?`<msub><mrow>${value}</mrow><mi mathvariant="normal">L</mi></msub>`:value}<mo form="postfix" fence="true" stretchy="false" lspace="0" rspace="0">⟩</mo></mrow>`;
export const logicalKet=value=>ket(value);
export const spinMean=`<mrow><mo>⟨</mo>${sub('σ','<mi>z</mi>')}<mo form="postfix" fence="true" stretchy="false" lspace="0" rspace="0">⟩</mo></mrow>`;
export const logicalZero=math(ket('<mn>0</mn>'));
export const logicalOne=math(ket('<mn>1</mn>'));
export const logicalSuperposition=math(`<mi>a</mi>${ket('<mn>0</mn>')}<mo>+</mo><mi>b</mi>${ket('<mn>1</mn>')}`);
