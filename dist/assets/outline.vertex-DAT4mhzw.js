import{f as e}from"./math.scalar.functions-BWXNux-o.js";import{t}from"./shaderStore-D-XQlhUT.js";import{t as n}from"./bonesDeclaration-SX_sSZ8J.js";import{t as r}from"./bakedVertexAnimationDeclaration-C-g0vyVW.js";import{t as i}from"./morphTargetsVertexGlobalDeclaration-5vBrbEWU.js";import{t as a}from"./morphTargetsVertexDeclaration-DQ2pBC2E.js";import{t as o}from"./instancesDeclaration-DsiFqYXH.js";import{t as s}from"./morphTargetsVertexGlobal-DuIqJiFY.js";import{t as c}from"./morphTargetsVertex-DCuAuKMQ.js";import{t as l}from"./instancesVertex-Dty6qjVO.js";import{t as u}from"./bonesVertex-CDLHrzx0.js";import{t as d}from"./bakedVertexAnimation-CP3BNGXM.js";import{t as f}from"./clipPlaneVertexDeclaration-B8LM6QZj.js";import{t as p}from"./clipPlaneVertex-DfQm2Zia.js";import{t as m}from"./logDepthDeclaration-BpsZdJ7z.js";import{t as h}from"./logDepthVertex-DSD5XdGw.js";var g=e({outlineVertexShaderWGSL:()=>b}),_=`outlineVertexShader`,v=`attribute position: vec3f;attribute normal: vec3f;
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<morphTargetsVertexGlobalDeclaration>
#include<morphTargetsVertexDeclaration>[0..maxSimultaneousMorphTargets]
#include<clipPlaneVertexDeclaration>
uniform offset: f32;
#include<instancesDeclaration>
uniform viewProjection: mat4x4f;
#ifdef ALPHATEST
varying vUV: vec2f;uniform diffuseMatrix: mat4x4f; 
#ifdef UV1
attribute uv: vec2f;
#endif
#ifdef UV2
attribute uv2: vec2f;
#endif
#endif
#include<logDepthDeclaration>
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input: VertexInputs)->FragmentInputs {var positionUpdated: vec3f=vertexInputs.position;var normalUpdated: vec3f=vertexInputs.normal;
#ifdef UV1
var uvUpdated: vec2f=vertexInputs.uv;
#endif
#ifdef UV2
var uv2Updated: vec2f=vertexInputs.uv2;
#endif
#include<morphTargetsVertexGlobal>
#include<morphTargetsVertex>[0..maxSimultaneousMorphTargets]
var offsetPosition: vec3f=positionUpdated+(normalUpdated*uniforms.offset);
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld*vec4f(offsetPosition,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;
#ifdef ALPHATEST
#ifdef UV1
vertexOutputs.vUV=(uniforms.diffuseMatrix*vec4f(uvUpdated,1.0,0.0)).xy;
#endif
#ifdef UV2
vertexOutputs.vUV=(uniforms.diffuseMatrix*vec4f(uv2Updated,1.0,0.0)).xy;
#endif
#endif
#include<clipPlaneVertex>
#include<logDepthVertex>
}
`;t.ShadersStoreWGSL[_]||(t.ShadersStoreWGSL[_]=v);var y=[n,r,i,a,f,o,m,s,c,l,u,d,p,h];for(let e of y)t.IncludesShadersStoreWGSL[e.name]||(t.IncludesShadersStoreWGSL[e.name]=e.shader);var b={name:_,shader:v};export{g as t};