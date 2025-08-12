import type { ActionId } from './ai/utility';

// 간단 사회 전파: 개인별 규칙/선호(Rule bias) 맵 유지, 교사->제자 가중 전파
export class SocialSystem {
  private readonly ruleBias = new Map<number, Map<ActionId, number>>();
  private decayPerSec = 0.02;
  private groups: { id: number; members: Set<number>; x: number; z: number }[] = [];
  private nextGroupId = 1;

  getRuleBias(entity: number, action: ActionId): number {
    const m = this.ruleBias.get(entity);
    return m?.get(action) ?? 0;
  }

  addRuleBias(entity: number, action: ActionId, delta: number): void {
    let m = this.ruleBias.get(entity);
    if (!m) { m = new Map(); this.ruleBias.set(entity, m); }
    m.set(action, (m.get(action) ?? 0) + delta);
  }

  // 교사 지식 일부를 제자에게 전파
  teach(teacher: number, apprentice: number, rate = 0.1): void {
    const t = this.ruleBias.get(teacher);
    if (!t) return;
    let a = this.ruleBias.get(apprentice);
    if (!a) { a = new Map(); this.ruleBias.set(apprentice, a); }
    for (const [act, val] of t) {
      const cur = a.get(act) ?? 0;
      a.set(act, cur + (val - cur) * rate);
    }
  }

  // 소문: 무작위 액션에 소폭 편향 추가(감쇠)
  rumor(entity: number, actions: ActionId[], strength = 0.02): void {
    const act = actions[Math.floor(Math.random() * actions.length)];
    this.addRuleBias(entity, act, (Math.random() * 2 - 1) * strength);
  }

  tickDecay(dt: number): void {
    const k = Math.exp(-this.decayPerSec * dt);
    for (const m of this.ruleBias.values()) {
      for (const [act, val] of m) {
        const nv = Math.abs(val) < 1e-4 ? 0 : val * k;
        m.set(act, nv);
      }
    }
  }

  // 근접한 동일 코호트 사이에 주기적으로 teach
  teachNearby(pairs: Array<[number, number]>, rate = 0.1): void {
    for (const [t, a] of pairs) this.teach(t, a, rate);
  }

  // 디버그/인스펙터용: 엔티티의 모든 규칙 바이어스 반환(값 큰 순)
  listRuleBiases(entity: number): Array<[ActionId, number]> {
    const m = this.ruleBias.get(entity);
    if (!m) return [];
    return Array.from(m.entries()).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])) as Array<[ActionId, number]>;
  }

  formGroups(ecs: import('./ecs').ECS): { id: number; x: number; z: number }[] {
    const formed: { id: number; x: number; z: number }[] = [];
    if (this.groups.length > 6) return formed;
    const visited = new Set<number>();
    for (const [e, p] of ecs.positions) {
      if (visited.has(e)) continue;
      const members: number[] = [];
      const ex = p.x, ez = p.z;
      for (const [o, po] of ecs.positions) {
        const dx = po.x - ex, dz = po.z - ez; const d2 = dx*dx + dz*dz;
        if (d2 <= 3.5*3.5) members.push(o);
      }
      if (members.length >= 6) {
        const gId = this.nextGroupId++;
        const g = { id: gId, members: new Set<number>(members), x: ex, z: ez };
        members.forEach((m) => visited.add(m));
        this.groups.push(g);
        formed.push({ id: gId, x: ex, z: ez });
        if (this.groups.length > 6) break;
      }
    }
    return formed;
  }

  getGroups(): ReadonlyArray<{ id: number; members: Set<number>; x: number; z: number }> { return this.groups; }
}


