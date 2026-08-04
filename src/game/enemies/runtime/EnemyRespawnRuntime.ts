export type EnemyRespawnClass = 'normal' | 'quest' | 'boss';

export interface EnemyRespawnRecord {
  id: string;
  enemyDefinitionId: string;
  variantId?: string;
  modifierId?: string;
  elite: boolean;
  respawnClass: EnemyRespawnClass;
  position: { x: number; y: number; z: number };
  encounterOwnership?: unknown;
  defeatedAtSeconds: number;
  remainingSeconds: number;
  bossZoneRadius: number;
  zoneEmptySeconds: number;
}

export interface EnemyRespawnSnapshot {
  pending: number;
  normal: number;
  quest: number;
  boss: number;
  nextRemainingSeconds: number | null;
}

export const ENEMY_RESPAWN_SECONDS: Readonly<Record<EnemyRespawnClass, number>> = {
  normal: 20,
  quest: 60,
  boss: 90,
};

export class EnemyRespawnRuntime {
  private readonly pending = new Map<string, EnemyRespawnRecord>();

  schedule(record: Omit<EnemyRespawnRecord, 'remainingSeconds' | 'zoneEmptySeconds'>): void {
    this.pending.set(record.id, {
      ...record,
      remainingSeconds: ENEMY_RESPAWN_SECONDS[record.respawnClass],
      zoneEmptySeconds: 0,
    });
  }

  update(
    dt: number,
    playerPosition: { x: number; y: number; z: number },
    spawn: (record: EnemyRespawnRecord) => boolean,
  ): void {
    for (const [id, record] of [...this.pending]) {
      if (record.respawnClass === 'boss') {
        const dx = playerPosition.x - record.position.x;
        const dz = playerPosition.z - record.position.z;
        const outside = Math.hypot(dx, dz) > record.bossZoneRadius;
        if (!outside) {
          record.zoneEmptySeconds = 0;
          record.remainingSeconds = ENEMY_RESPAWN_SECONDS.boss;
          continue;
        }
        record.zoneEmptySeconds += dt;
        record.remainingSeconds = Math.max(0, ENEMY_RESPAWN_SECONDS.boss - record.zoneEmptySeconds);
      } else {
        record.remainingSeconds = Math.max(0, record.remainingSeconds - dt);
      }

      if (record.remainingSeconds > 0) continue;
      if (spawn(record)) this.pending.delete(id);
    }
  }

  clear(): void {
    this.pending.clear();
  }

  cancel(id: string): void {
    this.pending.delete(id);
  }

  snapshot(): EnemyRespawnSnapshot {
    const records = [...this.pending.values()];
    return {
      pending: records.length,
      normal: records.filter(record => record.respawnClass === 'normal').length,
      quest: records.filter(record => record.respawnClass === 'quest').length,
      boss: records.filter(record => record.respawnClass === 'boss').length,
      nextRemainingSeconds: records.length > 0
        ? Math.min(...records.map(record => record.remainingSeconds))
        : null,
    };
  }
}
