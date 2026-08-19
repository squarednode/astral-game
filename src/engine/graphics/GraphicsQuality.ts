import type { Engine, Scene } from '@babylonjs/core';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface GraphicsQualityProfile {
  quality: GraphicsQuality;
  textureSize: 256 | 512;
  anisotropy: number;
  terrainSubdivisions: number;
  dressingDensity: number;
  dirtPom: boolean;
  stonePom: boolean;
  sandPom: boolean;
}

const STORAGE_KEY = 'astral.graphics-quality';

const PROFILES: Readonly<Record<GraphicsQuality, GraphicsQualityProfile>> = {
  low: { quality: 'low', textureSize: 256, anisotropy: 2, terrainSubdivisions: 12, dressingDensity: 0.35, dirtPom: false, stonePom: false, sandPom: false },
  medium: { quality: 'medium', textureSize: 512, anisotropy: 4, terrainSubdivisions: 16, dressingDensity: 0.68, dirtPom: true, stonePom: true, sandPom: false },
  high: { quality: 'high', textureSize: 512, anisotropy: 8, terrainSubdivisions: 20, dressingDensity: 1, dirtPom: true, stonePom: true, sandPom: true },
};

function storedQuality(): GraphicsQuality | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'low' || value === 'medium' || value === 'high' ? value : null;
  } catch {
    return null;
  }
}

function detectQuality(): GraphicsQuality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory ?? 8;
  const cores = nav.hardwareConcurrency ?? 8;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  if (memory <= 4 || cores <= 4) return 'low';
  if (memory >= 8 && cores >= 8 && dpr <= 2) return 'high';
  return 'medium';
}

export function graphicsQuality(): GraphicsQuality {
  return storedQuality() ?? detectQuality();
}

export function graphicsProfile(): GraphicsQualityProfile {
  return PROFILES[graphicsQuality()];
}

export function setGraphicsQuality(value: GraphicsQuality | 'auto'): void {
  try {
    if (value === 'auto') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Persistence is optional in restricted/private browser contexts.
  }
  window.location.reload();
}

let diagnosticsAttached = false;

export function attachGraphicsDiagnostics(scene: Scene): void {
  if (diagnosticsAttached || typeof document === 'undefined') return;
  diagnosticsAttached = true;

  const engine = scene.getEngine();
  const panel = document.createElement('div');
  panel.id = 'astral-render-diagnostics';
  Object.assign(panel.style, {
    position: 'fixed', right: '10px', bottom: '10px', zIndex: '9999', padding: '7px 9px', borderRadius: '7px',
    background: 'rgba(5, 8, 14, 0.78)', color: '#dce8ff', font: '11px/1.35 monospace', whiteSpace: 'pre',
  });

  const output = document.createElement('div');
  const select = document.createElement('select');
  Object.assign(select.style, { marginTop: '5px', width: '100%', font: '11px monospace' });
  const stored = storedQuality();
  const entries: readonly (readonly [GraphicsQuality | 'auto', string])[] = [
    ['auto', `Auto (${detectQuality()})`], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High'],
  ];
  for (const [value, label] of entries) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    option.selected = value === (stored ?? 'auto');
    select.appendChild(option);
  }
  select.addEventListener('change', () => setGraphicsQuality(select.value as GraphicsQuality | 'auto'));
  panel.append(output, select);
  document.body.appendChild(panel);

  const getGlInfo = (engine as Engine & { getGlInfo?: () => { renderer?: string } }).getGlInfo;
  const renderer = typeof getGlInfo === 'function' ? getGlInfo.call(engine)?.renderer ?? 'renderer unavailable' : 'renderer unavailable';

  const update = (): void => {
    output.textContent = [
      `${engine.getFps().toFixed(0)} FPS  |  ${graphicsQuality().toUpperCase()}`,
      `${engine.getRenderWidth()}x${engine.getRenderHeight()}  DPR ${window.devicePixelRatio.toFixed(2)}`,
      `scale ${engine.getHardwareScalingLevel().toFixed(2)}`,
      renderer,
    ].join('\n');
  };
  update();
  window.setInterval(update, 500);

  (globalThis as typeof globalThis & { __astralGraphics?: unknown }).__astralGraphics = {
    quality: graphicsQuality,
    profile: graphicsProfile,
    setQuality: setGraphicsQuality,
  };
}
