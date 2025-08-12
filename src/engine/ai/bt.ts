import { ECS, Entity } from '../ecs';
import { ActionId, UtilityContext, defaultWeights, evaluateUtilityDetailed } from './utility';

export interface GateNodeConfig { candidates: ActionId[] }

export class GateSelector {
  constructor(private readonly ecs: ECS, private readonly cfg: GateNodeConfig) {}

  tick(entity: Entity): ActionId {
    const pos = this.ecs.positions.get(entity);
    if (!pos) return 'IDLE';
    const distanceFromCenter = Math.min(1, Math.hypot(pos.x, pos.z) / 40);
    const ctx: UtilityContext = { distanceFromCenter, staminaLow: false };

    let best: ActionId = 'IDLE';
    let bestScore = -Infinity;
    for (const a of this.cfg.candidates) {
      const breakdown = evaluateUtilityDetailed(a, ctx, defaultWeights, 0);
      const s = breakdown.total;
      if (s > bestScore) {
        bestScore = s;
        best = a;
      }
    }
    return best;
  }
}


