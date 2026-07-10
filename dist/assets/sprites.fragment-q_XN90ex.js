import{f as e}from"./math.scalar.functions-BWXNux-o.js";import{t}from"./shaderStore-D-XQlhUT.js";import{t as n}from"./logDepthDeclaration-Dh136csG.js";import{t as r}from"./fogFragmentDeclaration--w8QPs2M.js";import{t as i}from"./logDepthFragment-C5lxT4l1.js";import{t as a}from"./fogFragment-CKCGTcJi.js";var o=`imageProcessingCompatibility`,s=`#ifdef IMAGEPROCESSINGPOSTPROCESS
gl_FragColor.rgb=pow(gl_FragColor.rgb,vec3(2.2));
#endif
`;t.IncludesShadersStore[o]||(t.IncludesShadersStore[o]=s);var c={name:o,shader:s},l=e({spritesPixelShader:()=>p}),u=`spritesPixelShader`,d=`#ifdef LOGARITHMICDEPTH
#extension GL_EXT_frag_depth : enable
#endif
uniform bool alphaTest;varying vec4 vColor;varying vec2 vUV;uniform sampler2D diffuseSampler;
#include<fogFragmentDeclaration>
#include<logDepthDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
#ifdef PIXEL_PERFECT
vec2 uvPixelPerfect(vec2 uv) {vec2 res=vec2(textureSize(diffuseSampler,0));uv=uv*res;vec2 seam=floor(uv+0.5);uv=seam+clamp((uv-seam)/fwidth(uv),-0.5,0.5);return uv/res;}
#endif
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#ifdef PIXEL_PERFECT
vec2 uv=uvPixelPerfect(vUV);
#else
vec2 uv=vUV;
#endif
vec4 color=texture2D(diffuseSampler,uv);float fAlphaTest=float(alphaTest);if (fAlphaTest != 0.)
{if (color.a<0.95)
discard;}
color*=vColor;
#include<logDepthFragment>
#include<fogFragment>
gl_FragColor=color;
#include<imageProcessingCompatibility>
#define CUSTOM_FRAGMENT_MAIN_END
}`;t.ShadersStore[u]||(t.ShadersStore[u]=d);var f=[r,n,i,a,c];for(let e of f)t.IncludesShadersStore[e.name]||(t.IncludesShadersStore[e.name]=e.shader);var p={name:u,shader:d};export{l as t};