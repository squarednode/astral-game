export type AssetId = string;

export type AssetKind =
  | 'mesh'
  | 'material'
  | 'texture'
  | 'audio'
  | 'prefab'
  | 'data'
  | 'other';

export type AssetState =
  | 'registered'
  | 'loading'
  | 'ready'
  | 'failed'
  | 'disposed';

export interface AssetDescriptor {
  readonly id: AssetId;
  readonly kind: AssetKind;
  readonly source?: string;
  readonly tags?: readonly string[];
  readonly persistent?: boolean;
}

export interface AssetSnapshot {
  readonly id: AssetId;
  readonly kind: AssetKind;
  readonly state: AssetState;
  readonly source?: string;
  readonly tags: readonly string[];
  readonly persistent: boolean;
  readonly referenceCount: number;
  readonly error?: string;
}

export interface AssetRegistryStats {
  readonly total: number;
  readonly ready: number;
  readonly loading: number;
  readonly failed: number;
  readonly disposed: number;
  readonly references: number;
  readonly byKind: Readonly<Record<AssetKind, number>>;
}

export type AssetLoader<T> = () => T | Promise<T>;
export type AssetDisposer<T> = (asset: T) => void;
