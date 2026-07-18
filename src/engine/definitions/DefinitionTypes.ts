export type DefinitionId = string;
export type DefinitionKind = string;

export interface DefinitionMetadata {
  readonly schemaVersion: number;
  readonly contentVersion: string;
  readonly source?: string;
  readonly tags?: readonly string[];
  readonly deprecated?: boolean;
}

export interface DefinitionBase {
  readonly id: DefinitionId;
  readonly kind: DefinitionKind;
  readonly metadata: DefinitionMetadata;
}

export interface DefinitionSnapshot {
  readonly id: DefinitionId;
  readonly kind: DefinitionKind;
  readonly schemaVersion: number;
  readonly contentVersion: string;
  readonly source?: string;
  readonly tags: readonly string[];
  readonly deprecated: boolean;
}

export interface DefinitionRegistryStats {
  readonly total: number;
  readonly kinds: number;
  readonly deprecated: number;
  readonly validationErrors: number;
  readonly byKind: Readonly<Record<string, number>>;
}

export type DefinitionValidator<T extends DefinitionBase> = (
  definition: Readonly<T>,
) => readonly string[];
