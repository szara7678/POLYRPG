import { ECS, Entity } from './ecs';

export type AuraType = 'wizard';

export interface AuraZone {
  x: number;
  z: number;
  radius: number;
  type: AuraType;
  moraleRegenPerSec?: number; // e.g., 0.15
  speedMultiplier?: number;   // e.g., 1.1
}

export function applyAuraEffects(ecs: ECS, zones: AuraZone[], dt: number): void {
  if (zones.length === 0) return;
  const entries = Array.from(ecs.positions.entries());
  for (const [e, p] of entries) {
    for (const z of zones) {
      const dx = p.x - z.x;
      const dz = p.z - z.z;
      if (dx * dx + dz * dz <= z.radius * z.radius) {
        if (z.moraleRegenPerSec) {
          const st = ecs.stats.get(e);
          if (st) st.morale = Math.min(1, st.morale + z.moraleRegenPerSec * dt);
        }
        if (z.speedMultiplier) {
          const v = ecs.velocities.get(e);
          if (v) {
            const factor = 1 + (z.speedMultiplier - 1) * dt; // smooth scale toward multiplier
            v.x *= factor;
            v.z *= factor;
          }
        }
      }
    }
  }
}


