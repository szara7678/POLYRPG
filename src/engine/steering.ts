import { ECS } from './ecs';

export function wanderAndAvoid(ecs: ECS, bounds = 35, changeProb = 0.02, speed = 1.4): void {
  for (const [e, pos] of ecs.positions) {
    const v = ecs.velocities.get(e);
    if (!v) continue;
    if (Math.random() < changeProb) {
      const angle = Math.random() * Math.PI * 2;
      v.x = Math.cos(angle) * speed;
      v.z = Math.sin(angle) * speed;
    }
    const margin = 4;
    if (pos.x > bounds - margin) v.x = -Math.abs(v.x);
    if (pos.x < -bounds + margin) v.x = Math.abs(v.x);
    if (pos.z > bounds - margin) v.z = -Math.abs(v.z);
    if (pos.z < -bounds + margin) v.z = Math.abs(v.z);
  }
}

export function applyWalkBounce(time: number, amplitude = 0.06, frequency = 6.0): number {
  return Math.sin(time * frequency) * amplitude;
}


