import { ECS } from './ecs';

export interface GridIndex {
  cellSize: number;
  map: Map<string, number[]>; // key: "x|z" -> entity ids
}

function keyFor(cx: number, cz: number): string { return cx + '|' + cz; }

export function buildUniformGrid(ecs: ECS, cellSize: number): GridIndex {
  const map = new Map<string, number[]>();
  for (const [e, p] of ecs.positions) {
    const cx = Math.floor(p.x / cellSize);
    const cz = Math.floor(p.z / cellSize);
    const k = keyFor(cx, cz);
    let bucket = map.get(k);
    if (!bucket) { bucket = []; map.set(k, bucket); }
    bucket.push(e);
  }
  return { cellSize, map };
}

export function queryNeighbors(grid: GridIndex, ecs: ECS, e: number, radius: number): number[] {
  const p = ecs.positions.get(e);
  if (!p) return [];
  const cs = grid.cellSize;
  const r = Math.ceil(radius / cs);
  const cx = Math.floor(p.x / cs);
  const cz = Math.floor(p.z / cs);
  const result: number[] = [];
  for (let dx = -r; dx <= r; dx++) {
    for (let dz = -r; dz <= r; dz++) {
      const k = keyFor(cx + dx, cz + dz);
      const bucket = grid.map.get(k);
      if (!bucket) continue;
      for (const other of bucket) if (other !== e) result.push(other);
    }
  }
  return result;
}


