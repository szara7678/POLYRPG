import { ECS, type Cohort } from './ecs';
import { inheritGenes, type Genes } from './genetics';
import { buildUniformGrid, queryNeighbors } from './spatial';

export interface ReproductionState {
  cooldown: number;
  interval: number;
  maxPopulation: number;
}

export function createReproductionState(): ReproductionState {
  return { cooldown: 0, interval: 8, maxPopulation: 400 };
}

export function tickReproduction(
  ecs: ECS,
  genes: Map<number, Genes>,
  state: ReproductionState,
  dt: number,
): void {
  state.cooldown -= dt;
  if (state.cooldown > 0) return;
  state.cooldown = state.interval;
  if (ecs.positions.size >= state.maxPopulation) return;

  const grid = buildUniformGrid(ecs, 3);
  // pick a random parent candidate with good morale
  const candidates = Array.from(ecs.positions.keys());
  if (candidates.length < 2) return;
  const parentA = candidates[Math.floor(Math.random() * candidates.length)];
  const stA = ecs.stats.get(parentA);
  if (!stA || stA.morale < 0.6) return;
  const neighbors = queryNeighbors(grid, ecs, parentA, 3);
  for (const parentB of neighbors) {
    if (ecs.factions.get(parentA)?.id !== ecs.factions.get(parentB)?.id) continue;
    const stB = ecs.stats.get(parentB);
    if (!stB || stB.morale < 0.6) continue;
    // spawn child
    const pa = ecs.positions.get(parentA)!;
    const pb = ecs.positions.get(parentB)!;
    const child = ecs.create();
    const x = (pa.x + pb.x) * 0.5 + (Math.random() - 0.5) * 0.5;
    const z = (pa.z + pb.z) * 0.5 + (Math.random() - 0.5) * 0.5;
    ecs.positions.set(child, { x, y: 0, z });
    const cohortA = ecs.agents.get(parentA)?.cohort;
    const cohortB = ecs.agents.get(parentB)?.cohort;
    const cohort: Cohort | undefined = Math.random() < 0.5 ? cohortA : cohortB;
    ecs.agents.set(child, { kind: 'human', cohort });
    ecs.velocities.set(child, { x: 0, y: 0, z: 0 });
    ecs.stats.set(child, { hp: 10, stamina: 1, morale: 0.8 });
    ecs.factions.set(child, { id: ecs.factions.get(parentA)?.id ?? 1 });
    // genes inherit
    const ga = genes.get(parentA);
    const gb = genes.get(parentB);
    if (ga && gb) genes.set(child, inheritGenes(ga, gb));
    break;
  }
}


