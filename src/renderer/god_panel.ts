import { UIPanel } from './ui_panel';
import { ECS, type Cohort, type Entity } from '../engine/ecs';
import type * as THREE from 'three';

export interface GodPanelOptions {
  onSpawn?: (opts: { count: number; cohort?: Cohort; faction?: number; hp?: number; radius?: number }) => void;
  onEditSelected?: (opts: { hp?: number; morale?: number; faction?: number }) => void;
  onGiveItem?: (id: string, amount: number) => void;
  onPlaceMode?: (id: string) => void;
}

export class GodPanel {
  private readonly panel: UIPanel;
  private numSpawn = 5;
  private cohort: Cohort | undefined = undefined;
  private faction = 1;
  private hp = 10;
  private radius = 20;

  constructor(parent: HTMLElement, private readonly ecs: ECS, private readonly opts: GodPanelOptions = {}, embedded = false) {
    this.panel = new UIPanel(parent, 'God', { embedded });
    // Spawn controls
    this.panel.addNumber('Spawn N', this.numSpawn, (v) => this.numSpawn = Math.max(1, Math.floor(v)));
    this.panel.addInput('Cohort', '', (v) => { this.cohort = (v as Cohort) || undefined; });
    this.panel.addNumber('HP', this.hp, (v) => this.hp = v);
    this.panel.addNumber('Faction', this.faction, (v) => this.faction = Math.max(1, Math.floor(v)));
    this.panel.addNumber('Radius', this.radius, (v) => this.radius = Math.max(1, v));
    this.panel.addButton('Spawn', () => {
      this.opts.onSpawn?.({ count: this.numSpawn, cohort: this.cohort, faction: this.faction, hp: this.hp, radius: this.radius });
    });

    // Selected edit controls
    this.panel.addButton('Heal +5 (selected)', () => this.opts.onEditSelected?.({ hp: +5 }));
    this.panel.addButton('Morale +0.2 (selected)', () => this.opts.onEditSelected?.({ morale: +0.2 }));
    this.panel.addButton('Set Faction 1 (selected)', () => this.opts.onEditSelected?.({ faction: 1 }));
    this.panel.addButton('Set Faction 2 (selected)', () => this.opts.onEditSelected?.({ faction: 2 }));
  }
}


