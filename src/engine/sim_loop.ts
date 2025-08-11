import { ECS } from './ecs';

export class SimLoop {
  private accumulator = 0;
  private readonly fixedDt = 1 / 30; // 30Hz

  constructor(private readonly ecs: ECS) {}

  step(dt: number): void {
    this.accumulator += dt;
    while (this.accumulator >= this.fixedDt) {
      this.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }
  }

  private update(dt: number): void {
    // Integrate velocities
    for (const [e, pos] of this.ecs.positions) {
      const v = this.ecs.velocities.get(e);
      if (!v) continue;
      pos.x += v.x * dt;
      pos.y += v.y * dt;
      pos.z += v.z * dt;
    }
  }
}


