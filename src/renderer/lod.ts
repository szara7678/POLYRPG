import * as THREE from 'three';
import { ECS, Entity } from '../engine/ecs';

export class SimpleLOD {
  constructor(private readonly ecs: ECS, private readonly camera: THREE.Camera) {}

  updateVisibility(objects: Map<Entity, THREE.Group>, maxDist = 120): void {
    const camPos = new THREE.Vector3();
    this.camera.getWorldPosition(camPos);
    const max2 = maxDist * maxDist;
    for (const [e, obj] of objects) {
      const p = this.ecs.positions.get(e);
      if (!p) { obj.visible = false; continue; }
      const d2 = (p.x - camPos.x) ** 2 + (p.z - camPos.z) ** 2;
      obj.visible = d2 < max2;
    }
  }
}


