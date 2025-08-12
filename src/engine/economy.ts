import { Settlement } from './settlement';
import { WorldState } from './world';
import { RLManager } from './ai/rl';

export function tickEconomy(set: Settlement, world: WorldState, dt: number, opts?: { rl?: RLManager; agentsNear?: number[] }): void {
  // crop growth -> food per second (very rough)
  const farmers = set.jobs['farmer'] ?? 0;
  const baseFoodRate = 0.03 + 0.02 * farmers; // food/sec scaling with jobs
  const modifier = 1 + world.cropGrowthModifier; // could be <1 or >1
  const delta = baseFoodRate * modifier * dt;
  set.stock.food += delta;
  // RL 보상: 수확 성과에 소규모 보상(근처 농부 중심)
  if (opts?.rl && delta > 0 && (farmers > 0)) {
    for (const e of (opts.agentsNear ?? [])) {
      opts.rl.addReward(e, Math.min(0.05, delta * 0.5));
    }
  }
  if (set.stock.food < 0) set.stock.food = 0;
}


