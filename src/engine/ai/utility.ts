export type ActionId =
  | 'IDLE'
  | 'PATROL'
  | 'FORAGE'
  | 'HUNT'
  | 'FARM'
  | 'BUILD'
  | 'GARRISON'
  | 'SCOUT'
  | 'RAID'
  | 'FLEE'
  | 'TREAT'
  | 'CAST'
  | 'RITUAL_JOIN';

export interface UtilityWeights {
  need: number;
  trait: number;
  role: number;
  q: number;
  rule: number;
  aura: number;
  cost: number;
}

export interface UtilityContext {
  distanceFromCenter: number;
  staminaLow: boolean;
}

export function evaluateUtility(action: ActionId, ctx: UtilityContext, w: UtilityWeights): number {
  let base = 0.1;
  if (action === 'FLEE') base = ctx.distanceFromCenter * 0.6;
  else if (action === 'PATROL') base = 0.5;
  else if (action === 'SCOUT') base = 0.55;
  else if (action === 'FARM') base = 0.4 * (1 - ctx.distanceFromCenter);
  else if (action === 'FORAGE') base = 0.45;
  const stamina = ctx.staminaLow && action === 'IDLE' ? 0.6 : 0.0;
  return w.need * stamina + w.role * base;
}

export const defaultWeights: UtilityWeights = { need: 1, trait: 0, role: 1, q: 0, rule: 0, aura: 0, cost: 0 };


