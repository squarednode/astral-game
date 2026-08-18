import {
  Color3,
  DynamicTexture,
  PBRMaterial,
  Scene,
  Texture,
  type Material,
} from '@babylonjs/core';

export type GroundSurfaceKind = 'grass' | 'dirt' | 'stone' | 'sand';

interface GroundSurfaceProfile {
  base: readonly [number, number, number];
  accent: readonly [number, number, number];
  tile: number;
  heightScale: number;
  roughness: number;
  normalStrength: number;
}

const profiles: Readonly<Record<GroundSurfaceKind, GroundSurfaceProfile>> = {
  grass: { base: [56, 101, 45], accent: [91, 132, 61], tile: 6, heightScale: 0.040, roughness: 0.96, normalStrength: 3.0 },
  dirt: { base: [111, 81, 49], accent: [150, 113, 72], tile: 5, heightScale: 0.050, roughness: 0.94, normalStrength: 2.7 },
  stone: { base: [104, 108, 101], accent: [139, 139, 128], tile: 5, heightScale: 0.060, roughness: 0.88, normalStrength: 3.4 },
  sand: { base: [177, 148, 101], accent: [213, 185, 129], tile: 6, heightScale: 0.034, roughness: 0.98, normalStrength: 2.2 },
};

const sceneCaches = new WeakMap<Scene, Map<GroundSurfaceKind, PBRMaterial>>();

function hash(x: number, y: number, salt: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function heightAt(kind: GroundSurfaceKind, x: number, y: number, size: number): number {
  const nx = x / size;
  const ny = y / size;
  const noise = hash(x, y, kind.length);
  const broad = hash(Math.floor(x / 12), Math.floor(y / 12), kind.length + 7);
  const medium = hash(Math.floor(x / 4), Math.floor(y / 4), kind.length + 19);
  switch (kind) {
    case 'grass': {
      const blades = Math.pow(hash(x * 3, y * 5, 13), 5) * 0.42;
      return Math.max(0, Math.min(1, 0.25 + broad * 0.28 + medium * 0.12 + noise * 0.13 + blades));
    }
    case 'dirt': {
      const pebbles = Math.pow(hash(x * 2, y * 2, 23), 8) * 0.5;
      return Math.max(0, Math.min(1, 0.22 + broad * 0.31 + medium * 0.13 + noise * 0.14 + pebbles));
    }
    case 'stone': {
      const cells = Math.abs(Math.sin(nx * Math.PI * 9) * Math.sin(ny * Math.PI * 7));
      const cracks = cells < 0.12 ? -0.30 : 0.10;
      return Math.max(0, Math.min(1, 0.44 + broad * 0.20 + medium * 0.08 + noise * 0.08 + cracks));
    }
    case 'sand': {
      const ripples = Math.sin((nx * 13 + ny * 4) * Math.PI * 2) * 0.12;
      return Math.max(0, Math.min(1, 0.44 + ripples + broad * 0.13 + medium * 0.05 + noise * 0.04));
    }
  }
}

function makeTextures(scene: Scene, kind: GroundSurfaceKind, profile: GroundSurfaceProfile) {
  const size = 512;
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) heights[y * size + x] = heightAt(kind, x, y, size);

  // Mipmaps + trilinear filtering stabilize the procedural detail while the
  // camera/player moves. The previous 256px bilinear/no-mipmap setup softened
  // and shimmered noticeably in motion.
  const albedo = new DynamicTexture(`ground-${kind}-albedo`, { width: size, height: size }, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
  const normalHeight = new DynamicTexture(`ground-${kind}-normal-height`, { width: size, height: size }, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
  normalHeight.hasAlpha = true;

  const albedoContext = albedo.getContext();
  const bumpContext = normalHeight.getContext();
  const albedoImage = albedoContext.getImageData(0, 0, size, size);
  const bumpImage = bumpContext.getImageData(0, 0, size, size);

  const readHeight = (x: number, y: number): number => heights[((y + size) % size) * size + ((x + size) % size)];

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      const pixel = index * 4;
      const height = heights[index];
      const variation = 0.72 + height * 0.38;
      for (let channel = 0; channel < 3; channel += 1) {
        const mixed = profile.base[channel] + (profile.accent[channel] - profile.base[channel]) * height;
        albedoImage.data[pixel + channel] = Math.max(0, Math.min(255, Math.round(mixed * variation)));
      }
      albedoImage.data[pixel + 3] = 255;

      const dx = (readHeight(x + 1, y) - readHeight(x - 1, y)) * profile.normalStrength;
      const dy = (readHeight(x, y + 1) - readHeight(x, y - 1)) * profile.normalStrength;
      const inverseLength = 1 / Math.hypot(dx, dy, 1);
      bumpImage.data[pixel] = Math.round((-dx * inverseLength * 0.5 + 0.5) * 255);
      bumpImage.data[pixel + 1] = Math.round((-dy * inverseLength * 0.5 + 0.5) * 255);
      bumpImage.data[pixel + 2] = Math.round((inverseLength * 0.5 + 0.5) * 255);
      bumpImage.data[pixel + 3] = Math.round(height * 255);
    }
  }

  albedoContext.putImageData(albedoImage, 0, 0);
  bumpContext.putImageData(bumpImage, 0, 0);
  albedo.update(true);
  normalHeight.update(true);
  albedo.wrapU = albedo.wrapV = Texture.WRAP_ADDRESSMODE;
  normalHeight.wrapU = normalHeight.wrapV = Texture.WRAP_ADDRESSMODE;
  albedo.uScale = albedo.vScale = profile.tile;
  normalHeight.uScale = normalHeight.vScale = profile.tile;
  albedo.anisotropicFilteringLevel = 8;
  normalHeight.anisotropicFilteringLevel = 8;
  return { albedo, normalHeight };
}

export function groundSurfaceMaterial(scene: Scene, kind: GroundSurfaceKind): PBRMaterial {
  let cache = sceneCaches.get(scene);
  if (!cache) {
    cache = new Map();
    sceneCaches.set(scene, cache);
  }
  const existing = cache.get(kind);
  if (existing) return existing;

  const profile = profiles[kind];
  const textures = makeTextures(scene, kind, profile);
  const material = new PBRMaterial(`ground-${kind}-pom`, scene);
  material.albedoTexture = textures.albedo;
  material.bumpTexture = textures.normalHeight;
  material.metallic = 0;
  material.roughness = profile.roughness;
  material.albedoColor = Color3.White();
  material.useParallax = true;
  material.useParallaxOcclusion = true;
  material.parallaxScaleBias = profile.heightScale;
  material.backFaceCulling = true;
  cache.set(kind, material);
  return material;
}

export function applyRunnerGroundMaterialTest(scene: Scene, meshes: readonly { name: string; material: Material | null }[]): void {
  const grass = groundSurfaceMaterial(scene, 'grass');
  const dirt = groundSurfaceMaterial(scene, 'dirt');
  for (const mesh of meshes) {
    if (mesh.name.endsWith('-forest-floor')) mesh.material = grass;
    if (mesh.name.includes('-center') || mesh.name.includes('-arm-')) mesh.material = dirt;
  }
}
