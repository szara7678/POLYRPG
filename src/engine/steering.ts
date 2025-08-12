import { ECS } from './ecs';
import { buildUniformGrid, queryNeighbors } from './spatial';

export function wanderAndAvoid(ecs: ECS, bounds = 35, changeProb = 0.04, speed = 1.3): void {
  for (const [e, pos] of ecs.positions) {
    const v = ecs.velocities.get(e);
    if (!v) continue;
    if (Math.random() < changeProb) {
      const angle = Math.random() * Math.PI * 2;
      // 초기 줄세움 완화를 위해 약간의 난수 가속도 적용
      v.x = v.x * 0.6 + Math.cos(angle) * speed * 0.8;
      v.z = v.z * 0.6 + Math.sin(angle) * speed * 0.8;
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

export function separation(ecs: ECS, radius = 1.3, force = 2.6, dt = 0.016): void {
  const grid = buildUniformGrid(ecs, radius);
  for (const [e, p] of ecs.positions) {
    const v = ecs.velocities.get(e);
    if (!v) continue;
    const neighbors = queryNeighbors(grid, ecs, e, radius * 1.5);
    let ax = 0, az = 0;
    for (const o of neighbors) {
      const po = ecs.positions.get(o)!;
      const dx = p.x - po.x;
      const dz = p.z - po.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 1e-6 && d2 < radius * radius) {
        const inv = 1 / Math.sqrt(d2);
        ax += (dx * inv) * force;
        az += (dz * inv) * force;
      }
    }
    v.x += ax * dt;
    v.z += az * dt;
  }
}

export function smoothFaceHeading(ecs: ECS, turnRate = 6.0): void {
  for (const [e, v] of ecs.velocities) {
    const yaw = Math.atan2(v.x, v.z);
    const cur = ecs.headingsY.get(e) ?? yaw;
    const dy = normalizeAngle(yaw - cur);
    const step = Math.max(-turnRate * 0.016, Math.min(turnRate * 0.016, dy));
    const next = cur + step;
    ecs.headingsY.set(e, next);
  }
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}


