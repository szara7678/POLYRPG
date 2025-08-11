import * as THREE from 'three';
import { ECS, Entity } from '../engine/ecs';

export class AgentRenderer {
  private readonly group = new THREE.Group();
  private readonly map = new Map<Entity, THREE.Group>();
  private time = 0;

  constructor(private readonly ecs: ECS) {}

  get object3d(): THREE.Group { return this.group; }

  ensureEntity(e: Entity): void {
    if (this.map.has(e)) return;
    const agent = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.7, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0xdddddd }),
    );
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshLambertMaterial({ color: 0xffcc99 }),
    );
    head.position.y = 0.6;
    agent.add(body);
    agent.add(head);
    this.group.add(agent);
    this.map.set(e, agent);
  }

  syncTransforms(): void {
    for (const [e, obj] of this.map) {
      const p = this.ecs.positions.get(e);
      if (!p) continue;
      obj.position.set(p.x, p.y, p.z);
      const v = this.ecs.velocities.get(e);
      if (v) {
        const yaw = Math.atan2(v.x, v.z);
        obj.rotation.y = yaw;
      }
    }
  }

  animate(dt: number, bounce: (t: number) => number): void {
    this.time += dt;
    const yOffset = bounce(this.time);
    for (const [, obj] of this.map) {
      obj.position.y = yOffset;
    }
  }
}


