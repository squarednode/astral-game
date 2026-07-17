export type EntityId = string;

export type EntityLifecycleState =
  | 'active'
  | 'disabled'
  | 'destroy-pending'
  | 'destroyed';

export type EntityTag = string;
export type ComponentKey = string;

export interface EntitySnapshot {
  id: EntityId;
  name: string;
  state: EntityLifecycleState;
  tags: readonly EntityTag[];
  componentKeys: readonly ComponentKey[];
  createdAtFrame: number;
}

export interface CreateEntityOptions {
  id?: EntityId;
  name?: string;
  tags?: Iterable<EntityTag>;
  enabled?: boolean;
}
