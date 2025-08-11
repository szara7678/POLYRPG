import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createBasicScene } from './renderer/scene';
import { createGroundPlane, createTileGridInstanced, createTreesInstancedGroup, createGrassInstanced } from './renderer/instancing';
import { ECS } from './engine/ecs';
import { SimLoop } from './engine/sim_loop';
import { AgentRenderer } from './renderer/draw_agents';
import { ChunkedTileMap } from './renderer/tilemap';
import { applyWalkBounce, wanderAndAvoid } from './engine/steering';
import { GateSelector } from './engine/ai/bt';
import type { ActionId } from './engine/ai/utility';
import { loadAll, assetUrl } from './engine/data_loader';

async function init(): Promise<void> {
  const container = document.getElementById('app');
  if (!container) throw new Error('Missing #app');
  const width = window.innerWidth;
  const height = window.innerHeight;

  // 데이터 사전 로드
  await loadAll([
    { url: assetUrl('data/actions.json') },
    { url: assetUrl('data/buildings.json') },
    { url: assetUrl('data/tech.json') },
    { url: assetUrl('data/spells.json') },
    { url: assetUrl('data/biomes.json') },
    { url: assetUrl('data/cohorts.json') },
  ]);

  const { scene, camera, renderer } = createBasicScene(container, width, height);

  const ground = createGroundPlane(80);
  scene.add(ground);

  const tilemap = new ChunkedTileMap(80, 2, 16);
  scene.add(tilemap.object3d);

  const trees = createTreesInstancedGroup(1200, 70);
  scene.add(trees);

  const grass = createGrassInstanced(4000, 75);
  scene.add(grass);

  const ecs = new ECS();
  const sim = new SimLoop(ecs);
  const agents = new AgentRenderer(ecs);
  scene.add(agents.object3d);
  const gate = new GateSelector(ecs, { candidates: ['IDLE', 'PATROL', 'FLEE'] });

  // spawn simple agents
  for (let i = 0; i < 80; i++) {
    const e = ecs.create();
    ecs.positions.set(e, { x: (Math.random() - 0.5) * 30, y: 0, z: (Math.random() - 0.5) * 30 });
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 0.6;
    ecs.velocities.set(e, { x: Math.cos(angle) * speed, y: 0, z: Math.sin(angle) * speed });
    ecs.brains.set(e, { decisionCooldownSec: 0.6 + Math.random() * 0.8, nextDecisionTime: 0, temperature: 1.0 });
    agents.ensureEntity(e);
  }

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  const clock = new THREE.Clock();
  let simTime = 0;
  function animate() {
    const dt = clock.getDelta();
    sim.step(dt);
    simTime += dt;

    // simple gate-based decisions
    for (const [e, brain] of ecs.brains) {
      if (simTime >= brain.nextDecisionTime) {
        const action: ActionId = gate.tick(e);
        if (action === 'PATROL') {
          const a = Math.random() * Math.PI * 2;
          const s = 1.2 + Math.random() * 0.6;
          ecs.velocities.set(e, { x: Math.cos(a) * s, y: 0, z: Math.sin(a) * s });
        } else if (action === 'FLEE') {
          const p = ecs.positions.get(e)!;
          const a = Math.atan2(p.z, p.x) + Math.PI;
          const s = 1.6;
          ecs.velocities.set(e, { x: Math.cos(a) * s, y: 0, z: Math.sin(a) * s });
        } else if (action === 'IDLE') {
          ecs.velocities.set(e, { x: 0, y: 0, z: 0 });
        }
        brain.nextDecisionTime = simTime + brain.decisionCooldownSec;
      }
    }
    wanderAndAvoid(ecs, 35);
    agents.syncTransforms();
    agents.animate(dt, (t) => applyWalkBounce(t));
    tilemap.updateVisibility(camera, 120);
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
}

init();


