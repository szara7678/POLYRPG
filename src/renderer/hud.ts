export class TelemetryHUD {
  private readonly el: HTMLDivElement;
  private lastUpdate = 0;
  private frameCount = 0;
  private fps = 0;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed',
      top: '8px',
      left: '8px',
      padding: '6px 8px',
      background: 'rgba(0,0,0,0.45)',
      color: '#fff',
      font: '12px/1.2 monospace',
      borderRadius: '6px',
      pointerEvents: 'none',
      zIndex: '1000',
      whiteSpace: 'pre',
    } as CSSStyleDeclaration);
    parent.appendChild(this.el);
  }

  update(dt: number, stats: { agents: number; mana: number; food?: number; rlUpdatesPerSec?: number; visibleAgents?: number; workerTicksPerSec?: number }): void {
    this.frameCount++;
    this.lastUpdate += dt;
    if (this.lastUpdate >= 0.5) {
      this.fps = Math.round((this.frameCount / this.lastUpdate) * 10) / 10;
      this.frameCount = 0;
      this.lastUpdate = 0;
    }
    const food = stats.food !== undefined ? `\nfood ${stats.food.toFixed(1)}` : '';
    const rl = stats.rlUpdatesPerSec !== undefined ? `\nrl ${stats.rlUpdatesPerSec.toFixed(0)}/s` : '';
    const wrk = stats.workerTicksPerSec !== undefined ? `\nwrk ${stats.workerTicksPerSec.toFixed(0)}/s` : '';
    const vis = stats.visibleAgents !== undefined ? `\nvisible ${stats.visibleAgents}` : '';
    this.el.textContent = `fps ${this.fps}\nagents ${stats.agents}${vis}\nmana ${stats.mana.toFixed(1)}${food}${rl}${wrk}`;
  }
}


