export type WorldMarkerKind = 'quest-available' | 'quest-active' | 'quest-turn-in' | 'merchant' | 'blacksmith' | 'travel' | 'story' | 'dungeon';

export interface WorldMarkerProfile {
  id: string;
  kind: WorldMarkerKind;
  symbol: string;
  color: { r: number; g: number; b: number };
  pulse: boolean;
  priority: number;
}
