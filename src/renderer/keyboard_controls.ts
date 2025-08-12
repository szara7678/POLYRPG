import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class GroundCameraController {
  private keys = new Set<string>();
  private moveSpeed = 10; // units/sec
  private rotateSpeed = 1.6; // rad/sec
  private zoomSpeed = 12; // units/sec (distance change)
  private tmpVec = new THREE.Vector3();

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly controls: OrbitControls,
  ) {}

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown, { passive: true });
    window.addEventListener('keyup', this.onKeyUp, { passive: true });
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase());
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  update(dt: number): void {
    const target = this.controls.target;
    const camPos = this.camera.position;

    // vector from target to camera (for forward/right)
    const toCam = this.tmpVec.copy(camPos).sub(target);
    const distance = toCam.length();
    if (distance < 1e-3) return;
    // forward on XZ plane
    const forward = toCam.clone().multiplyScalar(-1).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    let moved = false;
    const moveDelta = new THREE.Vector3();
    if (this.keys.has('w')) { moveDelta.add(forward); moved = true; }
    if (this.keys.has('s')) { moveDelta.sub(forward); moved = true; }
    if (this.keys.has('a')) { moveDelta.sub(right); moved = true; }
    if (this.keys.has('d')) { moveDelta.add(right); moved = true; }
    if (moved && moveDelta.lengthSq() > 0) {
      moveDelta.normalize().multiplyScalar(this.moveSpeed * dt);
      camPos.add(moveDelta);
      target.add(moveDelta);
    }

    // rotate around target with Q/E
    let yaw = 0;
    if (this.keys.has('q')) yaw += this.rotateSpeed * dt;
    if (this.keys.has('e')) yaw -= this.rotateSpeed * dt;
    if (Math.abs(yaw) > 1e-6) {
      const cos = Math.cos(yaw);
      const sin = Math.sin(yaw);
      const rel = camPos.clone().sub(target);
      const x = rel.x * cos - rel.z * sin;
      const z = rel.x * sin + rel.z * cos;
      rel.x = x; rel.z = z;
      camPos.copy(target).add(rel);
      this.camera.lookAt(target);
    }

    // space: zoom out (increase distance)
    if (this.keys.has(' ') || this.keys.has('space')) {
      const rel = camPos.clone().sub(target);
      const len = rel.length();
      const newLen = Math.min(200, len + this.zoomSpeed * dt);
      rel.setLength(newLen);
      camPos.copy(target).add(rel);
    }
  }
}


