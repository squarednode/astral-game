export interface CheckpointPosition {
  x: number;
  y: number;
  z: number;
}

export interface CheckpointDefinition {
  id: string;
  displayName: string;
  position: CheckpointPosition;
  activationRadius: number;
  facing?: number;
}

export interface CheckpointSnapshot {
  activeCheckpointId: string | null;
  activeCheckpoint: CheckpointDefinition | null;
  activationCount: number;
}

export interface CheckpointSerializedState {
  schemaVersion: 1;
  activeCheckpointId: string | null;
  activationCount: number;
}
