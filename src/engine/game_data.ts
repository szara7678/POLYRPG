import { assetUrl, loadJson } from './data_loader';

export interface CohortDef {
  id: string;
  speed?: number;
  q?: Record<string, number>;
}

export interface GameData {
  actions: { actions: { id: string }[] } | null;
  buildings: { buildings: any[] } | null;
  tech: { tech: any[] } | null;
  spells: { spells: any[] } | null;
  biomes: { biomes: any[] } | null;
  cohorts: { cohorts: CohortDef[] } | null;
}

const registry: GameData = {
  actions: null,
  buildings: null,
  tech: null,
  spells: null,
  biomes: null,
  cohorts: null,
};

export function getGameData(): GameData { return registry; }

export async function loadGameData(): Promise<void> {
  const [actions, buildings, tech, spells, biomes, cohorts] = await Promise.all([
    loadJson(assetUrl('data/actions.json')),
    loadJson(assetUrl('data/buildings.json')),
    loadJson(assetUrl('data/tech.json')),
    loadJson(assetUrl('data/spells.json')),
    loadJson(assetUrl('data/biomes.json')),
    loadJson(assetUrl('data/cohorts.json')),
  ]);
  registry.actions = actions;
  registry.buildings = buildings;
  registry.tech = tech;
  registry.spells = spells;
  registry.biomes = biomes;
  registry.cohorts = cohorts;
}


