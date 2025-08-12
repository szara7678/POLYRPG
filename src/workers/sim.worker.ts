// 스냅샷 기반 워커 스켈레톤 (SharedArrayBuffer 미사용)
// 주 스레드 -> 워커: 입력(명령/파라미터)
// 워커 -> 주 스레드: 스냅샷(positions/hp 등) Transferable(ArrayBuffer)

// Transferable snapshot protocol
// ids: Uint32Array(N)
// data: Float32Array(N*3) -> [x,z,morale] per entity
export interface StepInput { cmd: 'step'; dt: number; ids: ArrayBuffer; data: ArrayBuffer }
export interface InitInput { cmd: 'init' }
export type SimInput = StepInput | InitInput;

function decideVelocity(e: EntitySnap): { vx: number; vz: number; action: 'PATROL' | 'FLEE' | 'IDLE' } {
  if (e.morale < 0.25) {
    const ang = Math.atan2(e.z, e.x) + Math.PI;
    const s = 1.6;
    return { vx: Math.cos(ang) * s, vz: Math.sin(ang) * s, action: 'FLEE' };
  }
  // simple patrol
  const ang = Math.random() * Math.PI * 2;
  const s = 1.2;
  return { vx: Math.cos(ang) * s, vz: Math.sin(ang) * s, action: 'PATROL' };
}

self.onmessage = (ev: MessageEvent<SimInput>) => {
  const data = ev.data;
  if (data.cmd === 'init') {
    self.postMessage({ ok: true });
    return;
  }
  if (data.cmd === 'step') {
    const ids = new Uint32Array(data.ids);
    const arr = new Float32Array(data.data);
    const n = ids.length;
    const vels = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      const id = ids[i];
      const x = arr[i * 3 + 0];
      const z = arr[i * 3 + 1];
      const morale = arr[i * 3 + 2];
      const d = decideVelocity({ id, x, z, morale });
      vels[i * 2 + 0] = d.vx;
      vels[i * 2 + 1] = d.vz;
    }
    self.postMessage({ vels }, [vels.buffer]);
  }
};


