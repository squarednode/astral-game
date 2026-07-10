import{t as e}from"./shaderStore-D-XQlhUT.js";import{t}from"./packingFunctions-CYllaKEW.js";import{t as n}from"./clipPlaneFragmentDeclaration-M3T9Lap-.js";import{t as r}from"./clipPlaneFragment-CXLYb7ZJ.js";import{t as i}from"./logDepthDeclaration-Dh136csG.js";import{t as a}from"./fogFragmentDeclaration--w8QPs2M.js";import{t as o}from"./logDepthFragment-C5lxT4l1.js";import{t as s}from"./fogFragment-CKCGTcJi.js";import{t as c}from"./gaussianSplattingFragmentDeclaration-CE2Ol3-0.js";var l=`gaussianSplattingPixelShader`,u=`#include<clipPlaneFragmentDeclaration>
#include<logDepthDeclaration>
#include<fogFragmentDeclaration>
#ifdef GPUPICKER_DEPTH
layout(location=0) out highp vec4 glFragData[2];
#endif
#ifdef GPUPICKER_PACK_DEPTH
#include<packingFunctions>
#endif
varying vec4 vColor;varying vec2 vPosition;
#define CUSTOM_FRAGMENT_DEFINITIONS
#include<gaussianSplattingFragmentDeclaration>
void main () {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
vec4 finalColor=gaussianColor(vColor);
#define CUSTOM_FRAGMENT_BEFORE_FRAGCOLOR
#ifdef GPUPICKER_DEPTH
glFragData[0]=finalColor;
#ifdef GPUPICKER_PACK_DEPTH
glFragData[1]=pack(gl_FragCoord.z);
#else
glFragData[1]=vec4(gl_FragCoord.z,0.0,0.0,1.0);
#endif
#else
gl_FragColor=finalColor;
#endif
#define CUSTOM_FRAGMENT_MAIN_END
}
`;e.ShadersStore[l]||(e.ShadersStore[l]=u);var d=[n,i,a,t,o,s,c,r];for(let t of d)e.IncludesShadersStore[t.name]||(e.IncludesShadersStore[t.name]=t.shader);var f={name:l,shader:u};export{f as gaussianSplattingPixelShader};