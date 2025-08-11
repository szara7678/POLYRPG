export interface DataBundle<T> { url: string; data?: T }

export async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return (await res.json()) as T;
}

export async function loadAll(bundles: DataBundle<any>[]): Promise<void> {
  await Promise.all(
    bundles.map(async (b) => {
      b.data = await loadJson(b.url);
    }),
  );
}

export function assetUrl(relative: string): string {
  // BASE_URL은 vite.config.ts의 base('/polyrpg/')가 빌드 시 주입됨
  return new URL(relative, import.meta.env.BASE_URL).toString();
}


