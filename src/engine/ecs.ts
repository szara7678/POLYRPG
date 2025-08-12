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
  job?: 'farmer' | 'worker' | 'soldier' | 'magus';
}

export interface Brain {
  decisionCooldownSec: number;
  nextDecisionTime: number;
  temperature: number;
}

export interface Stats {
  hp: number;
  stamina: number;
  morale: number;
}

export interface FactionTag { id: number }

export interface Skills {
  combat: number; // 0..1
  farm: number;   // 0..1
  craft: number;  // 0..1
  arcana: number; // 0..1
}

export interface InventoryItem { id: string; qty: number }
export interface Storage {
  items: Map<string, number>; // resourceId -> amount
}

export interface Personality {
  sociability: number; // 0..1: evening socialize weight
  diligence: number;  // 0..1: work adherence
  piety: number;      // 0..1: morning pray likelihood
  curiosity: number;  // 0..1: roam/explore tendency
}

export class ECS {
  private nextId = 1;
  positions = new Map<Entity, Position>();
  velocities = new Map<Entity, Velocity>();
  agents = new Map<Entity, AgentTag>();
  brains = new Map<Entity, Brain>();
  headingsY = new Map<Entity, number>();
  stats = new Map<Entity, Stats>();
  factions = new Map<Entity, FactionTag>();
  skills = new Map<Entity, Skills>();
  inventory = new Map<Entity, InventoryItem[]>();
  storages = new Map<Entity, Storage>();
  currentAction = new Map<Entity, string>();
  personalities = new Map<Entity, Personality>();

  create(): Entity { return this.nextId++; }
}


