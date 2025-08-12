import { ECS, Entity, Position } from './ecs';
import type { WorldState } from './world';

export type LifeOptionId = 'COMMUTE' | 'WORK_FARM' | 'LUNCH' | 'SOCIALIZE' | 'PRAY' | 'SLEEP' | 'IDLE_LIFE' | 'GREET';

export interface Anchor {
  id: string;
  x: number;
  z: number;
  kind: 'home' | 'work' | 'market' | 'tavern' | 'shrine' | 'misc';
  slots: number;
  occupants: Set<Entity>;
}

interface LifeState {
  option: LifeOptionId;
  until: number; // sim time deadline for micro scenes etc
  anchorId?: string;
  timeOffsetHr: number; // personal schedule offset to desync crowds
}

export class LifeSystem {
  private life = new Map<Entity, LifeState>();
  private anchors: Anchor[] = [];
  private byId = new Map<string, Anchor>();
  private lastScan = 0;

  constructor(private readonly ecs: ECS) {}

  seedAnchors(settlementX = 0, settlementZ = 0): void {
    // basic hub layout: market (0,0), tavern (2,-2), shrine (-3,-5), farm rings
    this.anchors = [];
    // markets (multiple stalls around center)
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      this.anchors.push({ id: `market.stall.${i}`, x: settlementX + Math.cos(a) * 2.5, z: settlementZ + Math.sin(a) * 2.5, kind: 'market', slots: 3, occupants: new Set() });
    }
    // taverns (two corners)
    this.anchors.push({ id: 'tavern.1', x: settlementX + 4, z: settlementZ - 3, kind: 'tavern', slots: 4, occupants: new Set() });
    this.anchors.push({ id: 'tavern.2', x: settlementX - 4, z: settlementZ + 3, kind: 'tavern', slots: 4, occupants: new Set() });
    // shrine
    this.anchors.push({ id: 'shrine.1', x: settlementX - 3, z: settlementZ - 5, kind: 'shrine', slots: 3, occupants: new Set() });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      this.anchors.push({ id: `field.${i}`, x: settlementX + Math.cos(a) * 8, z: settlementZ + Math.sin(a) * 8, kind: 'work', slots: 1, occupants: new Set() });
    }
    // guard posts (misc) to absorb soldiers
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
      this.anchors.push({ id: `post.${i}`, x: settlementX + Math.cos(a) * 10, z: settlementZ + Math.sin(a) * 10, kind: 'misc', slots: 2, occupants: new Set() });
    }
    this.byId.clear();
    for (const a of this.anchors) this.byId.set(a.id, a);
  }

  assignHome(e: Entity, centerX = 0, centerZ = 0, radius = 10): void {
    const theta = Math.random() * Math.PI * 2;
    const r = radius * (0.7 + Math.random() * 0.6);
    const hx = centerX + Math.cos(theta) * r + (Math.random() - 0.5) * 1.2;
    const hz = centerZ + Math.sin(theta) * r + (Math.random() - 0.5) * 1.2;
    const h: Anchor = { id: `home.${e}`, x: hx, z: hz, kind: 'home', slots: 1, occupants: new Set() };
    this.anchors.push(h);
    this.byId.set(h.id, h);
  }

  private nearestAnchor(kind: Anchor['kind'], e: Entity): Anchor | undefined {
    const p = this.ecs.positions.get(e);
    if (!p) return undefined;
    let best: Anchor | undefined; let bestD2 = Infinity;
    for (const a of this.anchors) {
      if (a.kind !== kind) continue;
      const dx = a.x - p.x; const dz = a.z - p.z; const d2 = dx * dx + dz * dz;
      if (d2 < bestD2) { bestD2 = d2; best = a; }
    }
    return best;
  }

  private goTo(e: Entity, target: { x: number; z: number }, speed = 1.1): void {
    const p = this.ecs.positions.get(e); if (!p) return;
    const a = Math.atan2(target.z - p.z, target.x - p.x);
    this.ecs.velocities.set(e, { x: Math.cos(a) * speed, y: 0, z: Math.sin(a) * speed });
  }

  private stop(e: Entity): void {
    this.ecs.velocities.set(e, { x: 0, y: 0, z: 0 });
  }

  private dist2(e: Entity, t: { x: number; z: number }): number {
    const p = this.ecs.positions.get(e); if (!p) return Infinity;
    const dx = p.x - t.x; const dz = p.z - t.z;
    return dx * dx + dz * dz;
  }

  private anchorSpot(a: Anchor, e: Entity, base = 0.4, spread = 0.6): { x: number; z: number } {
    // deterministic per-entity offset
    const seed = (e * 9301 + 49297) % 233280;
    const rand = seed / 233280;
    const angle = rand * Math.PI * 2;
    const r = base + (rand * spread);
    return { x: a.x + Math.cos(angle) * r, z: a.z + Math.sin(angle) * r };
  }

  ensure(e: Entity): void {
    if (!this.life.has(e)) this.life.set(e, { option: 'IDLE_LIFE', until: 0, timeOffsetHr: (Math.random() - 0.5) * 0.8 });
  }

  getState(e: Entity): LifeState | undefined { return this.life.get(e); }

  registerBuilding(id: string, x: number, z: number): void {
    // Map building id -> anchor kind/slots
    let kind: Anchor['kind'] = 'work';
    let slots = 2;
    if (id === 'wizard_tower') { kind = 'shrine'; slots = 3; }
    else if (id === 'forge') { kind = 'work'; slots = 2; }
    else if (id === 'scribe_hut') { kind = 'work'; slots = 1; }
    const anchor: Anchor = { id: `bld.${id}.${Math.floor(Math.random()*1e6)}`, x, z, kind, slots, occupants: new Set() };
    this.anchors.push(anchor);
    this.byId.set(anchor.id, anchor);
  }

  registerGroupHub(groupId: number, x: number, z: number): string {
    const id = `group.${groupId}.hub`;
    const a: Anchor = { id, x, z, kind: 'market', slots: 6, occupants: new Set() };
    this.anchors.push(a);
    this.byId.set(id, a);
    // create a storage entity id mirror for potential linkage via naming
    // also seed a few nearby work plots for this hub
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 6;
      const aa: Anchor = { id: `group.${groupId}.field.${i}`, x: x + Math.cos(ang) * 6, z: z + Math.sin(ang) * 6, kind: 'work', slots: 1, occupants: new Set() };
      this.anchors.push(aa);
      this.byId.set(aa.id, aa);
    }
    return id;
  }

  private releaseOccupancy(e: Entity): void {
    for (const a of this.anchors) {
      if (a.occupants.has(e)) a.occupants.delete(e);
    }
  }

  tick(world: WorldState, dt: number, simTime: number): void {
    // option changes at coarse rate
    this.lastScan += dt;
    // personal time with small offset to desync waves
    const getLocalTime = (e: Entity) => {
      const st = this.life.get(e)!;
      let t = world.timeOfDay + st.timeOffsetHr;
      if (t < 0) t += 24; else if (t >= 24) t -= 24;
      return t;
    };
    // flags will be computed per-entity using local time below

    for (const e of this.ecs.positions.keys()) {
      this.ensure(e);
      const st = this.life.get(e)!;
      const tag = this.ecs.agents.get(e);
      const job = tag?.job ?? (tag?.cohort === 'farmer' ? 'farmer' : undefined);

      // micro-scene deadline
      if (st.option === 'GREET' && simTime < st.until) {
        continue; // temporarily locked
      }

      // schedule choice by time-of-day
      const time = getLocalTime(e);
      const isBreakfast = time >= 6 && time < 7;
      const isCommute = time >= 7 && time < 8;
      const isWorkAM = time >= 8 && time < 12;
      const isLunch = time >= 12 && time < 13;
      const isWorkPM = time >= 13 && time < 18;
      const isSocial = time >= 18 && time < 21;
      const isSleep = time >= 22 || time < 5.5;
      // personality-influenced schedule
      const pers = this.ecs.personalities.get(e) ?? { sociability: 0.5, diligence: 0.5, piety: 0.5, curiosity: 0.5 };
      let desired: LifeOptionId = st.option;
      if (isSleep) desired = 'SLEEP';
      else if (isCommute) desired = 'COMMUTE';
      else if (isWorkAM || isWorkPM) desired = (job === 'farmer' || job === 'worker' || (pers.diligence > 0.6 && Math.random() < pers.diligence)) ? 'WORK_FARM' : 'COMMUTE';
      else if (isLunch) desired = 'LUNCH';
      else if (isSocial && Math.random() < 0.4 + 0.5 * pers.sociability) desired = 'SOCIALIZE';
      else if (isBreakfast && Math.random() < 0.05 + 0.3 * pers.piety) desired = 'PRAY';
      else desired = 'IDLE_LIFE';

      if (desired !== st.option) {
        this.releaseOccupancy(e);
        st.option = desired;
        st.anchorId = undefined;
      }

      // option controller
      if (st.option === 'COMMUTE') {
        // commute to work or market if no job
        let dest: Anchor | undefined;
        if (job === 'farmer' || job === 'worker') dest = this.nearestAnchor('work', e);
        else if (job === 'soldier') dest = this.nearestAnchor('misc', e) ?? this.nearestAnchor('tavern', e);
        else if (job === 'magus') dest = this.nearestAnchor('shrine', e) ?? this.nearestAnchor('tavern', e);
        else dest = this.nearestAnchor('work', e) ?? this.nearestAnchor('market', e);
        if (dest) { st.anchorId = dest.id; this.goTo(e, dest, 1.15); }
      } else if (st.option === 'WORK_FARM') {
        const dest = st.anchorId ? this.byId.get(st.anchorId) : this.nearestAnchor('work', e);
        if (dest) {
          st.anchorId = dest.id;
          const close = this.dist2(e, dest) <= 1.2 * 1.2;
          if (!close) this.goTo(e, dest, 1.0);
          else {
            // occupy if slot available; else wait nearby
            if (dest.occupants.size < dest.slots || dest.occupants.has(e)) {
              dest.occupants.add(e);
              const spot = this.anchorSpot(dest, e, 0.35, 0.5);
              if (this.dist2(e, spot) > 0.25 * 0.25) this.goTo(e, spot, 0.6);
              else this.stop(e);
            } else {
              // wait in small ring
              const angle = Math.random() * Math.PI * 2;
              const r = 1.4 + Math.random() * 0.6;
              this.goTo(e, { x: dest.x + Math.cos(angle) * r, z: dest.z + Math.sin(angle) * r }, 0.9);
            }
          }
        }
      } else if (st.option === 'LUNCH') {
        const dest = this.nearestAnchor('market', e) ?? this.nearestAnchor('tavern', e);
        if (dest) {
          st.anchorId = dest.id;
          if (this.dist2(e, dest) > 1.2 * 1.2) this.goTo(e, dest, 0.95);
          else {
            if (dest.occupants.size < dest.slots || dest.occupants.has(e)) {
              dest.occupants.add(e);
              const spot = this.anchorSpot(dest, e, 0.45, 0.7);
              if (this.dist2(e, spot) > 0.25 * 0.25) this.goTo(e, spot, 0.45); else this.stop(e);
            }
            else {
              const angle = Math.random() * Math.PI * 2; const r = 1.2 + Math.random() * 0.8;
              this.goTo(e, { x: dest.x + Math.cos(angle) * r, z: dest.z + Math.sin(angle) * r }, 0.85);
            }
          }
        }
      } else if (st.option === 'SOCIALIZE') {
        const dest = this.nearestAnchor('tavern', e) ?? this.nearestAnchor('market', e);
        if (dest) {
          st.anchorId = dest.id;
          if (this.dist2(e, dest) > 1.5 * 1.5) this.goTo(e, dest, 0.9);
          else {
            if (dest.occupants.size < dest.slots || dest.occupants.has(e)) {
              dest.occupants.add(e);
              const spot = this.anchorSpot(dest, e, 0.6, 1.0);
              if (this.dist2(e, spot) > 0.3 * 0.3) this.goTo(e, spot, 0.4); else this.stop(e);
            }
            else {
              const angle = Math.random() * Math.PI * 2; const r = 1.6 + Math.random() * 0.8;
              this.goTo(e, { x: dest.x + Math.cos(angle) * r, z: dest.z + Math.sin(angle) * r }, 0.8);
            }
          }
        }
      } else if (st.option === 'PRAY') {
        const dest = this.nearestAnchor('shrine', e) ?? this.nearestAnchor('market', e);
        if (dest) {
          st.anchorId = dest.id;
          if (this.dist2(e, dest) > 1.2 * 1.2) this.goTo(e, dest, 0.8);
          else {
            if (dest.occupants.size < dest.slots || dest.occupants.has(e)) {
              dest.occupants.add(e);
              const spot = this.anchorSpot(dest, e, 0.35, 0.4);
              if (this.dist2(e, spot) > 0.25 * 0.25) this.goTo(e, spot, 0.35); else this.stop(e);
            }
            else {
              const angle = Math.random() * Math.PI * 2; const r = 1.2 + Math.random() * 0.6;
              this.goTo(e, { x: dest.x + Math.cos(angle) * r, z: dest.z + Math.sin(angle) * r }, 0.75);
            }
          }
        }
      } else if (st.option === 'SLEEP') {
        const home = this.byId.get(`home.${e}`) ?? this.nearestAnchor('home', e);
        if (home) { st.anchorId = home.id; if (this.dist2(e, home) > 1.5 * 1.5) this.goTo(e, home, 1.0); else this.stop(e); }
      } else {
        // idle: light drift is handled by base steering; do nothing
      }
    }

    // micro-scene: greet when two are close and not busy
    if (this.lastScan >= 0.8) {
      this.lastScan = 0;
      const entities = Array.from(this.ecs.positions.keys());
      for (let i = 0; i < Math.min(entities.length, 200); i++) {
        const a = entities[Math.floor(Math.random() * entities.length)];
        const pa = this.ecs.positions.get(a)!;
        for (let j = 0; j < 4; j++) {
          const b = entities[Math.floor(Math.random() * entities.length)];
          if (a === b) continue;
          const pb = this.ecs.positions.get(b)!;
          const dx = pa.x - pb.x; const dz = pa.z - pb.z; const d2 = dx * dx + dz * dz;
          if (d2 < 2.0 * 2.0) {
            const sa = this.life.get(a)!; const sb = this.life.get(b)!;
            if (sa.option !== 'GREET' && sb.option !== 'GREET' && Math.random() < 0.05) {
              sa.option = 'GREET'; sa.until = simTime + 1.2; this.stop(a);
              sb.option = 'GREET'; sb.until = simTime + 1.2; this.stop(b);
            }
          }
        }
      }
    }
  }
}


