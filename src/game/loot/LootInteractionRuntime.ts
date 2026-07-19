import { StateMachine } from '../../engine/state';
import type { GroundLootRecord } from './GroundLootTypes';

export type LootInteractionStateId =
  | 'idle'
  | 'targeted'
  | 'collecting'
  | 'blocked';

interface LootInteractionContext {
  collect(record: GroundLootRecord): boolean;
  resolve(id: number): GroundLootRecord | undefined;
}

interface LootInteractionBlackboard {
  targetId: number | null;
  blockedReason: string | null;
}

export interface LootInteractionSnapshot {
  state: LootInteractionStateId;
  targetId: number | null;
  blockedReason: string | null;
}

export class LootInteractionRuntime {
  private readonly machine: StateMachine<
    LootInteractionContext,
    LootInteractionStateId,
    LootInteractionBlackboard
  >;

  constructor(
    resolve: (id: number) => GroundLootRecord | undefined,
    collect: (record: GroundLootRecord) => boolean,
  ) {
    this.machine = new StateMachine(
      'loot-interaction',
      { resolve, collect },
      {},
      { targetId: null, blockedReason: null },
    );

    this.machine
      .addState({
        id: 'idle',
        enter: (_context, machine) => {
          machine.blackboard.set('targetId', null);
          machine.blackboard.set('blockedReason', null);
        },
      })
      .addState({
        id: 'targeted',
        interactions: [
          {
            type: 'collect',
            to: 'collecting',
          },
          {
            type: 'clear',
            to: 'idle',
          },
        ],
      })
      .addState({
        id: 'collecting',
        duration: 0,
        enter: (context, machine) => {
          const targetId = machine.blackboard.get('targetId');
          const record = targetId === null
            ? undefined
            : context.resolve(targetId);

          if (!record) {
            machine.blackboard.set('blockedReason', 'loot-missing');
            machine.request('blocked', 'loot-missing');
            return;
          }

          const collected = context.collect(record);
          if (collected) {
            machine.request('idle', 'loot-collected');
          } else {
            machine.blackboard.set('blockedReason', 'inventory-full');
            machine.request('blocked', 'inventory-full');
          }
        },
      })
      .addState({
        id: 'blocked',
        interactions: [
          {
            type: 'retry',
            to: 'collecting',
          },
          {
            type: 'clear',
            to: 'idle',
          },
        ],
      });

    this.machine.start('idle');
  }

  update(dt: number): void {
    this.machine.update(dt);
  }

  target(recordId: number): void {
    this.machine.blackboard.set('targetId', recordId);
    this.machine.blackboard.set('blockedReason', null);

    if (this.machine.getCurrentStateId() === 'targeted') return;
    this.machine.request('targeted', 'loot-targeted');
  }

  clear(): void {
    if (this.machine.getCurrentStateId() === 'idle') return;
    this.machine.interact('clear');
  }

  collect(): boolean {
    const state = this.machine.getCurrentStateId();
    if (state === 'targeted') {
      return this.machine.interact('collect').handled;
    }
    if (state === 'blocked') {
      return this.machine.interact('retry').handled;
    }
    return false;
  }

  snapshot(): LootInteractionSnapshot {
    return {
      state: this.machine.getCurrentStateId() ?? 'idle',
      targetId: this.machine.blackboard.get('targetId'),
      blockedReason: this.machine.blackboard.get('blockedReason'),
    };
  }
}
