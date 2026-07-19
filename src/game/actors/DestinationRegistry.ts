import type { DestinationDefinition } from './ActorComponentTypes';

export class DestinationRegistry {
  private readonly definitions = new Map<string, DestinationDefinition>();

  constructor(definitions: readonly DestinationDefinition[] = []) {
    definitions.forEach(definition => this.register(definition));
  }

  register(definition: DestinationDefinition): void {
    if (!definition.id.trim()) throw new Error('Destination ID cannot be empty.');
    this.definitions.set(definition.id, definition);
  }

  get(id: string): DestinationDefinition | undefined {
    return this.definitions.get(id);
  }

  has(id: string): boolean {
    return this.definitions.has(id);
  }

  all(): readonly DestinationDefinition[] {
    return [...this.definitions.values()];
  }
}
