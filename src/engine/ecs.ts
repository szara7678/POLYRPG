export type Entity = number;

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Velocity {
  x: number;
  y: number;
  z: number;
}

export type Cohort = 'infantry' | 'archer' | 'scout' | 'magus' | 'farmer';

export interface AgentTag {
  kind: 'human' | 'animal';
  cohort?: Cohort;
}

export interface Brain {
  decisionCooldownSec: number;
  nextDecisionTime: number;
  temperature: number;
}

export class ECS {
  private nextId = 1;
  positions = new Map<Entity, Position>();
  velocities = new Map<Entity, Velocity>();
  agents = new Map<Entity, AgentTag>();
  brains = new Map<Entity, Brain>();
  headingsY = new Map<Entity, number>();

  create(): Entity { return this.nextId++; }
}


