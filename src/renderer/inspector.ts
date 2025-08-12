import * as THREE from 'three';
import { ECS, Entity } from '../engine/ecs';
import { SocialSystem } from '../engine/social';
import type { DecisionRecorder } from '../engine/decision_recorder';

export class Inspector {
  private readonly el: HTMLDivElement;
  private selected: Entity | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private onSelect?: (e: Entity | null) => void;

  constructor(
    private readonly ecs: ECS,
    private readonly camera: THREE.PerspectiveCamera,
    private readonly pickables: () => THREE.Object3D[],
    private readonly decisions?: DecisionRecorder,
    private readonly social?: SocialSystem,
    onSelect?: (e: Entity | null) => void,
  ) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed',
      top: '8px',
      right: '8px',
      padding: '8px 10px',
      background: 'rgba(0,0,0,0.5)',
      color: '#fff',
      font: '12px/1.2 monospace',
      borderRadius: '6px',
      zIndex: '1000',
      minWidth: '180px',
      whiteSpace: 'pre',
    } as CSSStyleDeclaration);
    document.body.appendChild(this.el);
    this.onSelect = onSelect;
    window.addEventListener('click', this.onClick, { passive: true });
  }

  dispose(): void { window.removeEventListener('click', this.onClick); }

  getSelected(): Entity | null { return this.selected; }

  private onClick = (ev: MouseEvent): void => {
    const rect = (ev.target as HTMLElement).ownerDocument.documentElement.getBoundingClientRect();
    const x = ev.clientX / rect.width * 2 - 1;
    const y = -(ev.clientY / rect.height) * 2 + 1;
    this.mouse.set(x, y);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.pickables(), true);
    if (hits.length > 0) {
      const obj = hits[0].object;
      this.selected = this.findEntity(obj);
    } else {
      this.selected = null;
    }
    this.onSelect?.(this.selected);
  };

  private findEntity(obj: THREE.Object3D): Entity | null {
    // pickables는 상위 그룹을 제공하고 children도 허용
    for (const [e, p] of this.ecs.positions) {
      // 빠른 매칭을 위해 위치 근접으로 간접 판정
      const pos = new THREE.Vector3(p.x, p.y, p.z);
      const dist = obj.getWorldPosition(new THREE.Vector3()).distanceTo(pos);
      if (dist < 0.6) return e;
    }
    return null;
  }

  update(): void {
    if (!this.selected) { this.el.textContent = 'select: none'; return; }
    const p = this.ecs.positions.get(this.selected);
    const s = this.ecs.stats.get(this.selected);
    const f = this.ecs.factions.get(this.selected);
    if (!p) { this.el.textContent = 'select: none'; return; }
    const lines = [
      `select: ${this.selected}`,
      `pos (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`,
      s ? `hp ${s.hp.toFixed(1)}  morale ${s.morale.toFixed(1)}` : 'hp -',
      f ? `faction ${f.id}` : 'faction -',
    ];
    if (this.decisions) {
      const tops = this.decisions.get(this.selected) ?? [];
      for (const t of tops) {
        lines.push(
          `${t.action}: ${t.breakdown.total.toFixed(2)} ` +
          `(N:${t.breakdown.need.toFixed(2)} T:${t.breakdown.trait.toFixed(2)} R:${t.breakdown.role.toFixed(2)} ` +
          `Q:${t.breakdown.q.toFixed(2)} H:${t.breakdown.rule.toFixed(2)} A:${t.breakdown.aura.toFixed(2)} C:${t.breakdown.cost.toFixed(2)})`
        );
      }
    }
    if (this.social) {
      const rules = this.social.listRuleBiases(this.selected);
      if (rules.length > 0) {
        lines.push('Rules:');
        for (const [act, val] of rules.slice(0, 4)) lines.push(`  ${act}: ${val.toFixed(2)}`);
      }
    }
    this.el.textContent = lines.join('\n');
  }
}


