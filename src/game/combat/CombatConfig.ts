import { GameBalance } from '../config/GameBalance';

export type CombatConfig = typeof GameBalance.combat;
export const DEFAULT_COMBAT_CONFIG: Readonly<CombatConfig> = GameBalance.combat;
