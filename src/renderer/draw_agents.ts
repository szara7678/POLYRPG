import * as THREE from 'three';
import { ECS, Entity } from '../engine/ecs';

export class AgentRenderer {
  private readonly group = new THREE.Group();
  private readonly map = new Map<Entity, THREE.Group>();
  private readonly indexOf = new Map<Entity, number>();
  private nextIndex = 0;
  private time = 0;

  constructor(private readonly ecs: ECS) {}

  get object3d(): THREE.Group { return this.group; }

  get pickables(): THREE.Object3D[] {
    return Array.from(this.map.values());
  }

  get objects(): Map<Entity, THREE.Group> { return this.map; }

  getEntityFromObject(obj: THREE.Object3D): Entity | undefined {
    for (const [e, g] of this.map) {
      if (obj === g || g.children.includes(obj as any)) return e;
    }
    return undefined;
  }

  ensureEntity(e: Entity): void {
    if (this.map.has(e)) return;
    const agent = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.7, 4, 8),
      new THREE.MeshLambertMaterial({ color: 0xdddddd }),
    );
    body.name = `agent-body-${e}`;
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 12),
      new THREE.MeshLambertMaterial({ color: 0xffcc99 }),
    );
    head.position.y = 0.6;
    head.name = `agent-head-${e}`;
    // simple hands
    const handGeom = new THREE.SphereGeometry(0.07, 10, 10);
    const handMat = new THREE.MeshLambertMaterial({ color: 0xffddaa });
    const handL = new THREE.Mesh(handGeom, handMat);
    const handR = new THREE.Mesh(handGeom, handMat);
    handL.position.set(-0.22, 0.35, 0);
    handR.position.set(0.22, 0.35, 0);
    handL.name = `agent-handL-${e}`;
    handR.name = `agent-handR-${e}`;
    agent.add(body);
    agent.add(head);
    agent.add(handL);
    agent.add(handR);
    this.group.add(agent);
    this.map.set(e, agent);
    this.indexOf.set(e, this.nextIndex++);
  }

  syncTransforms(): void {
    for (const [e, obj] of this.map) {
      const p = this.ecs.positions.get(e);
      if (!p) continue;
      obj.position.set(p.x, p.y, p.z);
      const yaw = this.ecs.headingsY.get(e);
      if (yaw !== undefined) obj.rotation.y = yaw;
    }
  }

  animate(dt: number, bounce: (t: number) => number): void {
    this.time += dt;
    const yOffset = bounce(this.time);
    for (const [, obj] of this.map) {
      obj.position.y = yOffset;
      // simple hand swing based on time and forward axis
      const l = obj.getObjectByName(obj.name.replace('agent-body', 'agent-handL')) as THREE.Mesh | null;
      const r = obj.getObjectByName(obj.name.replace('agent-body', 'agent-handR')) as THREE.Mesh | null;
      const t = this.time * 8.0;
      const sway = Math.sin(t) * 0.1;
      if (l) l.position.z = -sway;
      if (r) r.position.z = sway;
    }
  }

  getIndex(e: Entity): number | undefined { return this.indexOf.get(e); }

  pruneMissing(ecs: ECS): void {
    for (const [e, obj] of Array.from(this.map.entries())) {
      if (!ecs.positions.has(e)) {
        this.group.remove(obj);
        this.map.delete(e);
        this.indexOf.delete(e);
      }
    }
  }
}


