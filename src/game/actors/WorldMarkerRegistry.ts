import type { WorldMarkerProfile } from './WorldMarkerTypes';

export class WorldMarkerRegistry {
  private readonly profiles = new Map<string, WorldMarkerProfile>();
  constructor(profiles: readonly WorldMarkerProfile[] = []) {
    profiles.forEach(profile => this.profiles.set(profile.id, profile));
  }
  get(id: string): WorldMarkerProfile | undefined { return this.profiles.get(id); }
  all(): readonly WorldMarkerProfile[] { return [...this.profiles.values()]; }
}
