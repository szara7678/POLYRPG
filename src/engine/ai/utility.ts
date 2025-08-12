import { getGameData } from '../game_data';
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
  auraFactor?: number; // 0..1
}

export interface UtilityBreakdown {
  need: number;
  trait: number;
  role: number;
  q: number;
  rule: number;
  aura: number;
  cost: number;
  total: number;
}

export function softmaxSample(scores: number[], temperature: number): number {
  const T = Math.max(1e-3, temperature);
  // improve numerical stability by subtracting max
  let maxVal = -Infinity;
  for (const s of scores) if (s > maxVal) maxVal = s;
  const exps = scores.map((s) => Math.exp((s - maxVal) / T));
  const sum = exps.reduce((a, b) => a + b, 0);
  let r = Math.random() * (sum || 1);
  for (let i = 0; i < exps.length; i++) {
    r -= exps[i];
    if (r <= 0) return i;
  }
  return exps.length - 1;
}

function baseRoleScore(action: ActionId, ctx: UtilityContext): number {
  // data-driven override
  const def = getGameData().actions?.actions?.find((a: any) => a.id === action) as
    | { id: string; baseRole?: number }
    | undefined;
  if (def?.baseRole !== undefined) return def.baseRole;
  if (action === 'FLEE') return ctx.distanceFromCenter * 0.6;
  if (action === 'PATROL') return 0.5;
  if (action === 'SCOUT') return 0.55;
  if (action === 'FARM') return 0.4 * (1 - ctx.distanceFromCenter);
  if (action === 'FORAGE') return 0.45;
  return 0.1;
}

export function evaluateUtilityDetailed(
  action: ActionId,
  ctx: UtilityContext,
  w: UtilityWeights,
  cohortQBias: number = 0,
  rlBias: number = 0,
  ruleBias: number = 0,
): UtilityBreakdown {
  const need = (ctx.staminaLow && action === 'IDLE' ? 0.6 : 0.0) * w.need;
  const role = baseRoleScore(action, ctx) * w.role;
  const q = (cohortQBias + rlBias) * w.q;
  const trait = 0 * w.trait;
  const rule = ruleBias * w.rule;
  const auraBiasRaw = ctx.auraFactor ?? 0;
  const auraActionScale = action === 'CAST' || action === 'RITUAL_JOIN' ? 1.0 : 0.2;
  const aura = auraBiasRaw * auraActionScale * w.aura;
  const def: any = getGameData().actions?.actions?.find((a: any) => a.id === action);
  const baseCost = typeof def?.cost === 'number' ? def.cost : 0;
  const cost = baseCost * w.cost;
  const total = need + role + q + trait + rule + aura - cost;
  return { need, role, q, trait, rule, aura, cost, total };
}

export const defaultWeights: UtilityWeights = { need: 1, trait: 0.2, role: 1, q: 0.8, rule: 0.3, aura: 0.2, cost: 0.5 };


