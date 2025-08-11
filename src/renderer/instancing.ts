import * as THREE from 'three';

export function createGroundPlane(size = 40): THREE.Mesh {
  const geom = new THREE.PlaneGeometry(size, size, 1, 1);
  const mat = new THREE.MeshLambertMaterial({ color: 0x8fbc8f });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.receiveShadow = false;
  return mesh;
}

export function createTreesInstancedGroup(count: number, areaSize = 40): THREE.Group {
  const group = new THREE.Group();

  const trunkGeom = new THREE.CylinderGeometry(0.08, 0.12, 1, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4f2a });
  const trunkInst = new THREE.InstancedMesh(trunkGeom, trunkMat, count);

  const crownGeom = new THREE.ConeGeometry(0.5, 1, 8);
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x2e8b57 });
  const crownInst = new THREE.InstancedMesh(crownGeom, crownMat, count);

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * areaSize;
    const z = (Math.random() - 0.5) * areaSize;
    const s = 0.7 + Math.random() * 0.8;

    dummy.position.set(x, 0.5, z);
    dummy.scale.setScalar(s);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.updateMatrix();
    trunkInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x, 1.4 * s, z);
    dummy.scale.set(s, s, s);
    dummy.updateMatrix();
    crownInst.setMatrixAt(i, dummy.matrix);
  }
  trunkInst.instanceMatrix.needsUpdate = true;
  crownInst.instanceMatrix.needsUpdate = true;

  group.add(trunkInst);
  group.add(crownInst);
  return group;
}

export function createTileGridInstanced(size: number, step: number): THREE.InstancedMesh {
  const half = size / 2;
  const countPerSide = Math.floor(size / step);
  const total = countPerSide * countPerSide;
  const geom = new THREE.PlaneGeometry(step, step);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const inst = new THREE.InstancedMesh(geom, mat, total);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  let i = 0;
  for (let xi = 0; xi < countPerSide; xi++) {
    for (let zi = 0; zi < countPerSide; zi++) {
      const x = -half + xi * step + step / 2;
      const z = -half + zi * step + step / 2;
      dummy.position.set(x, 0, z);
      dummy.rotation.x = -Math.PI / 2;
      dummy.updateMatrix();
      inst.setMatrixAt(i, dummy.matrix);
      const hue = 0.28 + Math.random() * 0.02;
      const sat = 0.45 + Math.random() * 0.15;
      const light = 0.45 + Math.random() * 0.15;
      color.setHSL(hue, sat, light);
      inst.setColorAt(i, color);
      i++;
    }
  }
  inst.instanceMatrix.needsUpdate = true;
  inst.instanceColor!.needsUpdate = true;
  return inst;
}

export function createGrassInstanced(count: number, areaSize = 40): THREE.InstancedMesh {
  const geom = new THREE.PlaneGeometry(0.25, 0.8);
  // 세로 배치
  geom.translate(0, 0.4, 0);
  const mat = new THREE.MeshLambertMaterial({ color: 0x66aa55, side: THREE.DoubleSide });
  const inst = new THREE.InstancedMesh(geom, mat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * areaSize;
    const z = (Math.random() - 0.5) * areaSize;
    const s = 0.6 + Math.random() * 0.8;
    dummy.position.set(x, 0, z);
    dummy.scale.set(s, s, s);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.updateMatrix();
    inst.setMatrixAt(i, dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}


