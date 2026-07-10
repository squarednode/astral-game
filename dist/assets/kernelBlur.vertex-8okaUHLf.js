import{f as e}from"./math.scalar.functions-BWXNux-o.js";import{t}from"./shaderStore-D-XQlhUT.js";import{t as n}from"./kernelBlurVaryingDeclaration-DP2Wr9Oc.js";var r=`kernelBlurVertex`,i=`sampleCoord{X}=sampleCenter+delta*KERNEL_OFFSET{X};`;t.IncludesShadersStore[r]||(t.IncludesShadersStore[r]=i);var a={name:r,shader:i},o=e({kernelBlurVertexShader:()=>u}),s=`kernelBlurVertexShader`,c=`attribute vec2 position;uniform vec2 delta;varying vec2 sampleCenter;
#include<kernelBlurVaryingDeclaration>[0..varyingCount]
const vec2 madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
sampleCenter=(position*madd+madd);
#include<kernelBlurVertex>[0..varyingCount]
gl_Position=vec4(position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}`;t.ShadersStore[s]||(t.ShadersStore[s]=c);var l=[n,a];for(let e of l)t.IncludesShadersStore[e.name]||(t.IncludesShadersStore[e.name]=e.shader);var u={name:s,shader:c};export{o as t};