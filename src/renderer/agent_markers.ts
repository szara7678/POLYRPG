import * as THREE from 'three';
import type { ECS, Entity } from '../engine/ecs';

export class AgentMarkers {
  readonly group = new THREE.Group();
  private inst: THREE.InstancedMesh;
  private entityToIndex = new Map<Entity, number>();
  private indexToEntity: Entity[] = [];
  private prevPos = new Map<Entity, { x: number; z: number }>();
  private dummy = new THREE.Object3D();

  constructor(capacity = 1024) {
    const geom = new THREE.CircleGeometry(0.25, 12);
    geom.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    this.inst = new THREE.InstancedMesh(geom, mat, capacity);
    this.inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.add(this.inst);
  }

  private ensureCapacity(n: number): void {
    if (n <= this.inst.count) return;
    // recreate with bigger capacity
    const newCount = Math.max(n, this.inst.count * 2);
    const geom = this.inst.geometry.clone();
    const mat = this.inst.material as THREE.Material;
    const next = new THREE.InstancedMesh(geom, mat, newCount);
    next.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.group.remove(this.inst);
    this.inst = next;
    this.group.add(this.inst);
    this.entityToIndex.clear();
    this.indexToEntity = [];
    this.prevPos.clear();
  }

  sync(ecs: ECS): void {
    const entities = Array.from(ecs.positions.keys());
    this.ensureCapacity(entities.length);
    // rebuild mapping if mismatch
    if (this.indexToEntity.length !== entities.length) {
      this.entityToIndex.clear();
      this.indexToEntity = entities.slice(0);
      entities.forEach((e, i) => this.entityToIndex.set(e, i));
    }
    const color = new THREE.Color();
    const dirty: number[] = [];
    for (const [e, p] of ecs.positions) {
      const prev = this.prevPos.get(e);
      const moved = !prev || Math.hypot(p.x - prev.x, p.z - prev.z) > 0.05;
      if (moved) {
        const idx = this.entityToIndex.get(e)!;
        this.dummy.position.set(p.x, 0.02, p.z);
        this.dummy.rotation.y = 0;
        this.dummy.updateMatrix();
        this.inst.setMatrixAt(idx, this.dummy.matrix);
        // faction color
        const f = ecs.factions.get(e)?.id ?? 0;
        color.setHex(f === 1 ? 0x66ccff : 0xff6666);
        if (this.inst.instanceColor) this.inst.setColorAt(idx, color);
        dirty.push(idx);
        this.prevPos.set(e, { x: p.x, z: p.z });
      }
    }
    if (dirty.length > 0) {
      this.inst.instanceMatrix.needsUpdate = true;
      if (this.inst.instanceColor) (this.inst.instanceColor as any).needsUpdate = true;
    }
  }

  get pickables(): THREE.Object3D[] { return [this.inst]; }
}


