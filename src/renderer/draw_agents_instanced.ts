import * as THREE from 'three';
import type { ECS, Entity } from '../engine/ecs';

export class InstancedAgents {
  readonly group = new THREE.Group();
  private body: THREE.InstancedMesh;
  private head: THREE.InstancedMesh;
  private entityToIndex = new Map<Entity, number>();
  private indexToEntity: Entity[] = [];
  private dummy = new THREE.Object3D();
  private time = 0;

  constructor(capacity = 1024) {
    const bodyGeom = new THREE.CapsuleGeometry(0.2, 0.7, 4, 8);
    const headGeom = new THREE.SphereGeometry(0.18, 12, 12);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    this.body = new THREE.InstancedMesh(bodyGeom, bodyMat, capacity);
    this.head = new THREE.InstancedMesh(headGeom, headMat, capacity);
    this.body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.head.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.body);
    this.group.add(this.head);
  }

  private ensureMapping(ecs: ECS): void {
    const entities = Array.from(ecs.positions.keys());
    if (this.indexToEntity.length !== entities.length) {
      this.entityToIndex.clear();
      this.indexToEntity = entities.slice(0);
      entities.forEach((e, i) => this.entityToIndex.set(e, i));
    }
  }

  syncTransforms(ecs: ECS): void {
    this.ensureMapping(ecs);
    for (const [e, p] of ecs.positions) {
      const idx = this.entityToIndex.get(e)!;
      const yaw = ecs.headingsY.get(e) ?? 0;
      this.dummy.position.set(p.x, 0, p.z);
      this.dummy.rotation.set(0, yaw, 0);
      this.dummy.updateMatrix();
      this.body.setMatrixAt(idx, this.dummy.matrix);
      // head offset
      this.dummy.position.y = 0.6;
      this.dummy.updateMatrix();
      this.head.setMatrixAt(idx, this.dummy.matrix);
    }
    this.body.instanceMatrix.needsUpdate = true;
    this.head.instanceMatrix.needsUpdate = true;
  }

  animate(dt: number): void {
    this.time += dt;
    const y = Math.sin(this.time * 6.0) * 0.06;
    // simple: offset applied via additional transform is omitted to keep API simple
    // could store per-instance base to apply offsets if needed
  }
}


