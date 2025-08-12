import * as THREE from 'three';

export type EmojiKind = 'PATROL' | 'FLEE' | 'SCOUT' | 'FARM' | 'FORAGE' | 'BUILD' | 'HUNT' | 'CAST' | 'RITUAL_JOIN' | 'IDLE' | 'COMMUTE' | 'SOCIALIZE' | 'PRAY' | 'SLEEP' | 'LUNCH' | 'GREET' | 'GARRISON' | 'RAID' | 'TREAT' | 'WORK_FARM';

const EMOJI_MAP: Record<EmojiKind, string> = {
  PATROL: '👣',
  FLEE: '🏃',
  SCOUT: '🔭',
  FARM: '🌾',
  FORAGE: '🍄',
  BUILD: '🏗️',
  HUNT: '🏹',
  CAST: '✨',
  RITUAL_JOIN: '🌀',
  IDLE: '💤',
  COMMUTE: '🚶',
  SOCIALIZE: '💬',
  PRAY: '🛐',
  SLEEP: '🛏️',
  LUNCH: '🍞',
  GREET: '👋',
  GARRISON: '🏰',
  RAID: '⚔️',
  TREAT: '⛑️',
  WORK_FARM: '🌾',
};

export class EmojiBubbles {
  private readonly group = new THREE.Group();
  private readonly pool: THREE.Sprite[] = [];
  private readonly byEntity = new Map<number, THREE.Sprite>();
  private readonly ttl = new Map<number, number>();
  private readonly loader = new THREE.TextureLoader();
  private cache = new Map<string, THREE.Texture>();
  private readonly defaultLifetime = 1.2; // seconds

  constructor(parent: THREE.Scene) {
    parent.add(this.group);
  }

  private makeTexture(text: string): THREE.Texture {
    if (this.cache.has(text)) return this.cache.get(text)!;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = '40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, size / 2, size / 2 + 2);
    const tex = new THREE.CanvasTexture(canvas);
    this.cache.set(text, tex);
    return tex;
  }

  private getSprite(): THREE.Sprite {
    const sprite = this.pool.pop() ?? new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
    sprite.scale.set(0.9, 0.9, 0.9);
    return sprite;
  }

  show(entity: number, kind: EmojiKind, position: THREE.Vector3): void {
    const emoji = EMOJI_MAP[kind] ?? '❓';
    const tex = this.makeTexture(emoji);
    let sprite = this.byEntity.get(entity);
    if (!sprite) {
      sprite = this.getSprite();
      this.group.add(sprite);
      this.byEntity.set(entity, sprite);
    }
    (sprite.material as THREE.SpriteMaterial).map = tex;
    sprite.position.copy(position).add(new THREE.Vector3(0, 1.6, 0));
    sprite.visible = true;
    this.ttl.set(entity, this.defaultLifetime);
  }

  hide(entity: number): void {
    const s = this.byEntity.get(entity);
    if (!s) return;
    s.visible = false;
    this.group.remove(s);
    this.pool.push(s);
    this.byEntity.delete(entity);
    this.ttl.delete(entity);
  }

  update(dt: number): void {
    for (const [e, t] of Array.from(this.ttl.entries())) {
      const nt = Math.max(0, t - dt);
      if (nt <= 0) {
        this.hide(e);
      } else {
        this.ttl.set(e, nt);
      }
    }
  }
}


