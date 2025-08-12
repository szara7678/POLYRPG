import { ECS } from '../ecs';
import type { ActionId } from './utility';

type DiscreteState = number;

class DoubleQTable {
  private readonly qA = new Map<string, number>();
  private readonly qB = new Map<string, number>();
  private key(s: DiscreteState, a: number): string { return s + '|' + a; }
  get(s: DiscreteState, a: number): number {
    const k = this.key(s, a);
    return (this.qA.get(k) ?? 0) + (this.qB.get(k) ?? 0);
  }
  update(s: DiscreteState, a: number, r: number, sNext: DiscreteState, numActions: number, alpha = 0.2, gamma = 0.92): void {
    const useA = Math.random() < 0.5;
    const q1 = useA ? this.qA : this.qB;
    const q2 = useA ? this.qB : this.qA;
    const k = this.key(s, a);
    const current = q1.get(k) ?? 0;
    // argmax over q1 for next state
    let bestA = 0;
    let bestVal = -Infinity;
    for (let ai = 0; ai < numActions; ai++) {
      const val = this.get(sNext, ai);
      if (val > bestVal) { bestVal = val; bestA = ai; }
    }
    const target = r + gamma * (q2.get(this.key(sNext, bestA)) ?? 0);
    q1.set(k, current + alpha * (target - current));
  }

  updateWithTraces(
    traces: Array<{ s: DiscreteState; a: number; e: number }>,
    r: number,
    sNext: DiscreteState,
    numActions: number,
    alpha = 0.2,
    gamma = 0.92,
  ): void {
    const useA = Math.random() < 0.5;
    const q1 = useA ? this.qA : this.qB;
    const q2 = useA ? this.qB : this.qA;
    // bootstrap target via Double Q
    let bestA = 0;
    let bestVal = -Infinity;
    for (let ai = 0; ai < numActions; ai++) {
      const val = this.get(sNext, ai);
      if (val > bestVal) { bestVal = val; bestA = ai; }
    }
    const targetNext = r + gamma * (q2.get(this.key(sNext, bestA)) ?? 0);
    // apply accumulating traces style update
    for (const { s, a, e } of traces) {
      const k = this.key(s, a);
      const current = q1.get(k) ?? 0;
      const delta = targetNext - current;
      q1.set(k, current + alpha * delta * e);
    }
  }
}

const ACTIONS: ActionId[] = ['IDLE', 'PATROL', 'SCOUT', 'FARM', 'FORAGE', 'FLEE'];
const ACTION_INDEX: Record<string, number> = Object.fromEntries(ACTIONS.map((a, i) => [a, i]));

export class RLManager {
  private readonly q = new DoubleQTable();
  private readonly prevState = new Map<number, DiscreteState>();
  private readonly prevAction = new Map<number, number>();
  private readonly prevHp = new Map<number, number>();
  private readonly traces = new Map<number, Array<{ s: DiscreteState; a: number; e: number }>>();
  private readonly lambda = 0.85;
  private readonly alpha = 0.2;
  private readonly gamma = 0.92;
  private readonly lastDeltaAbs = new Map<number, number>();

  constructor(private readonly ecs: ECS) {}

  private computeState(e: number): DiscreteState {
    const p = this.ecs.positions.get(e);
    const st = this.ecs.stats.get(e);
    if (!p) {
      // entity might be getting culled; return neutral state
      const moraleLow = st ? (st.morale < 0.25 ? 1 : 0) : 0;
      const staminaLow = st ? (st.stamina < 0.3 ? 1 : 0) : 0;
      return 0 | (moraleLow << 3) | (staminaLow << 4);
    }
    const distance = Math.min(1, Math.hypot(p.x, p.z) / 40);
    const distBucket = Math.min(4, Math.floor(distance * 5)); // 0..4
    const moraleLow = st ? (st.morale < 0.25 ? 1 : 0) : 0;
    const staminaLow = st ? (st.stamina < 0.3 ? 1 : 0) : 0;
    return distBucket | (moraleLow << 3) | (staminaLow << 4);
  }

  getQBias(e: number, action: ActionId): number {
    const s = this.computeState(e);
    const ai = ACTION_INDEX[action];
    return this.q.get(s, ai);
  }

  onDecision(e: number, chosen: ActionId): void {
    const st = this.ecs.stats.get(e);
    const hp = st ? st.hp : 10;
    const s = this.computeState(e);
    const ai = ACTION_INDEX[chosen];
    // compute reward from last step
    const prevS = this.prevState.get(e);
    const prevA = this.prevAction.get(e);
    const prevHp = this.prevHp.get(e);
    if (prevS !== undefined && prevA !== undefined && prevHp !== undefined) {
      const damage = prevHp - hp; // positive if took damage
      const reward = -Math.max(0, damage) * 0.3; // negative reward for damage
      // decay and update eligibility traces for this entity
      const list = this.traces.get(e) ?? [];
      for (const t of list) t.e *= this.gamma * this.lambda;
      // accumulate for previous state-action
      list.push({ s: prevS, a: prevA, e: 1.0 });
      // cap trace list length to keep it light
      if (list.length > 8) list.shift();
      this.traces.set(e, list);
      // apply Double Q update across traces
      this.q.updateWithTraces(list, reward, s, ACTIONS.length, this.alpha, this.gamma);
      this.lastDeltaAbs.set(e, Math.abs(reward));
    }
    // store current
    this.prevState.set(e, s);
    this.prevAction.set(e, ai);
    this.prevHp.set(e, hp);
  }

  // 이벤트 기반 지연 보상 적용: 현재 상태를 sNext로 사용해 즉시 업데이트
  addReward(e: number, reward: number): void {
    const prevS = this.prevState.get(e);
    const prevA = this.prevAction.get(e);
    if (prevS === undefined || prevA === undefined) return;
    const sNext = this.computeState(e);
    this.q.update(prevS, prevA, reward, sNext, ACTIONS.length, this.alpha, this.gamma);
    this.lastDeltaAbs.set(e, Math.abs(reward));
  }

  getLastDeltaAbs(e: number): number { return this.lastDeltaAbs.get(e) ?? 0; }
}


