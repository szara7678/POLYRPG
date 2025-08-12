import type { Settlement } from '../engine/settlement';
import type { WorldState } from '../engine/world';

export class CityPanel {
  private readonly el: HTMLDivElement;
  constructor(parent: HTMLElement, opts?: { embedded?: boolean }) {
    this.el = document.createElement('div');
    if (opts?.embedded) {
      Object.assign(this.el.style, {
        position: 'relative',
        padding: '8px 10px',
        background: 'rgba(0,0,0,0.35)',
        color: '#fff',
        font: '12px/1.2 monospace',
        borderRadius: '6px',
        minWidth: '160px',
      } as CSSStyleDeclaration);
    } else {
      Object.assign(this.el.style, {
        position: 'fixed',
        top: '50%',
        right: '8px',
        transform: 'translateY(-50%)',
        padding: '8px 10px',
        background: 'rgba(0,0,0,0.5)',
        color: '#fff',
        font: '12px/1.2 monospace',
        borderRadius: '6px',
        zIndex: '1000',
        minWidth: '160px',
      } as CSSStyleDeclaration);
    }
    parent.appendChild(this.el);
  }

  update(set: Settlement, techTop: string[], world?: WorldState): void {
    const unlocked = Array.from(set.unlocked.values());
    const lines = [
      `City: ${set.name}`,
      `Food: ${set.stock.food.toFixed(1)}`,
      `Mana: ${set.stock.mana.toFixed(1)}`,
      `Jobs: farmer=${set.jobs['farmer'] ?? 0}`,
      `Tech: ${techTop.slice(0, 3).join(', ')}`,
    ];
    if (world) {
      lines.push(`Rain: ${(world.rainIntensity).toFixed(2)}`);
      lines.push(`Crop+: ${(world.cropGrowthModifier).toFixed(2)}`);
    }
    if (unlocked.length > 0) {
      lines.push(`Unlocked: ${unlocked.slice(0, 3).join(', ')}`);
    }
    this.el.textContent = lines.join('\n');
  }
}


