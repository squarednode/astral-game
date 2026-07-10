import{f as e}from"./math.scalar.functions-BWXNux-o.js";import{t}from"./shaderStore-D-XQlhUT.js";import{t as n}from"./bonesDeclaration-eZsb-J1W.js";import{n as r,t as i}from"./bakedVertexAnimation-7XIMgH6x.js";import{t as a}from"./instancesDeclaration-CJBvtBV5.js";import{t as o}from"./instancesVertex-C-FoRQR1.js";import{t as s}from"./bonesVertex-pbyGCQQC.js";import{t as c}from"./clipPlaneVertexDeclaration-BYIpTPFm.js";import{t as l}from"./clipPlaneVertex-DwkrJYmX.js";import{t as u}from"./fogVertexDeclaration-Bb9kDbrL.js";import{t as d}from"./fogVertex-B90wzaBe.js";import{t as f}from"./vertexColorMixing-DPW6Is9y.js";var p=e({colorVertexShader:()=>_}),m=`colorVertexShader`,h=`attribute vec3 position;
#ifdef VERTEXCOLOR
attribute vec4 color;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#ifdef FOG
uniform mat4 view;
#endif
#include<instancesDeclaration>
uniform mat4 viewProjection;
#ifdef MULTIVIEW
uniform mat4 viewProjectionR;
#endif
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vec4 vColor;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef VERTEXCOLOR
vec4 colorUpdated=color;
#endif
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
vec4 worldPos=finalWorld*vec4(position,1.0);
#ifdef MULTIVIEW
if (gl_ViewID_OVR==0u) {gl_Position=viewProjection*worldPos;} else {gl_Position=viewProjectionR*worldPos;}
#else
gl_Position=viewProjection*worldPos;
#endif
#include<clipPlaneVertex>
#include<fogVertex>
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}`;t.ShadersStore[m]||(t.ShadersStore[m]=h);var g=[n,r,c,u,a,o,s,i,l,d,f];for(let e of g)t.IncludesShadersStore[e.name]||(t.IncludesShadersStore[e.name]=e.shader);var _={name:m,shader:h};export{p as t};