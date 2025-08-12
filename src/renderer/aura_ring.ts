import * as THREE from 'three';

export function createAuraRing(x: number, z: number, radius: number, color = 0x66ccff): THREE.Mesh {
  const geom = new THREE.RingGeometry(radius * 0.98, radius, 64);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.02, z);
  return mesh;
}


