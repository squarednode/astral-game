import { AssetRecord } from './AssetRecord';
import type {
  AssetDescriptor,
  AssetDisposer,
  AssetId,
  AssetKind,
  AssetLoader,
  AssetRegistryStats,
  AssetSnapshot,
} from './AssetTypes';

export class AssetRegistry {
  private readonly assets = new Map<
    AssetId,
    AssetRecord<unknown>
  >();

  register<T>(
    descriptor: AssetDescriptor,
    value: T,
    disposer?: AssetDisposer<T>,
  ): AssetRecord<T> {
    this.assertUnique(descriptor.id);

    const record = new AssetRecord<T>(
      descriptor,
      undefined,
      disposer,
      value,
    );

    this.assets.set(
      descriptor.id,
      record as AssetRecord<unknown>,
    );

    return record;
  }

  registerLoader<T>(
    descriptor: AssetDescriptor,
    loader: AssetLoader<T>,
    disposer?: AssetDisposer<T>,
  ): AssetRecord<T> {
    this.assertUnique(descriptor.id);

    const record = new AssetRecord<T>(
      descriptor,
      loader,
      disposer,
    );

    this.assets.set(
      descriptor.id,
      record as AssetRecord<unknown>,
    );

    return record;
  }

  has(id: AssetId): boolean {
    return this.assets.has(id);
  }

  getRecord<T = unknown>(
    id: AssetId,
  ): AssetRecord<T> | undefined {
    return this.assets.get(id) as AssetRecord<T> | undefined;
  }

  requireRecord<T = unknown>(
    id: AssetId,
  ): AssetRecord<T> {
    const record = this.getRecord<T>(id);
    if (!record) {
      throw new Error(`Asset "${id}" is not registered.`);
    }
    return record;
  }

  get<T = unknown>(id: AssetId): T | undefined {
    return this.getRecord<T>(id)?.get();
  }

  require<T = unknown>(id: AssetId): T {
    return this.requireRecord<T>(id).require();
  }

  load<T = unknown>(id: AssetId): Promise<T> {
    return this.requireRecord<T>(id).load();
  }

  acquire<T = unknown>(id: AssetId): T {
    return this.requireRecord<T>(id).acquire();
  }

  release(id: AssetId): number {
    return this.requireRecord(id).release();
  }

  dispose(id: AssetId, force = false): boolean {
    const record = this.assets.get(id);
    if (!record) return false;

    const disposed = record.dispose(force);
    if (disposed) this.assets.delete(id);
    return disposed;
  }

  disposeUnused(): number {
    let count = 0;

    for (const [id, record] of this.assets) {
      if (record.descriptor.persistent) continue;
      if (record.referenceCount > 0) continue;

      if (record.dispose()) {
        this.assets.delete(id);
        count += 1;
      }
    }

    return count;
  }

  clear(force = true): void {
    for (const record of this.assets.values()) {
      record.dispose(force);
    }
    this.assets.clear();
  }

  all(kind?: AssetKind): readonly AssetSnapshot[] {
    return [...this.assets.values()]
      .filter(record =>
        kind ? record.descriptor.kind === kind : true,
      )
      .map(record => record.snapshot());
  }

  withTag(tag: string): readonly AssetSnapshot[] {
    return [...this.assets.values()]
      .filter(record => record.tags.has(tag))
      .map(record => record.snapshot());
  }

  validate(): readonly string[] {
    const errors: string[] = [];

    for (const record of this.assets.values()) {
      const snapshot = record.snapshot();

      if (!snapshot.id.trim()) {
        errors.push('Asset contains an empty ID.');
      }

      if (snapshot.state === 'failed') {
        errors.push(
          `Asset "${snapshot.id}" failed: ${snapshot.error ?? 'unknown error'}.`,
        );
      }
    }

    return errors;
  }

  stats(): AssetRegistryStats {
    const byKind: Record<AssetKind, number> = {
      mesh: 0,
      material: 0,
      texture: 0,
      audio: 0,
      prefab: 0,
      data: 0,
      other: 0,
    };

    let ready = 0;
    let loading = 0;
    let failed = 0;
    let disposed = 0;
    let references = 0;

    for (const record of this.assets.values()) {
      byKind[record.descriptor.kind] += 1;
      references += record.referenceCount;

      if (record.state === 'ready') ready += 1;
      if (record.state === 'loading') loading += 1;
      if (record.state === 'failed') failed += 1;
      if (record.state === 'disposed') disposed += 1;
    }

    return {
      total: this.assets.size,
      ready,
      loading,
      failed,
      disposed,
      references,
      byKind,
    };
  }

  private assertUnique(id: AssetId): void {
    if (!id.trim()) {
      throw new Error('Asset ID cannot be empty.');
    }

    if (this.assets.has(id)) {
      throw new Error(`Asset ID "${id}" already exists.`);
    }
  }
}
