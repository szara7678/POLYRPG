// Beta 기반 TechFragment 신뢰도 및 탐슨 샘플링 (스켈레톤)

export interface TechFragment {
  id: string;
  alpha: number; // 성공 카운트 + 1
  beta: number;  // 실패 카운트 + 1
  unlocks?: string[];
}

export class Research {
  constructor(public readonly fragments: TechFragment[]) {}

  thompsonSample(): TechFragment | null {
    if (this.fragments.length === 0) return null;
    let best = this.fragments[0];
    let bestDraw = -1;
    for (const f of this.fragments) {
      const draw = this.betaRandom(f.alpha, f.beta);
      if (draw > bestDraw) {
        bestDraw = draw;
        best = f;
      }
    }
    return best;
  }

  private betaRandom(a: number, b: number): number {
    // 간단 근사 (정식 Beta 샘플링은 추후 교체)
    const u = Math.random();
    return u ** (1 / a) / (u ** (1 / a) + (1 - u) ** (1 / b));
  }

  static fromData(data: { tech: { id: string; alpha?: number; beta?: number; unlocks?: string[] }[] }): Research {
    const frags: TechFragment[] = data.tech.map((t) => ({ id: t.id, alpha: t.alpha ?? 1, beta: t.beta ?? 1, unlocks: t.unlocks }));
    return new Research(frags);
  }

  updateOutcome(id: string, success: boolean): void {
    const f = this.fragments.find((x) => x.id === id);
    if (!f) return;
    if (success) f.alpha += 1; else f.beta += 1;
  }
}


