export interface WorldSpec {
  width: number;
  height: number;
}

export function createFlatColorHeight(x: number, z: number, width: number, height: number): number {
  const nx = x / width - 0.5;
  const nz = z / height - 0.5;
  return Math.sin(nx * 3.14) * Math.cos(nz * 3.14) * 0.25;
}


