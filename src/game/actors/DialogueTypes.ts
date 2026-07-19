import type { ActionDefinition } from './ActionTypes';
import type { ConditionDefinition } from './ConditionTypes';

export interface DialogueChoiceDefinition {
  id: string;
  text: string;
  condition?: ConditionDefinition;
  actions?: readonly ActionDefinition[];
  nextNodeId?: string;
  disabledReason?: string;
}

export interface DialogueNodeDefinition {
  id: string;
  speakerId: string;
  text: string;
  condition?: ConditionDefinition;
  actionsOnEnter?: readonly ActionDefinition[];
  choices?: readonly DialogueChoiceDefinition[];
  nextNodeId?: string;
  end?: boolean;
}

export interface DialogueDefinition {
  id: string;
  startNodeId: string;
  nodes: readonly DialogueNodeDefinition[];
}

export interface DialogueChoiceView {
  id: string;
  text: string;
  enabled: boolean;
  disabledReason?: string;
}

export interface DialogueSnapshot {
  dialogueId: string | null;
  nodeId: string | null;
  speakerId: string | null;
  text: string;
  choices: readonly DialogueChoiceView[];
  active: boolean;
}
