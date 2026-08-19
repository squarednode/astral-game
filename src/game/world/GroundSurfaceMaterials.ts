import {
  Color3,
  DynamicTexture,
  PBRMaterial,
  Scene,
  Texture,
  type Material,
} from '@babylonjs/core';
import { attachGraphicsDiagnostics, graphicsProfile } from '../../engine/graphics/GraphicsQuality';

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
  grass: { base: [47, 91, 40], accent: [82, 126, 58], tile: 4, heightScale: 0, roughness: 0.98, normalStrength: 1.7 },
  dirt: { base: [111, 81, 49], accent: [150, 113, 72], tile: 4, heightScale: 0.038, roughness: 0.94, normalStrength: 2.3 },
  stone: { base: [104, 108, 101], accent: [139, 139, 128], tile: 3, heightScale: 0.048, roughness: 0.88, normalStrength: 2.8 },
  sand: { base: [177, 148, 101], accent: [213, 185, 129], tile: 4, heightScale: 0.026, roughness: 0.98, normalStrength: 1.8 },
};

const sceneCaches = new WeakMap<Scene, Map<string, PBRMaterial>>();

function hash(x: number, y: number, salt: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233 + salt * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function heightAt(kind: GroundSurfaceKind, x: number, y: number, size: number): number {
  const nx = x / size;
  const ny = y / size;
  const noise = hash(x, y, kind.length);
  const broad = hash(Math.floor(x / 18), Math.floor(y / 18), kind.length + 7);
  const medium = hash(Math.floor(x / 7), Math.floor(y / 7), kind.length + 19);
  switch (kind) {
    case 'grass': {
      const mottling = Math.pow(hash(x * 2, y * 3, 13), 3) * 0.2;
      return Math.max(0, Math.min(1, 0.26 + broad * 0.34 + medium * 0.18 + noise * 0.08 + mottling));
    }
    case 'dirt': {
      const pebbles = Math.pow(hash(x * 2, y * 2, 23), 9) * 0.38;
      return Math.max(0, Math.min(1, 0.22 + broad * 0.33 + medium * 0.16 + noise * 0.11 + pebbles));
    }
    case 'stone': {
      const cells = Math.abs(Math.sin(nx * Math.PI * 6) * Math.sin(ny * Math.PI * 5));
      const cracks = cells < 0.10 ? -0.26 : 0.08;
      return Math.max(0, Math.min(1, 0.46 + broad * 0.21 + medium * 0.09 + noise * 0.06 + cracks));
    }
    case 'sand': {
      const ripples = Math.sin((nx * 10 + ny * 3) * Math.PI * 2) * 0.1;
      return Math.max(0, Math.min(1, 0.46 + ripples + broad * 0.14 + medium * 0.05 + noise * 0.03));
    }
  }
}

function pomEnabled(kind: GroundSurfaceKind): boolean {
  const profile = graphicsProfile();
  if (kind === 'grass') return false;
  if (kind === 'dirt') return profile.dirtPom;
  if (kind === 'stone') return profile.stonePom;
  return profile.sandPom;
}

function makeTextures(scene: Scene, kind: GroundSurfaceKind, profile: GroundSurfaceProfile) {
  const quality = graphicsProfile();
  const size = quality.textureSize;
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) heights[y * size + x] = heightAt(kind, x, y, size);

  const albedo = new DynamicTexture(`ground-${kind}-albedo-${quality.quality}`, { width: size, height: size }, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
  const normalHeight = new DynamicTexture(`ground-${kind}-normal-height-${quality.quality}`, { width: size, height: size }, scene, true, Texture.TRILINEAR_SAMPLINGMODE);
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
      const variation = 0.78 + height * 0.28;
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
  albedo.anisotropicFilteringLevel = quality.anisotropy;
  normalHeight.anisotropicFilteringLevel = quality.anisotropy;
  return { albedo, normalHeight };
}

export function groundSurfaceMaterial(scene: Scene, kind: GroundSurfaceKind): PBRMaterial {
  attachGraphicsDiagnostics(scene);
  let cache = sceneCaches.get(scene);
  if (!cache) {
    cache = new Map();
    sceneCaches.set(scene, cache);
  }
  const quality = graphicsProfile();
  const cacheKey = `${kind}:${quality.quality}`;
  const existing = cache.get(cacheKey);
  if (existing) return existing;

  const profile = profiles[kind];
  const textures = makeTextures(scene, kind, profile);
  const material = new PBRMaterial(`ground-${kind}-${quality.quality}`, scene);
  material.albedoTexture = textures.albedo;
  material.bumpTexture = textures.normalHeight;
  material.metallic = 0;
  material.roughness = profile.roughness;
  material.albedoColor = Color3.White();
  const usePom = pomEnabled(kind);
  material.useParallax = usePom;
  material.useParallaxOcclusion = usePom;
  material.parallaxScaleBias = usePom ? profile.heightScale : 0;
  material.backFaceCulling = true;
  cache.set(cacheKey, material);
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
