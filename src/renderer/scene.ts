import * as THREE from 'three';

export interface SceneBundle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
}

export function createBasicScene(container: HTMLElement, width: number, height: number): SceneBundle {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa8d0ff);
  scene.fog = new THREE.Fog(0xa8d0ff, 20, 120);

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 500);
  camera.position.set(12, 12, 12);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x334466, 0.7);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.7);
  dir.position.set(5, 10, 5);
  scene.add(dir);

  return { scene, camera, renderer };
}


