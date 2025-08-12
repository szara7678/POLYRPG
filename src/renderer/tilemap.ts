import * as THREE from 'three';

interface Chunk {
  mesh: THREE.InstancedMesh;
  center: THREE.Vector3;
}

export class ChunkedTileMap {
  private readonly group = new THREE.Group();
  private readonly chunks: Chunk[] = [];
  private readonly mat: THREE.MeshLambertMaterial;

  constructor(
    private readonly worldSize = 80,
    private readonly tileSize = 2,
    private readonly chunkSize = 16, // 타일 개수 기준
  ) {
    const tilesPerSide = Math.floor(this.worldSize / this.tileSize);
    const chunksPerSide = Math.ceil(tilesPerSide / this.chunkSize);
    const planeGeom = new THREE.PlaneGeometry(this.tileSize, this.tileSize);
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });

    for (let cx = 0; cx < chunksPerSide; cx++) {
      for (let cz = 0; cz < chunksPerSide; cz++) {
        const countX = Math.min(this.chunkSize, tilesPerSide - cx * this.chunkSize);
        const countZ = Math.min(this.chunkSize, tilesPerSide - cz * this.chunkSize);
        const count = countX * countZ;
        const inst = new THREE.InstancedMesh(planeGeom, this.mat, count);
        const color = new THREE.Color();
        const dummy = new THREE.Object3D();

        let i = 0;
        for (let tx = 0; tx < countX; tx++) {
          for (let tz = 0; tz < countZ; tz++) {
            const worldX = -this.worldSize / 2 + (cx * this.chunkSize + tx) * this.tileSize + this.tileSize / 2;
            const worldZ = -this.worldSize / 2 + (cz * this.chunkSize + tz) * this.tileSize + this.tileSize / 2;
            dummy.position.set(worldX, 0, worldZ);
            dummy.rotation.x = -Math.PI / 2;
            dummy.updateMatrix();
            inst.setMatrixAt(i, dummy.matrix);

            const hue = 0.28 + (Math.random() - 0.5) * 0.02;
            const sat = 0.45 + Math.random() * 0.15;
            const light = 0.45 + Math.random() * 0.15;
            color.setHSL(hue, sat, light);
            inst.setColorAt(i, color);
            i++;
          }
        }
        inst.instanceMatrix.needsUpdate = true;
        inst.instanceColor!.needsUpdate = true;

        const centerX = -this.worldSize / 2 + (cx * this.chunkSize + countX / 2) * this.tileSize;
        const centerZ = -this.worldSize / 2 + (cz * this.chunkSize + countZ / 2) * this.tileSize;
        const center = new THREE.Vector3(centerX, 0, centerZ);
        this.group.add(inst);
        this.chunks.push({ mesh: inst, center });
      }
    }
  }

  get object3d(): THREE.Group { return this.group; }

  updateVisibility(camera: THREE.Camera, maxDistance = 120): void {
    const camPos = new THREE.Vector3();
    camera.getWorldPosition(camPos);
    const maxDistSq = maxDistance * maxDistance;
    for (const ch of this.chunks) {
      ch.mesh.visible = camPos.distanceToSquared(ch.center) <= maxDistSq;
    }
  }

  setRainTint(intensity: number): void {
    // 0..1 intensity → desaturate and darken ground slightly
    const c = new THREE.Color();
    const base = new THREE.Color(0xffffff);
    c.lerpColors(base, new THREE.Color(0x88aadd), Math.min(1, Math.max(0, intensity)) * 0.5);
    this.mat.color.copy(c);
    this.mat.needsUpdate = true;
  }
}


