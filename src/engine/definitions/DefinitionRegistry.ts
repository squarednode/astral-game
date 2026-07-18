import type {
  DefinitionBase,
  DefinitionId,
  DefinitionKind,
  DefinitionRegistryStats,
  DefinitionSnapshot,
  DefinitionValidator,
} from './DefinitionTypes';

interface DefinitionKindRegistration<T extends DefinitionBase> {
  readonly schemaVersion: number;
  readonly validator?: DefinitionValidator<T>;
}

export class DefinitionRegistry {
  private readonly definitions = new Map<
    DefinitionId,
    Readonly<DefinitionBase>
  >();

  private readonly kinds = new Map<
    DefinitionKind,
    DefinitionKindRegistration<DefinitionBase>
  >();

  registerKind<T extends DefinitionBase>(
    kind: T['kind'],
    schemaVersion: number,
    validator?: DefinitionValidator<T>,
  ): void {
    if (!kind.trim()) {
      throw new Error('Definition kind cannot be empty.');
    }
    if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
      throw new Error(
        `Definition kind "${kind}" requires a positive integer schema version.`,
      );
    }
    if (this.kinds.has(kind)) {
      throw new Error(`Definition kind "${kind}" is already registered.`);
    }

    this.kinds.set(kind, {
      schemaVersion,
      validator: validator as DefinitionValidator<DefinitionBase>,
    });
  }

  register<T extends DefinitionBase>(definition: T): Readonly<T> {
    this.assertDefinitionIdentity(definition);
    const kindRegistration = this.kinds.get(definition.kind);
    if (!kindRegistration) {
      throw new Error(
        `Definition kind "${definition.kind}" is not registered.`,
      );
    }
    if (
      definition.metadata.schemaVersion !==
      kindRegistration.schemaVersion
    ) {
      throw new Error(
        `Definition "${definition.id}" uses schema version ${definition.metadata.schemaVersion}; ` +
          `kind "${definition.kind}" requires ${kindRegistration.schemaVersion}.`,
      );
    }

    const frozen = this.freezeDefinition(definition);
    const errors = this.validateDefinition(frozen);
    if (errors.length > 0) {
      throw new Error(
        `Definition "${definition.id}" is invalid:\n- ${errors.join('\n- ')}`,
      );
    }

    this.definitions.set(definition.id, frozen);
    return frozen as Readonly<T>;
  }

  registerMany<T extends DefinitionBase>(
    definitions: readonly T[],
  ): readonly Readonly<T>[] {
    const seen = new Set<string>();
    for (const definition of definitions) {
      if (seen.has(definition.id) || this.definitions.has(definition.id)) {
        throw new Error(`Definition ID "${definition.id}" already exists.`);
      }
      seen.add(definition.id);
    }

    return definitions.map(definition => this.register(definition));
  }

  has(id: DefinitionId): boolean {
    return this.definitions.has(id);
  }

  get<T extends DefinitionBase = DefinitionBase>(
    id: DefinitionId,
  ): Readonly<T> | undefined {
    return this.definitions.get(id) as Readonly<T> | undefined;
  }

  require<T extends DefinitionBase = DefinitionBase>(
    id: DefinitionId,
  ): Readonly<T> {
    const definition = this.get<T>(id);
    if (!definition) {
      throw new Error(`Definition "${id}" is not registered.`);
    }
    return definition;
  }

  all<T extends DefinitionBase = DefinitionBase>(
    kind?: DefinitionKind,
  ): readonly Readonly<T>[] {
    return [...this.definitions.values()].filter(definition =>
      kind ? definition.kind === kind : true,
    ) as readonly Readonly<T>[];
  }

  withTag<T extends DefinitionBase = DefinitionBase>(
    tag: string,
  ): readonly Readonly<T>[] {
    return [...this.definitions.values()].filter(definition =>
      definition.metadata.tags?.includes(tag),
    ) as readonly Readonly<T>[];
  }

  snapshots(): readonly DefinitionSnapshot[] {
    return [...this.definitions.values()].map(definition => ({
      id: definition.id,
      kind: definition.kind,
      schemaVersion: definition.metadata.schemaVersion,
      contentVersion: definition.metadata.contentVersion,
      source: definition.metadata.source,
      tags: [...(definition.metadata.tags ?? [])],
      deprecated: definition.metadata.deprecated ?? false,
    }));
  }

  validate(): readonly string[] {
    const errors: string[] = [];
    for (const definition of this.definitions.values()) {
      for (const error of this.validateDefinition(definition)) {
        errors.push(`${definition.id}: ${error}`);
      }
    }
    return errors;
  }

  stats(): DefinitionRegistryStats {
    const byKind: Record<string, number> = {};
    let deprecated = 0;

    for (const definition of this.definitions.values()) {
      byKind[definition.kind] = (byKind[definition.kind] ?? 0) + 1;
      if (definition.metadata.deprecated) deprecated += 1;
    }

    return {
      total: this.definitions.size,
      kinds: this.kinds.size,
      deprecated,
      validationErrors: this.validate().length,
      byKind,
    };
  }

  clear(): void {
    this.definitions.clear();
    this.kinds.clear();
  }

  private assertDefinitionIdentity(definition: DefinitionBase): void {
    if (!definition.id.trim()) {
      throw new Error('Definition ID cannot be empty.');
    }
    if (!definition.kind.trim()) {
      throw new Error(
        `Definition "${definition.id}" has an empty kind.`,
      );
    }
    if (this.definitions.has(definition.id)) {
      throw new Error(`Definition ID "${definition.id}" already exists.`);
    }
    if (!definition.metadata.contentVersion.trim()) {
      throw new Error(
        `Definition "${definition.id}" requires a content version.`,
      );
    }
  }

  private validateDefinition(
    definition: Readonly<DefinitionBase>,
  ): readonly string[] {
    const registration = this.kinds.get(definition.kind);
    if (!registration) {
      return [`Kind "${definition.kind}" is not registered.`];
    }
    return registration.validator?.(definition) ?? [];
  }

  private freezeDefinition<T extends DefinitionBase>(
    definition: T,
  ): Readonly<T> {
    const metadata = Object.freeze({
      ...definition.metadata,
      tags: Object.freeze([...(definition.metadata.tags ?? [])]),
    });

    return Object.freeze({
      ...definition,
      metadata,
    });
  }
}
