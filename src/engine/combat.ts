import { ECS } from './ecs';
import { buildUniformGrid, queryNeighbors } from './spatial';

interface CombatParams {
  range: number;       // attack range
  damage: number;      // damage per shot
  rate: number;        // shots per second
  pursue: boolean;     // will move toward target when out of range
}

const attackCooldown = new Map<number, number>();
const currentTarget = new Map<number, number>();
const lastHitBy = new Map<number, number>(); // victim -> attacker

function paramsForCohort(cohort?: string): CombatParams {
  switch (cohort) {
    case 'infantry': return { range: 1.6, damage: 3.5, rate: 1.2, pursue: true };
    case 'archer':   return { range: 6.0, damage: 2.8, rate: 1.4, pursue: false };
    case 'scout':    return { range: 1.4, damage: 2.2, rate: 1.6, pursue: true };
    case 'magus':    return { range: 5.5, damage: 3.2, rate: 1.2, pursue: false };
    case 'farmer':   return { range: 1.2, damage: 1.8, rate: 1.0, pursue: true };
    default:         return { range: 1.2, damage: 2.0, rate: 1.0, pursue: true };
  }
}

export function tickCombat(ecs: ECS, dt: number): void {
  // 고도화: 유닛별 사거리/공속/데미지, 표적 선택, 사거리 밖 추격/이격, 사기에 영향
  const grid = buildUniformGrid(ecs, 3);
  for (const [e, p] of ecs.positions) {
    // 쿨다운 감소
    const cd = (attackCooldown.get(e) ?? 0) - dt;
    if (cd <= 0) attackCooldown.delete(e); else attackCooldown.set(e, cd);

    const myFaction = ecs.factions.get(e)?.id;
    const cohort = ecs.agents.get(e)?.cohort;
    const cp = paramsForCohort(cohort);
    // 적 탐색
    let target = currentTarget.get(e);
    const neighbors = queryNeighbors(grid, ecs, e, Math.max(7, cp.range + 2));
    // 검증: 타겟이 유효하고 살아있으며 적인지
    const isValidTarget = (t?: number) => t !== undefined && ecs.positions.has(t) && (ecs.factions.get(t)?.id !== myFaction);
    if (!isValidTarget(target)) {
      target = undefined;
      let best: number | undefined;
      let bestD2 = Infinity;
      for (const nb of neighbors) {
        if (ecs.factions.get(nb)?.id === myFaction) continue;
        const op = ecs.positions.get(nb)!;
        const dx = p.x - op.x; const dz = p.z - op.z; const d2 = dx * dx + dz * dz;
        if (d2 < bestD2) { bestD2 = d2; best = nb; }
      }
      target = best;
    }
    if (target !== undefined) currentTarget.set(e, target);

    if (target !== undefined) {
      const tp = ecs.positions.get(target)!;
      const dx = tp.x - p.x; const dz = tp.z - p.z; const dist = Math.hypot(dx, dz);
      // 사거리 밖이면 이동 보정(추격/이격)
      const v = ecs.velocities.get(e);
      if (v) {
        if (dist > cp.range && cp.pursue) {
          const k = 0.8; // 추격 보정 강도
          v.x += (dx / Math.max(1e-3, dist)) * k * dt;
          v.z += (dz / Math.max(1e-3, dist)) * k * dt;
        } else if (dist < cp.range * 0.8 && !cp.pursue) {
          const k = 0.8; // 이격 보정 강도(궁수/마법사)
          v.x -= (dx / Math.max(1e-3, dist)) * k * dt;
          v.z -= (dz / Math.max(1e-3, dist)) * k * dt;
        }
      }
      // 사거리 이내면 공격 시도
      if (dist <= cp.range) {
        const ready = !attackCooldown.has(e);
        if (ready) {
          const tgtStats = ecs.stats.get(target);
          if (tgtStats) {
            tgtStats.hp -= cp.damage;
            // 즉시 사기 하락
            tgtStats.morale = Math.max(0, tgtStats.morale - cp.damage * 0.06);
            lastHitBy.set(target, e);
          }
          attackCooldown.set(e, 1 / cp.rate);
        }
      }
    }
  }
}

export function cullDead(
  ecs: ECS,
  onKill?: (killer: number, victim: number) => void,
): void {
  for (const [e, st] of Array.from(ecs.stats.entries())) {
    if (st.hp <= 0) {
      const killer = lastHitBy.get(e);
      if (killer !== undefined && onKill) onKill(killer, e);
      ecs.positions.delete(e);
      ecs.velocities.delete(e);
      ecs.agents.delete(e);
      ecs.brains.delete(e);
      ecs.headingsY.delete(e);
      ecs.stats.delete(e);
      ecs.factions.delete(e);
      lastHitBy.delete(e);
    }
  }
}


