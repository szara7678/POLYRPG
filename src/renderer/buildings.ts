import * as THREE from 'three';
import type { Settlement } from '../engine/settlement';

export class BuildingRenderer {
  readonly group = new THREE.Group();
  private created = new Set<string>();

  constructor() {}

  private key(id: string, x: number, z: number): string { return `${id}@${x.toFixed(2)},${z.toFixed(2)}`; }

  sync(set: Settlement): void {
    for (const b of set.buildings) {
      const k = this.key(b.id, b.x, b.z);
      if (this.created.has(k)) continue;
      const mesh = this.createMesh(b.id);
      mesh.position.set(b.x, 0, b.z);
      this.group.add(mesh);
      this.created.add(k);
    }
  }

  private createMesh(id: string): THREE.Object3D {
    if (id === 'wizard_tower') {
      const g = new THREE.Group();
      const base = new THREE.CylinderGeometry(1.2, 1.2, 2, 12);
      const top = new THREE.ConeGeometry(1.0, 1.2, 12);
      const mb = new THREE.MeshLambertMaterial({ color: 0x8888aa });
      const mt = new THREE.MeshLambertMaterial({ color: 0x5566aa });
      const mbm = new THREE.Mesh(base, mb);
      const mtm = new THREE.Mesh(top, mt);
      mtm.position.y = 1.6;
      g.add(mbm); g.add(mtm);
      return g;
    }
    if (id === 'forge') {
      const body = new THREE.BoxGeometry(2, 1.2, 2);
      const roof = new THREE.ConeGeometry(1.6, 0.8, 6);
      const mb = new THREE.MeshLambertMaterial({ color: 0x996633 });
      const mr = new THREE.MeshLambertMaterial({ color: 0x663300 });
      const gb = new THREE.Mesh(body, mb);
      const gr = new THREE.Mesh(roof, mr);
      gr.position.y = 1.2;
      const g = new THREE.Group(); g.add(gb); g.add(gr);
      return g;
    }
    // default hut
    const hut = new THREE.BoxGeometry(1.5, 1, 1.5);
    const mh = new THREE.MeshLambertMaterial({ color: 0x778866 });
    return new THREE.Mesh(hut, mh);
  }
}


