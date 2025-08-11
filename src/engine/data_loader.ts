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
  const base = (import.meta as any).env?.BASE_URL ?? '/';
  try {
    // 표준 new URL은 절대 base가 필요하므로 origin을 붙여줌
    return new URL(relative, window.location.origin + base).toString();
  } catch {
    const normalizedBase = base.endsWith('/') ? base : base + '/';
    return normalizedBase + relative.replace(/^\//, '');
  }
}


