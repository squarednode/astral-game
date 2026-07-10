import{f as e}from"./math.scalar.functions-BWXNux-o.js";import{t}from"./shaderStore-D-XQlhUT.js";import{t as n}from"./helperFunctions-B4ayNyfM.js";var r=e({copyTextureToTexturePixelShader:()=>s}),i=`copyTextureToTexturePixelShader`,a=`uniform float conversion;uniform sampler2D textureSampler;uniform float lodLevel;varying vec2 vUV;
#include<helperFunctions>
void main(void) 
{
#ifdef NO_SAMPLER
vec4 color=texelFetch(textureSampler,ivec2(gl_FragCoord.xy),0);
#else
vec4 color=textureLod(textureSampler,vUV,lodLevel);
#endif
#ifdef DEPTH_TEXTURE
gl_FragDepth=color.r;
#else
if (conversion==1.) {color=toLinearSpace(color);} else if (conversion==2.) {color=toGammaSpace(color);}
gl_FragColor=color;
#endif
}
`;t.ShadersStore[i]||(t.ShadersStore[i]=a);var o=[n];for(let e of o)t.IncludesShadersStore[e.name]||(t.IncludesShadersStore[e.name]=e.shader);var s={name:i,shader:a};export{r as t};