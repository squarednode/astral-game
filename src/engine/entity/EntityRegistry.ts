import { Entity } from './Entity';
import type {
  ComponentKey,
  CreateEntityOptions,
  EntityId,
  EntitySnapshot,
  EntityTag,
} from './EntityTypes';

export interface EntityRegistryStats {
  total: number;
  active: number;
  disabled: number;
  destroyPending: number;
}

/**
 * Central authority for entity identity, lookup, queries, and lifecycle.
 *
 * Destruction is deferred until flushDestroyed() so systems may safely iterate
 * registry queries during a frame.
 */
export class EntityRegistry {
  private readonly entities = new Map<EntityId, Entity>();
  private readonly pendingDestroy = new Set<EntityId>();
  private nextSequence = 1;
  private frame = 0;

  beginFrame(frame: number): void {
    this.frame = Math.max(0, Math.floor(frame));
  }

  create(options: CreateEntityOptions = {}): Entity {
    const id = options.id ?? this.generateId();
    if (this.entities.has(id)) {
      throw new Error(`Entity ID "${id}" already exists.`);
    }

    const entity = new Entity(
      id,
      options.name?.trim() || id,
      this.frame,
      options.tags,
      options.enabled ?? true,
    );

    this.entities.set(id, entity);
    return entity;
  }

  has(id: EntityId): boolean {
    return this.entities.has(id);
  }

  get(id: EntityId): Entity | undefined {
    return this.entities.get(id);
  }

  require(id: EntityId): Entity {
    const entity = this.get(id);
    if (!entity) {
      throw new Error(`Entity "${id}" does not exist.`);
    }
    return entity;
  }

  destroy(id: EntityId): boolean {
    const entity = this.entities.get(id);
    if (!entity || entity.isDestroyed) return false;

    entity.markDestroyPending();
    this.pendingDestroy.add(id);
    return true;
  }

  flushDestroyed(
    onDestroy?: (entity: Entity) => void,
  ): number {
    let count = 0;

    for (const id of this.pendingDestroy) {
      const entity = this.entities.get(id);
      if (!entity) continue;

      onDestroy?.(entity);
      entity.finalizeDestroyed();
      this.entities.delete(id);
      count += 1;
    }

    this.pendingDestroy.clear();
    return count;
  }

  all(includeInactive = true): readonly Entity[] {
    const result = [...this.entities.values()];
    return includeInactive
      ? result
      : result.filter(entity => entity.isActive);
  }

  withTag(
    tag: EntityTag,
    includeInactive = false,
  ): readonly Entity[] {
    return this.all(includeInactive).filter(entity =>
      entity.hasTag(tag),
    );
  }

  withTags(
    tags: Iterable<EntityTag>,
    includeInactive = false,
  ): readonly Entity[] {
    const required = [...tags];
    return this.all(includeInactive).filter(entity =>
      entity.hasAllTags(required),
    );
  }

  withComponent<T = unknown>(
    key: ComponentKey,
    includeInactive = false,
  ): readonly Entity[] {
    return this.all(includeInactive).filter(entity =>
      entity.hasComponent(key),
    );
  }

  query(
    tags: Iterable<EntityTag> = [],
    componentKeys: Iterable<ComponentKey> = [],
    includeInactive = false,
  ): readonly Entity[] {
    const requiredTags = [...tags];
    const requiredComponents = [...componentKeys];

    return this.all(includeInactive).filter(entity => {
      if (!entity.hasAllTags(requiredTags)) return false;
      return requiredComponents.every(key =>
        entity.hasComponent(key),
      );
    });
  }

  snapshots(): readonly EntitySnapshot[] {
    return this.all().map(entity => entity.snapshot());
  }

  stats(): EntityRegistryStats {
    let active = 0;
    let disabled = 0;
    let destroyPending = 0;

    for (const entity of this.entities.values()) {
      if (entity.state === 'active') active += 1;
      if (entity.state === 'disabled') disabled += 1;
      if (entity.state === 'destroy-pending') {
        destroyPending += 1;
      }
    }

    return {
      total: this.entities.size,
      active,
      disabled,
      destroyPending,
    };
  }

  clear(
    onDestroy?: (entity: Entity) => void,
  ): void {
    for (const entity of this.entities.values()) {
      onDestroy?.(entity);
      entity.finalizeDestroyed();
    }

    this.entities.clear();
    this.pendingDestroy.clear();
  }

  private generateId(): EntityId {
    let id: EntityId;
    do {
      id = `entity-${this.nextSequence++}`;
    } while (this.entities.has(id));
    return id;
  }
}
