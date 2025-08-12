export interface WorldSpec {
  width: number;
  height: number;
}

export function createFlatColorHeight(x: number, z: number, width: number, height: number): number {
  const nx = x / width - 0.5;
  const nz = z / height - 0.5;
  return Math.sin(nx * 3.14) * Math.cos(nz * 3.14) * 0.25;
}

export interface WorldState {
  rainIntensity: number; // 0..1
  cropGrowthModifier: number; // -1..+1
  timeOfDay: number; // 0..24 hours
  dayLengthSec: number; // seconds per day in sim
}

export function createWorldState(): WorldState {
  // 시작 시간을 출근/작업 시간대로 설정해 초기 군중 집중(기도/허브 정체)을 완화
  return { rainIntensity: 0, cropGrowthModifier: 0, timeOfDay: 9.2, dayLengthSec: 600 };
}

export function tickWorld(world: WorldState, dt: number): void {
  // advance time
  const hoursPerSec = 24 / Math.max(1, world.dayLengthSec);
  world.timeOfDay = (world.timeOfDay + hoursPerSec * dt) % 24;
  // simple seasonal/weather stub: light drizzle near dawn/dusk occasionally
  const t = world.timeOfDay;
  const isDawnOrDusk = (t > 5 && t < 7) || (t > 18 && t < 20);
  const targetRain = isDawnOrDusk && Math.random() < 0.01 ? 0.4 : 0.0;
  const k = 0.5;
  world.rainIntensity = world.rainIntensity * (1 - k * dt) + targetRain * (k * dt);
  // crop growth mod as function of rain
  world.cropGrowthModifier = world.rainIntensity * 0.5;
}


