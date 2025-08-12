import { ECS } from './ecs';

export function tickMorale(ecs: ECS, dt: number): void {
  for (const [e, st] of ecs.stats) {
    // passive recovery
    st.morale = Math.min(1, st.morale + 0.05 * dt);
    // low hp reduces morale
    if (st.hp < 5) st.morale = Math.max(0, st.morale - 0.08 * dt);
  }
}

export function shouldFlee(ecs: ECS, e: number): boolean {
  const st = ecs.stats.get(e);
  return !!st && st.morale < 0.25;
}


