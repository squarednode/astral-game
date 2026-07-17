import type {
  ComponentKey,
  EntityId,
  EntityLifecycleState,
  EntitySnapshot,
  EntityTag,
} from './EntityTypes';

/**
 * Lightweight entity container.
 *
 * Components are plain data or object references. Systems own behavior.
 */
export class Entity {
  private readonly tags = new Set<EntityTag>();
  private readonly components = new Map<ComponentKey, unknown>();
  private lifecycleState: EntityLifecycleState;

  constructor(
    readonly id: EntityId,
    private entityName: string,
    readonly createdAtFrame: number,
    tags: Iterable<EntityTag> = [],
    enabled = true,
  ) {
    for (const tag of tags) this.tags.add(tag);
    this.lifecycleState = enabled ? 'active' : 'disabled';
  }

  get name(): string {
    return this.entityName;
  }

  set name(value: string) {
    this.assertMutable();
    this.entityName = value.trim() || this.id;
  }

  get state(): EntityLifecycleState {
    return this.lifecycleState;
  }

  get isActive(): boolean {
    return this.lifecycleState === 'active';
  }

  get isDestroyed(): boolean {
    return this.lifecycleState === 'destroyed';
  }

  enable(): void {
    this.assertMutable();
    this.lifecycleState = 'active';
  }

  disable(): void {
    this.assertMutable();
    this.lifecycleState = 'disabled';
  }

  markDestroyPending(): void {
    if (this.lifecycleState === 'destroyed') return;
    this.lifecycleState = 'destroy-pending';
  }

  finalizeDestroyed(): void {
    this.lifecycleState = 'destroyed';
    this.tags.clear();
    this.components.clear();
  }

  addTag(tag: EntityTag): this {
    this.assertMutable();
    if (tag.trim()) this.tags.add(tag);
    return this;
  }

  removeTag(tag: EntityTag): boolean {
    this.assertMutable();
    return this.tags.delete(tag);
  }

  hasTag(tag: EntityTag): boolean {
    return this.tags.has(tag);
  }

  hasAllTags(tags: Iterable<EntityTag>): boolean {
    for (const tag of tags) {
      if (!this.tags.has(tag)) return false;
    }
    return true;
  }

  getTags(): readonly EntityTag[] {
    return [...this.tags];
  }

  setComponent<T>(key: ComponentKey, component: T): this {
    this.assertMutable();
    if (!key.trim()) {
      throw new Error('Component key cannot be empty.');
    }
    this.components.set(key, component);
    return this;
  }

  hasComponent(key: ComponentKey): boolean {
    return this.components.has(key);
  }

  getComponent<T>(key: ComponentKey): T | undefined {
    return this.components.get(key) as T | undefined;
  }

  requireComponent<T>(key: ComponentKey): T {
    const component = this.getComponent<T>(key);
    if (component === undefined) {
      throw new Error(
        `Entity "${this.id}" is missing component "${key}".`,
      );
    }
    return component;
  }

  removeComponent<T>(key: ComponentKey): T | undefined {
    this.assertMutable();
    const existing = this.getComponent<T>(key);
    this.components.delete(key);
    return existing;
  }

  getComponentKeys(): readonly ComponentKey[] {
    return [...this.components.keys()];
  }

  snapshot(): EntitySnapshot {
    return {
      id: this.id,
      name: this.name,
      state: this.state,
      tags: this.getTags(),
      componentKeys: this.getComponentKeys(),
      createdAtFrame: this.createdAtFrame,
    };
  }

  private assertMutable(): void {
    if (
      this.lifecycleState === 'destroy-pending' ||
      this.lifecycleState === 'destroyed'
    ) {
      throw new Error(
        `Entity "${this.id}" cannot be modified while ${this.lifecycleState}.`,
      );
    }
  }
}
