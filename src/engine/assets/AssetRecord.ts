import type {
  AssetDescriptor,
  AssetDisposer,
  AssetLoader,
  AssetSnapshot,
  AssetState,
} from './AssetTypes';

export class AssetRecord<T = unknown> {
  private value: T | undefined;
  private assetState: AssetState = 'registered';
  private assetError: string | undefined;
  private references = 0;
  private loadingPromise: Promise<T> | null = null;

  readonly tags: ReadonlySet<string>;

  constructor(
    readonly descriptor: AssetDescriptor,
    private readonly loader?: AssetLoader<T>,
    private readonly disposer?: AssetDisposer<T>,
    initialValue?: T,
  ) {
    this.tags = new Set(descriptor.tags ?? []);

    if (initialValue !== undefined) {
      this.value = initialValue;
      this.assetState = 'ready';
    }
  }

  get state(): AssetState {
    return this.assetState;
  }

  get referenceCount(): number {
    return this.references;
  }

  get error(): string | undefined {
    return this.assetError;
  }

  hasValue(): boolean {
    return this.assetState === 'ready' && this.value !== undefined;
  }

  get(): T | undefined {
    return this.hasValue() ? this.value : undefined;
  }

  require(): T {
    const value = this.get();
    if (value === undefined) {
      throw new Error(
        `Asset "${this.descriptor.id}" is not ready. Current state: ${this.assetState}.`,
      );
    }
    return value;
  }

  async load(): Promise<T> {
    if (this.assetState === 'disposed') {
      throw new Error(
        `Asset "${this.descriptor.id}" has been disposed.`,
      );
    }

    if (this.hasValue()) return this.require();
    if (this.loadingPromise) return this.loadingPromise;
    if (!this.loader) {
      throw new Error(
        `Asset "${this.descriptor.id}" has no loader.`,
      );
    }

    this.assetState = 'loading';
    this.assetError = undefined;

    this.loadingPromise = Promise.resolve()
      .then(() => this.loader!())
      .then(value => {
        this.value = value;
        this.assetState = 'ready';
        this.loadingPromise = null;
        return value;
      })
      .catch(error => {
        this.assetState = 'failed';
        this.assetError =
          error instanceof Error ? error.message : String(error);
        this.loadingPromise = null;
        throw error;
      });

    return this.loadingPromise;
  }

  acquire(): T {
    const value = this.require();
    this.references += 1;
    return value;
  }

  release(): number {
    this.references = Math.max(0, this.references - 1);
    return this.references;
  }

  dispose(force = false): boolean {
    if (this.assetState === 'disposed') return false;
    if (!force && this.references > 0) return false;

    if (this.value !== undefined) {
      this.disposer?.(this.value);
    }

    this.value = undefined;
    this.assetState = 'disposed';
    this.assetError = undefined;
    this.loadingPromise = null;
    this.references = 0;
    return true;
  }

  snapshot(): AssetSnapshot {
    return {
      id: this.descriptor.id,
      kind: this.descriptor.kind,
      state: this.assetState,
      source: this.descriptor.source,
      tags: [...this.tags],
      persistent: this.descriptor.persistent ?? false,
      referenceCount: this.references,
      error: this.assetError,
    };
  }
}
