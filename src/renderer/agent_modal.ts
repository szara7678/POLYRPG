import { ECS, type Entity } from '../engine/ecs';

export class AgentModal {
  private readonly root: HTMLDivElement;
  private readonly tabs: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private selected: Entity | null = null;
  private pages = new Map<string, HTMLDivElement>();

  constructor(parent: HTMLElement, private readonly ecs: ECS) {
    this.root = document.createElement('div');
    Object.assign(this.root.style, {
      position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
      width: 'min(90vw, 820px)', background: 'rgba(12,12,18,0.92)', color: '#fff', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '10px', zIndex: '2000', display: 'none', backdropFilter: 'blur(6px)', font: '12px/1.3 monospace'
    } as CSSStyleDeclaration);
    const head = document.createElement('div');
    Object.assign(head.style, { padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between' } as CSSStyleDeclaration);
    const title = document.createElement('div'); title.textContent = 'Agent'; title.style.fontWeight = 'bold';
    const close = document.createElement('button'); close.textContent = '×'; close.style.cssText = 'background:none;border:none;color:#fff;font-size:16px;cursor:pointer;';
    close.onclick = () => this.hide();
    head.appendChild(title); head.appendChild(close);

    this.tabs = document.createElement('div');
    Object.assign(this.tabs.style, { display: 'none' } as CSSStyleDeclaration);
    this.body = document.createElement('div');
    Object.assign(this.body.style, { display: 'block', padding: '10px', whiteSpace: 'pre-wrap' } as CSSStyleDeclaration);

    this.root.appendChild(head); this.root.appendChild(this.tabs); this.root.appendChild(this.body); parent.appendChild(this.root);

    // 단일 탭(Details)로 모든 정보를 한 화면에 통합 표시
    this.addTab('details', 'Details');
  }

  private addTab(id: string, title: string): HTMLDivElement {
    const btn = document.createElement('button'); btn.textContent = title;
    btn.style.cssText = 'display:none';
    const page = document.createElement('div'); page.style.display = 'none'; this.body.appendChild(page);
    this.pages.set(id, page);
    btn.onclick = () => this.showTab(id);
    if (this.pages.size === 1) this.showTab(id);
    return page;
  }

  private showTab(id: string): void { for (const [k, p] of this.pages) p.style.display = k === id ? 'block' : 'none'; }

  showFor(entity: Entity): void {
    this.selected = entity;
    this.refresh();
    this.root.style.display = 'block';
  }

  hide(): void { this.root.style.display = 'none'; }

  refresh(): void {
    const e = this.selected; if (!e) return;
    const p = this.ecs.positions.get(e); const s = this.ecs.stats.get(e); const f = this.ecs.factions.get(e);
    const page = this.pages.get('details')!; page.innerHTML = '';
    const skills = this.ecs.skills.get(e);
    const items = this.ecs.inventory.get(e) ?? [];
    const ca = this.ecs.currentAction.get(e);
    const lines = [
      `Entity: ${e}`,
      p ? `Pos: (${p.x.toFixed(2)}, ${p.z.toFixed(2)})` : 'Pos: -',
      f ? `Faction: ${f.id}` : 'Faction: -',
      s ? `HP: ${s.hp.toFixed(1)}  Stamina: ${s.stamina.toFixed(2)}  Morale: ${s.morale.toFixed(2)}` : 'No stats',
      skills ? `Skills  Combat:${skills.combat.toFixed(2)}  Farm:${skills.farm.toFixed(2)}  Craft:${skills.craft.toFixed(2)}  Arcana:${skills.arcana.toFixed(2)}` : 'Skills: -',
      `Inventory: ${items.length ? items.map(it => `${it.id} x${it.qty}`).join(', ') : '(empty)'}`,
      `Activity: ${ca ?? '(idle)'}`,
    ];
    page.textContent = lines.join('\n');
  }
}


