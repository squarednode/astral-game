import type {
  ExperienceAward,
  ExperienceDistributionPolicy,
  ExperienceDistributionResult,
} from './ProgressionTypes';
import type { CharacterProgressionRuntime } from './CharacterProgressionRuntime';

export interface ExperienceRosterReader {
  unlockedCharacterIds(): readonly string[];
  activeCharacterIds(): readonly string[];
}

export class ExperienceRuntime {
  constructor(
    private readonly progression: CharacterProgressionRuntime,
    private readonly roster: ExperienceRosterReader,
    private readonly policy: ExperienceDistributionPolicy = 'full-roster',
  ) {}

  award(award: ExperienceAward): ExperienceDistributionResult {
    const recipients = this.resolveRecipients();
    const amount = Math.max(0, Math.floor(award.amount));
    const perCharacter = this.policy === 'split-active' && recipients.length > 0
      ? Math.max(1, Math.floor(amount / recipients.length))
      : amount;

    return {
      award: { ...award, amount },
      recipients: recipients.map(characterId => {
        const levelsGained = this.progression.addExperience(characterId, perCharacter);
        return {
          characterId,
          amount: perCharacter,
          levelsGained,
          newLevel: this.progression.snapshot(characterId)?.level ?? 1,
        };
      }),
    };
  }

  private resolveRecipients(): readonly string[] {
    switch (this.policy) {
      case 'active-party':
      case 'split-active':
        return this.roster.activeCharacterIds();
      case 'custom':
      case 'full-roster':
      default:
        return this.roster.unlockedCharacterIds();
    }
  }
}
