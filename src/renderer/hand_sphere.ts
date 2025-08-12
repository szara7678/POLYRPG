import * as THREE from 'three';

export class HandSphere {
  readonly mesh: THREE.Mesh;
  private t = 0;

  constructor(color = 0xffcc66) {
    const geom = new THREE.SphereGeometry(0.15, 16, 16);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: 0x332200, emissiveIntensity: 0.2 });
    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
  }

  follow(target: THREE.Object3D, dt: number, offset = new THREE.Vector3(0.4, 0.8, 0)): void {
    this.t += dt;
    const bob = Math.sin(this.t * 6.0) * 0.06;
    const desired = new THREE.Vector3();
    desired.copy(target.position).add(offset);
    this.mesh.position.lerp(desired, 0.2).setY((this.mesh.position.y + desired.y) * 0.5 + bob);
  }
}


