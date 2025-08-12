export interface Genes {
  magicAffinity: number; // 0..1
  lifespan: number;      // abstract
}

export function randomGenes(): Genes {
  return { magicAffinity: Math.random(), lifespan: 60 + Math.random() * 40 };
}

export function inheritGenes(a: Genes, b: Genes, mutation = 0.02): Genes {
  const blend = (x: number, y: number) => (x + y) * 0.5 + (Math.random() * 2 - 1) * mutation;
  return {
    magicAffinity: clamp01(blend(a.magicAffinity, b.magicAffinity)),
    lifespan: Math.max(20, (a.lifespan + b.lifespan) * 0.5 + (Math.random() * 2 - 1) * 5),
  };
}
export interface GeneStore { genes: Map<number, Genes> }

export function assignRandomGenes(store: GeneStore, entity: number): void {
  store.genes.set(entity, randomGenes());
}


function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }


