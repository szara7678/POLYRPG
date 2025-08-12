import { UtilityBreakdown } from '../engine/ai/utility';
import { RLManager } from '../engine/ai/rl';

export class DebugPanel {
  private readonly el: HTMLDivElement;
  constructor(parent: HTMLElement, private readonly rl?: RLManager) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed',
      bottom: '8px',
      left: '8px',
      padding: '6px 8px',
      background: 'rgba(0,0,0,0.45)',
      color: '#fff',
      font: '12px/1.2 monospace',
      borderRadius: '6px',
      pointerEvents: 'none',
      zIndex: '1000',
      whiteSpace: 'pre',
      maxWidth: '40vw',
    } as CSSStyleDeclaration);
    parent.appendChild(this.el);
  }

  showTopActions(list: { action: string; breakdown: UtilityBreakdown }[], title = 'Top actions', entityId?: number): void {
    const lines: string[] = [];
    lines.push(title);
    const text = lines.join('') + '\n' + list
      .slice(0, 3)
      .map(({ action, breakdown }) =>
        `${action}: ${breakdown.total.toFixed(2)}  ` +
        `(N:${breakdown.need.toFixed(2)} T:${breakdown.trait.toFixed(2)} R:${breakdown.role.toFixed(2)} ` +
        `Q:${breakdown.q.toFixed(2)} H:${breakdown.rule.toFixed(2)} A:${breakdown.aura.toFixed(2)} C:${breakdown.cost.toFixed(2)})`,
      )
      .join('\n') + (entityId !== undefined && this.rl ? `\n|δ|:${this.rl.getLastDeltaAbs(entityId).toFixed(3)}` : '');
    this.el.textContent = text;
  }
}


