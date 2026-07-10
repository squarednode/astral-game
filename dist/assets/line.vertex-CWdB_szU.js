import{f as e}from"./math.scalar.functions-BWXNux-o.js";import{t}from"./shaderStore-D-XQlhUT.js";import{t as n}from"./instancesDeclaration-CJBvtBV5.js";import{t as r}from"./instancesVertex-C-FoRQR1.js";import{t as i}from"./clipPlaneVertexDeclaration-BYIpTPFm.js";import{t as a}from"./clipPlaneVertex-DwkrJYmX.js";import{t as o}from"./sceneUboDeclaration-B5VhSG0v.js";import{t as s}from"./meshUboDeclaration-BmNu2KU_.js";import{t as c}from"./logDepthDeclaration-Dh136csG.js";import{t as l}from"./logDepthVertex-D5IUM6qd.js";var u=`lineVertexDeclaration`,d=`uniform mat4 viewProjection;
#define ADDITIONAL_VERTEX_DECLARATION
`;t.IncludesShadersStore[u]||(t.IncludesShadersStore[u]=d);var f={name:u,shader:d},p=`lineUboDeclaration`,m=`layout(std140,column_major) uniform;
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`;t.IncludesShadersStore[p]||(t.IncludesShadersStore[p]=m);var h={name:p,shader:m},g=e({lineVertexShader:()=>b}),_=`lineVertexShader`,v=`#include<__decl__lineVertex>
#include<instancesDeclaration>
#include<clipPlaneVertexDeclaration>
attribute vec3 position;attribute vec4 normal;uniform float width;uniform float aspectRatio;
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
void main(void) {
#define CUSTOM_VERTEX_MAIN_BEGIN
#include<instancesVertex>
mat4 worldViewProjection=viewProjection*finalWorld;vec4 viewPosition=worldViewProjection*vec4(position,1.0);vec4 viewPositionNext=worldViewProjection*vec4(normal.xyz,1.0);vec2 currentScreen=viewPosition.xy/viewPosition.w;vec2 nextScreen=viewPositionNext.xy/viewPositionNext.w;currentScreen.x*=aspectRatio;nextScreen.x*=aspectRatio;vec2 dir=normalize(nextScreen-currentScreen);vec2 normalDir=vec2(-dir.y,dir.x);normalDir*=width/2.0;normalDir.x/=aspectRatio;vec4 offset=vec4(normalDir*normal.w,0.0,0.0);gl_Position=viewPosition+offset;
#if defined(CLIPPLANE) || defined(CLIPPLANE2) || defined(CLIPPLANE3) || defined(CLIPPLANE4) || defined(CLIPPLANE5) || defined(CLIPPLANE6)
vec4 worldPos=finalWorld*vec4(position,1.0);
#include<clipPlaneVertex>
#endif
#include<logDepthVertex>
#define CUSTOM_VERTEX_MAIN_END
}`;t.ShadersStore[_]||(t.ShadersStore[_]=v);var y=[f,o,s,h,n,i,c,r,a,l];for(let e of y)t.IncludesShadersStore[e.name]||(t.IncludesShadersStore[e.name]=e.shader);var b={name:_,shader:v};export{g as t};