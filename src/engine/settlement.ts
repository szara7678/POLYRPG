export interface Stock {
  food: number;
  wood: number;
  stone: number;
  iron: number;
  mana: number;
}

export interface BuildingInstance {
  id: string; // e.g., "wizard_tower"
  x: number;
  z: number;
}

export interface Settlement {
  name: string;
  x: number;
  z: number;
  stock: Stock;
  buildings: BuildingInstance[];
  jobs: Record<string, number>; // job -> assigned count
  unlocked: Set<string>;
  buildQueue: { id: string; x: number; z: number; progress: number; req: { stone?: number; iron?: number; wood?: number }; anchorId?: string; groupId?: number; reserved?: boolean }[];
}

export function createSettlement(name: string, x: number, z: number): Settlement {
  return {
    name,
    x,
    z,
    stock: { food: 10, wood: 10, stone: 5, iron: 0, mana: 0 },
    buildings: [],
    jobs: {},
    unlocked: new Set<string>(),
    buildQueue: [],
  };
}

export function addBuilding(set: Settlement, id: string, x: number, z: number): void {
  set.buildings.push({ id, x, z });
  // 효과 처리(간단): 일부 건물은 해금 부여
  if (id === 'wizard_tower') set.unlocked.add('ritual_minor_rain');
}

export function enqueueBuild(set: Settlement, id: string, x: number, z: number, cost: { stone?: number; iron?: number; wood?: number }): void {
  set.buildQueue.push({ id, x, z, progress: 0, req: cost });
}

export function tickSettlement(set: Settlement, dt: number): void {
  // Very simple production rules
  for (const b of set.buildings) {
    if (b.id === 'wizard_tower') {
      // mana gain ~0.15 per second (scaled)
      set.stock.mana += 0.15 * dt;
    } else if (b.id === 'forge') {
      set.stock.iron += 0.05 * dt;
    } else if (b.id === 'scribe_hut') {
      // no direct production; could unlock tech
    }
  }
  // Clamp stocks to reasonable bounds
  set.stock.mana = Math.max(0, set.stock.mana);
  set.stock.iron = Math.max(0, set.stock.iron);
}


