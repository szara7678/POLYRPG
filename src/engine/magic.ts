import { Settlement } from './settlement';
import { WorldState } from './world';

interface RitualDataEffect {
  rain?: string; // e.g. "+0.4"
  crop_growth?: string; // e.g. "+0.1"
}

export interface RitualDef {
  id: string;
  type: 'ritual' | 'spell';
  participants?: number;
  cost?: { mana?: number; [k: string]: number | undefined };
  duration?: number; // seconds
  success?: RitualDataEffect;
  fail?: Record<string, string>;
  affinity?: string[];
  req?: string[];
}

export interface Ritual {
  id: string;
  duration: number; // seconds
  remaining: number; // seconds
  costMana: number;
  effect: (world: WorldState) => void;
  onEnd?: () => void;
}

export class MagicSystem {
  active: Ritual[] = [];
  private readonly defs = new Map<string, RitualDef>();
  private onEnd?: (id: string) => void;

  static fromData(data: { spells: RitualDef[] } | null | undefined): MagicSystem {
    const ms = new MagicSystem();
    if (data?.spells) for (const d of data.spells) ms.defs.set(d.id, d);
    return ms;
  }

  setOnRitualEnd(cb: (id: string) => void): void { this.onEnd = cb; }

  tryStartMinorRain(set: Settlement): boolean {
    return this.tryStart('ritual_minor_rain', set);
  }

  tryStart(id: string, set: Settlement): boolean {
    const def = this.defs.get(id);
    // fallback: built-in minor rain if not found
    if (!def) {
      const cost = 20;
      if (set.stock.mana < cost) return false;
      set.stock.mana -= cost;
      this.active.push({
        id,
        duration: 10,
        remaining: 10,
        costMana: cost,
        effect: (w) => { w.rainIntensity = Math.min(1, w.rainIntensity + 0.4); w.cropGrowthModifier += 0.1; },
      });
      return true;
    }
    // require unlocks/req
    if (def.req && !def.req.every((r) => set.buildings.some((b) => b.id === r) || set.unlocked.has(r))) return false;
    const manaCost = def.cost?.mana ?? 0;
    if (set.stock.mana < manaCost) return false;
    set.stock.mana -= manaCost;
    const duration = Math.max(1, def.duration ?? 10);
    const rainDelta = parseFloat((def.success?.rain ?? '+0') as string);
    const cropDelta = parseFloat((def.success?.crop_growth ?? '+0') as string);
    this.active.push({
      id,
      duration,
      remaining: duration,
      costMana: manaCost,
      effect: (w) => {
        if (rainDelta) w.rainIntensity = Math.min(1, w.rainIntensity + rainDelta);
        if (cropDelta) w.cropGrowthModifier += cropDelta;
      },
      onEnd: () => { this.onEnd?.(id); },
    });
    return true;
  }

  tick(dt: number, world: WorldState): void {
    for (const r of this.active) {
      r.remaining -= dt;
      // maintain effect while active (simple)
      r.effect(world);
    }
    const finished: Ritual[] = [];
    const ongoing: Ritual[] = [];
    for (const r of this.active) (r.remaining > 0 ? ongoing : finished).push(r);
    this.active = ongoing;
    for (const r of finished) r.onEnd?.();
    // decay world effects slowly back to baseline
    world.rainIntensity *= Math.exp(-dt * 0.5);
    world.cropGrowthModifier *= Math.exp(-dt * 0.2);
  }
}


