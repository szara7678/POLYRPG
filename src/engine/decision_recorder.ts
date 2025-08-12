import type { UtilityBreakdown } from './ai/utility';

export interface TopActionEntry {
  action: string;
  breakdown: UtilityBreakdown;
}

export class DecisionRecorder {
  private readonly map = new Map<number, TopActionEntry[]>();
  private readonly last = new Map<number, string>();

  set(entity: number, list: TopActionEntry[]): void {
    this.map.set(entity, list.slice(0, 3));
  }

  get(entity: number): TopActionEntry[] | undefined {
    return this.map.get(entity);
  }

  setCurrent(entity: number, action: string): void {
    this.last.set(entity, action);
  }

  getCurrent(entity: number): string | undefined {
    return this.last.get(entity);
  }
}


