import * as THREE from 'three';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - three/examples lacks types in some setups
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createBasicScene } from './renderer/scene';
import { createGroundPlane, createTileGridInstanced, createTreesInstancedGroup, createGrassInstanced } from './renderer/instancing';
import { ECS, type Cohort, type Entity } from './engine/ecs';
import { SimLoop } from './engine/sim_loop';
import { AgentRenderer } from './renderer/draw_agents';
import { InstancedAgents } from './renderer/draw_agents_instanced';
import { ChunkedTileMap } from './renderer/tilemap';
import { applyWalkBounce, wanderAndAvoid, separation, smoothFaceHeading } from './engine/steering';
import { GateSelector } from './engine/ai/bt';
import type { ActionId } from './engine/ai/utility';
// data_loader is used via game_data
import { createSettlement, addBuilding, tickSettlement, type Settlement } from './engine/settlement';
import { TelemetryHUD } from './renderer/hud';
import { GroundCameraController } from './renderer/keyboard_controls';
import { getGameData, loadGameData } from './engine/game_data';
import { DebugPanel } from './renderer/debug_panel';
import { evaluateUtilityDetailed, defaultWeights, softmaxSample } from './engine/ai/utility';
import { tickCombat, cullDead } from './engine/combat';
import { Inspector } from './renderer/inspector';
import { RLManager } from './engine/ai/rl';
import { SocialSystem } from './engine/social';
import { randomGenes, type Genes } from './engine/genetics';
import { createReproductionState, tickReproduction } from './engine/reproduction';
import { buildUniformGrid, queryNeighbors } from './engine/spatial';
import { MagicSystem } from './engine/magic';
import { createWorldState, tickWorld } from './engine/world';
import { LifeSystem } from './engine/life';
import { UIPanel } from './renderer/ui_panel';
import { CityPanel } from './renderer/ui_city';
import { UIModal } from './renderer/ui_modal';
import { DecisionRecorder } from './engine/decision_recorder';
import { EmojiBubbles } from './renderer/emojis';
import { HandSphere } from './renderer/hand_sphere';
import { Research } from './engine/research';
import { tickEconomy } from './engine/economy';
import { SimpleLOD } from './renderer/lod';
import { applyAuraEffects } from './engine/aura';
import { createAuraRing } from './renderer/aura_ring';
import { tickMorale, shouldFlee } from './engine/morale';
import { AgentMarkers } from './renderer/agent_markers';
import { BuildingRenderer } from './renderer/buildings';
import { Notifier } from './renderer/notifier';
import { GodPanel } from './renderer/god_panel';
import { AgentModal } from './renderer/agent_modal';

async function init(): Promise<void> {
  const container = document.getElementById('app');
  if (!container) throw new Error('Missing #app');
  const width = window.innerWidth;
  const height = window.innerHeight;

  // 데이터 사전 로드
  await loadGameData();

  const { scene, camera, renderer } = createBasicScene(container, width, height);
  const hud = new TelemetryHUD(document.body);
  const debug = new DebugPanel(document.body);
  const notify = new Notifier(document.body);

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
  const agentsInst = new InstancedAgents(2048);
  scene.add(agentsInst.group);
  const bubbles = new EmojiBubbles(scene);
  const hand = new HandSphere();
  scene.add(hand.mesh);
  const markers = new AgentMarkers(1024);
  scene.add(markers.group);
  const bld = new BuildingRenderer();
  scene.add(bld.group);
  const gate = new GateSelector(ecs, { candidates: ['IDLE', 'PATROL', 'FLEE'] });
  const decisions = new DecisionRecorder();
  // inspector is created after social is initialized below
  const magic = MagicSystem.fromData(getGameData().spells);
  const world = createWorldState();
  const life = new LifeSystem(ecs);
  life.seedAnchors(0, 0);
  const lod = new SimpleLOD(ecs, camera);
  const rl = new RLManager(ecs);
  const social = new SocialSystem();
  // register ritual end callback after RL/Social are ready
  magic.setOnRitualEnd((id) => {
    // 의식 종료 보상(성공 가정의 간단 모델): 근처 마법사에게 보상
    for (const [e, tag] of ecs.agents) {
      if (tag.cohort !== 'magus') continue;
      const p = ecs.positions.get(e); if (!p) continue;
      const dx = p.x - 0; const dz = p.z - (-6);
      if (dx*dx + dz*dz <= 10*10) rl.addReward(e, +0.4);
    }
  });
  const inspector = new Inspector(ecs, camera, () => agents.pickables, decisions, social, (sel) => {
    if (sel) agentModal.showFor(sel);
  });
  const agentModal = new AgentModal(document.body, ecs);
  const genes = new Map<number, Genes>();
  const repro = createReproductionState();
  // worker setup (skeleton)
  const simWorker = new Worker(new URL('./workers/sim.worker.ts', import.meta.url), { type: 'module' });
  simWorker.postMessage({ cmd: 'init' });
  let workerTicks = 0; let workerAccum = 0; let lastIds: Uint32Array | null = null;
  simWorker.onmessage = (ev) => {
    const data = ev.data as any;
    if (data && data.vels) {
      // last snapshot ids
      const ids = lastIds;
      if (ids) {
        const vels = new Float32Array(data.vels as ArrayBuffer);
        const n = ids.length;
        for (let i = 0; i < n; i++) {
          const id = ids[i];
          const vx = vels[i * 2 + 0];
          const vz = vels[i * 2 + 1];
          if (ecs.velocities.has(id)) ecs.velocities.set(id, { x: vx, y: 0, z: vz });
        }
      }
    }
    workerTicks++;
  };

  // Settlement 생성(초기에는 마나타워 없음)
  const town: Settlement = createSettlement('Home', 0, 0);
  const wizardAuraRadius = 0; // 초기 오라 없음; 타워 건설 시 반영

  // Unified modal with tabs
  const modal = new UIModal(document.body, 'Control Center');
  const tabActions = modal.addTab('actions', 'Actions');
  const tabCity = modal.addTab('city', 'City');
  const tabGod = modal.addTab('god', 'God');

  const panel = new UIPanel(tabActions, 'Actions', { embedded: true });
  const god = new GodPanel(tabGod, ecs, {
    onSpawn: ({ count, cohort, faction, hp, radius }) => {
      for (let i = 0; i < count; i++) {
        const e = ecs.create();
        const R = (radius ?? 20) * Math.sqrt(Math.random());
        const Theta = Math.random() * Math.PI * 2;
        const jitter = 2 + Math.random() * 2;
        const px = Math.cos(Theta) * R + (Math.random() - 0.5) * jitter;
        const pz = Math.sin(Theta) * R + (Math.random() - 0.5) * jitter;
        ecs.positions.set(e, { x: px, y: 0, z: pz });
        const angle = Math.random() * Math.PI * 2;
        const coh: Cohort = (cohort ?? (['infantry', 'archer', 'scout', 'magus', 'farmer'] as Cohort[])[Math.floor(Math.random() * 5)]) as Cohort;
        ecs.agents.set(e, { kind: 'human', cohort: coh });
        const speed = (1.2 + Math.random() * 0.6);
        ecs.velocities.set(e, { x: Math.cos(angle) * speed, y: 0, z: Math.sin(angle) * speed });
        ecs.brains.set(e, { decisionCooldownSec: 0.6 + Math.random() * 0.8, nextDecisionTime: 0, temperature: 1.0 });
        ecs.stats.set(e, { hp: hp ?? 10, stamina: 1, morale: 1 });
        ecs.factions.set(e, { id: faction ?? 1 });
        agents.ensureEntity(e);
        // 즉시 시작 행동 프라이밍: 코호트별 기본값
        const start: Record<string, ActionId> = { infantry: 'PATROL', archer: 'SCOUT', scout: 'SCOUT', magus: 'GARRISON' as any, farmer: 'FARM' };
        const act = start[coh] ?? 'PATROL';
        ecs.currentAction.set(e, act);
        // life home assignment
        life.assignHome(e, 0, 0, 10 + Math.random() * 4);
      }
    },
    onEditSelected: ({ hp, morale, faction }) => {
      const sel = inspector.getSelected();
      if (!sel) return;
      const st = ecs.stats.get(sel);
      if (st && hp) st.hp += hp;
      if (st && morale) st.morale = Math.min(1, st.morale + morale);
      if (faction) ecs.factions.set(sel, { id: faction });
    },
  }, true);
  const cityPanel = new CityPanel(tabCity, { embedded: true });
  // keyboard toggle for modal
  window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'm') modal.toggle(); });
  // Enter 키로도 열기(보조)
  window.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const sel = inspector.getSelected(); if (sel) agentModal.showFor(sel); } });
  const btnRitual = document.createElement('button');
  btnRitual.textContent = 'Ritual: Minor Rain (-20 mana)';
  btnRitual.onclick = () => { magic.tryStart('ritual_minor_rain', town); };
  (panel as any)['addRow'](btnRitual);
  // Research button (simple Thompson sample and coinflip success)
  const research = Research.fromData(getGameData().tech ?? { tech: [] });
  panel.addButton('Research (TS)', () => {
    const pick = research.thompsonSample();
    if (!pick) return;
    const success = Math.random() < 0.6;
    research.updateOutcome(pick.id, success);
    // RL 보상: 성공 시 마법사에게 소량 보상
    if (success) {
      for (const [e, tag] of ecs.agents) if (tag.cohort === 'magus') rl.addReward(e, +0.2);
    }
  });
  let placeMode: null | { id: string; cost: { stone?: number; iron?: number } } = null;
  const btnForge = document.createElement('button');
  btnForge.textContent = 'Build: Forge (-20 stone, -5 iron)';
  btnForge.onclick = () => {
    placeMode = { id: 'forge', cost: { stone: 20, iron: 5 } };
    notify.show('Click on ground to place Forge');
  };
  (panel as any)['addRow'](btnForge);
  panel.addLabel(() => `stone:${town.stock.stone.toFixed(1)} iron:${town.stock.iron.toFixed(1)}`);
  // time scale
  let timeScale = 1;
  panel.addButton('Time x0.5', () => { timeScale = 0.5; });
  panel.addButton('Time x1', () => { timeScale = 1; });
  panel.addButton('Time x2', () => { timeScale = 2; });
  // God tools: spawn/clear
  panel.addButton('Spawn 20', () => {
    for (let i = 0; i < 20; i++) {
      const e = ecs.create();
      const R = 20 * Math.sqrt(Math.random());
      const Theta = Math.random() * Math.PI * 2;
      const px = Math.cos(Theta) * R + (Math.random() - 0.5) * 2;
      const pz = Math.sin(Theta) * R + (Math.random() - 0.5) * 2;
      ecs.positions.set(e, { x: px, y: 0, z: pz });
      const angle = Math.random() * Math.PI * 2;
      const cohorts: Cohort[] = ['infantry', 'archer', 'scout', 'magus', 'farmer'];
      const cohort = cohorts[Math.floor(Math.random() * cohorts.length)];
      const job = Math.random() < 0.3 ? 'farmer' : Math.random() < 0.5 ? 'soldier' : 'worker';
      ecs.agents.set(e, { kind: 'human', cohort, job });
      const speed = (1.2 + Math.random() * 0.6) * cohortSpeed(cohort);
      ecs.velocities.set(e, { x: Math.cos(angle) * speed, y: 0, z: Math.sin(angle) * speed });
      ecs.brains.set(e, { decisionCooldownSec: 0.6 + Math.random() * 0.8, nextDecisionTime: 0, temperature: 1.0 });
      ecs.stats.set(e, { hp: 10, stamina: 1, morale: 1 });
      ecs.personalities.set(e, {
        sociability: Math.random(),
        diligence: Math.random(),
        piety: Math.random(),
        curiosity: Math.random(),
      });
      ecs.skills.set(e, { combat: Math.random()*0.3, farm: Math.random()*0.3, craft: Math.random()*0.3, arcana: Math.random()*0.3 });
      ecs.inventory.set(e, []);
      ecs.factions.set(e, { id: Math.random() < 0.5 ? 1 : 2 });
      agents.ensureEntity(e);
    }
  });
  panel.addButton('Assign Farmers +5', () => {
    town.jobs['farmer'] = (town.jobs['farmer'] ?? 0) + 5;
  });
  panel.addButton('Clear all', () => {
    for (const e of Array.from(ecs.positions.keys())) {
      ecs.positions.delete(e);
      ecs.velocities.delete(e);
      ecs.agents.delete(e);
      ecs.brains.delete(e);
      ecs.headingsY.delete(e);
      ecs.stats.delete(e);
      ecs.factions.delete(e);
    }
  });

  // helpers for cohort lookup
  const gd = getGameData();
  function cohortSpeed(cohort?: string): number {
    const def = gd.cohorts?.cohorts?.find((c) => c.id === cohort);
    return def?.speed ?? 1.0;
  }
  function cohortQMap(cohort?: string): Record<string, number> {
    const def = gd.cohorts?.cohorts?.find((c) => c.id === cohort);
    return def?.q ?? {};
  }

  // spawn simple agents
  for (let i = 0; i < 200; i++) {
    const e = ecs.create();
    // spawn around ring with jitter to avoid line formation
    const clusterR = 12 + Math.random() * 16; // 여러 군집으로 흩뿌리기
    const clusterTheta = Math.random() * Math.PI * 2;
    const px = Math.cos(clusterTheta) * clusterR + (Math.random() - 0.5) * 4;
    const pz = Math.sin(clusterTheta) * clusterR + (Math.random() - 0.5) * 4;
    ecs.positions.set(e, { x: px, y: 0, z: pz });
    const angle = Math.random() * Math.PI * 2;
    // assign cohort
    const cohorts: Cohort[] = ['infantry', 'archer', 'scout', 'magus', 'farmer'];
    const cohort = cohorts[Math.floor(Math.random() * cohorts.length)];
    ecs.agents.set(e, { kind: 'human', cohort });
    const speed = (1.2 + Math.random() * 0.6) * cohortSpeed(cohort);
    ecs.velocities.set(e, { x: Math.cos(angle) * speed, y: 0, z: Math.sin(angle) * speed });
    ecs.brains.set(e, { decisionCooldownSec: 0.6 + Math.random() * 0.8, nextDecisionTime: 0, temperature: 1.0 });
    ecs.stats.set(e, { hp: 10, stamina: 1, morale: 1 });
    ecs.personalities.set(e, {
      sociability: Math.random(),
      diligence: Math.random(),
      piety: Math.random(),
      curiosity: Math.random(),
    });
    ecs.skills.set(e, { combat: Math.random()*0.3, farm: Math.random()*0.3, craft: Math.random()*0.3, arcana: Math.random()*0.3 });
    ecs.inventory.set(e, []);
    ecs.factions.set(e, { id: i < 40 ? 1 : 2 });
    // 초기 유전자 저장
    genes.set(e, randomGenes());
    agents.ensureEntity(e);
    // life home assignment
    life.assignHome(e, 0, 0, 10 + Math.random() * 4);
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
  const kb = new GroundCameraController(camera, controls);
  kb.attach();

  const clock = new THREE.Clock();
  let simTime = 0;
  let lodAccum = 0;
  let rlUpdates = 0;
  let rlAccum = 0;
  function animate() {
    const dt = clock.getDelta() * timeScale;
    kb.update(dt);
    sim.step(dt);
    simTime += dt;

    // simple gate-based decisions + top-3 debug
    for (const [e, brain] of ecs.brains) {
      if (simTime >= brain.nextDecisionTime) {
        // If life layer has a strong intent, skip AI decision this tick
        const li = life.getState(e);
        if (li && li.option && li.option !== 'IDLE_LIFE' && li.option !== 'GREET') {
          brain.nextDecisionTime = simTime + brain.decisionCooldownSec;
          // also ensure movement toward the anchor when commuting/working
          const pos = ecs.positions.get(e);
          if (pos && (li.option === 'COMMUTE' || li.option === 'WORK_FARM' || li.option === 'LUNCH' || li.option === 'SOCIALIZE' || li.option === 'PRAY' || li.option === 'SLEEP')) {
            // leave to LifeSystem tick; here we just avoid zeroing velocity by AI
          }
          continue;
        }
        // evaluate a few actions with cohort Q bias (per-entity)
        const cohort = ecs.agents.get(e)?.cohort;
        const cohortQ = cohortQMap(cohort);
        // cohort-based candidate set with simple gating
        let candidates: ActionId[] = ['IDLE', 'PATROL', 'SCOUT', 'FARM', 'FORAGE', 'FLEE'];
        if (cohort === 'infantry') candidates = ['IDLE', 'PATROL', 'GARRISON', 'RAID', 'FLEE'];
        else if (cohort === 'archer') candidates = ['IDLE', 'PATROL', 'SCOUT', 'GARRISON', 'FLEE'];
        else if (cohort === 'scout') candidates = ['IDLE', 'SCOUT', 'PATROL', 'FORAGE', 'FLEE'];
        else if (cohort === 'magus') {
          const canCast = town.stock.mana >= 2;
          const canRitual = town.unlocked.has('ritual_minor_rain') || town.buildings.some(b => b.id === 'wizard_tower');
          candidates = ['IDLE', 'PATROL', 'FLEE'];
          if (canCast) candidates.push('CAST');
          if (canRitual) candidates.push('RITUAL_JOIN');
        } else if (cohort === 'farmer') candidates = ['IDLE', 'FARM', 'FORAGE', 'PATROL', 'FLEE'];
        const pos = ecs.positions.get(e)!;
        const dist = Math.min(1, Math.hypot(pos.x, pos.z) / 40);
        // 초기에는 오라 없음
        const auraFactor = 0;
        const ctx = { distanceFromCenter: dist, staminaLow: false, auraFactor };
        // morale check: strong bias to FLEE if low morale
        const fleeBias = shouldFlee(ecs, e) ? 1.2 : 0.0;
        const scored = candidates.map((a) => ({
          action: a,
          breakdown: evaluateUtilityDetailed(
            a,
            ctx,
            { ...defaultWeights, q: 0.8, role: 1, rule: 0.5, need: defaultWeights.need + (a === 'FLEE' ? fleeBias : 0) },
            cohortQ[a] ?? 0,
            rl.getQBias(e, a),
            social.getRuleBias(e, a),
          ),
        }));
        // softmax sampling instead of greedy pick
        const idx = softmaxSample(scored.map(s => s.breakdown.total), Math.max(0.1, brain.temperature));
        const action: ActionId = scored[idx].action as ActionId;
        const ranked = [...scored].sort((a, b) => b.breakdown.total - a.breakdown.total);
        debug.showTopActions(ranked, 'Top actions', e);
        decisions.set(e, ranked);
        rl.onDecision(e, action);
        ecs.currentAction.set(e, action);
        // 즉시 보상: actions.json에 정의된 instantReward 반영
        const def: any = getGameData().actions?.actions?.find((x: any) => x.id === action);
        if (def && typeof def.instantReward === 'number') rl.addReward(e, def.instantReward);
        decisions.setCurrent(e, action);
        // 사회 전파(확률적으로 사소한 소문/학습)
        if (Math.random() < 0.05) social.rumor(e, candidates, 0.02);
        rlUpdates++;
        if (action === 'PATROL') {
          const a = Math.random() * Math.PI * 2;
          const s = (1.2 + Math.random() * 0.6) * cohortSpeed(cohort);
          ecs.velocities.set(e, { x: Math.cos(a) * s, y: 0, z: Math.sin(a) * s });
        } else if (action === 'FLEE') {
          const p = ecs.positions.get(e)!;
          const a = Math.atan2(p.z, p.x) + Math.PI;
          const s = 1.6 * cohortSpeed(cohort);
          ecs.velocities.set(e, { x: Math.cos(a) * s, y: 0, z: Math.sin(a) * s });
        } else if (action === 'IDLE') {
          ecs.velocities.set(e, { x: 0, y: 0, z: 0 });
        } else if (action === 'SCOUT') {
          const a = Math.random() * Math.PI * 2;
          const s = (1.6 + Math.random() * 0.6) * cohortSpeed(cohort);
          ecs.velocities.set(e, { x: Math.cos(a) * s, y: 0, z: Math.sin(a) * s });
        } else if (action === 'CAST' && cohort === 'magus') {
          if (town.stock.mana >= 2) {
            town.stock.mana -= 2;
            // find nearest enemy and apply small damage
            let best: number | undefined; let bestD2 = Infinity;
            const myFaction = ecs.factions.get(e)?.id;
            for (const [o, op] of ecs.positions) {
              if (o === e) continue;
              if (ecs.factions.get(o)?.id === myFaction) continue;
              const dx = op.x - pos.x; const dz = op.z - pos.z;
              const d2 = dx*dx + dz*dz;
              if (d2 < bestD2) { bestD2 = d2; best = o; }
            }
            if (best !== undefined && bestD2 <= 25) { // within ~5 units
              const st = ecs.stats.get(best);
              if (st) {
                st.hp -= 2.2;
                st.morale = Math.max(0, st.morale - 0.1);
                rl.addReward(e, +0.1);
              }
            }
          }
        } else if (action === 'FARM' && cohort === 'farmer') {
          // mild drift toward center farmland
          const a = Math.atan2(-pos.z, -pos.x);
          const s = (1.0 + Math.random() * 0.3) * cohortSpeed(cohort);
          ecs.velocities.set(e, { x: Math.cos(a) * s, y: 0, z: Math.sin(a) * s });
        } else if (action === 'FORAGE') {
          // random walk with slight outward bias
          const a = Math.atan2(pos.z, pos.x) + (Math.random() - 0.5);
          const s = 1.0 * cohortSpeed(cohort);
          ecs.velocities.set(e, { x: Math.cos(a) * s, y: 0, z: Math.sin(a) * s });
        } else if (action === 'BUILD') {
          // move toward town center as if hauling
          const a = Math.atan2(-pos.z, -pos.x);
          const s = 0.8 * cohortSpeed(cohort);
          ecs.velocities.set(e, { x: Math.cos(a) * s, y: 0, z: Math.sin(a) * s });
        } else if (action === 'HUNT') {
          // chase nearest enemy wildlife (reuse enemy faction heuristic)
          let best: number | undefined; let bestD2 = Infinity;
          const myFaction = ecs.factions.get(e)?.id;
          for (const [o, op] of ecs.positions) {
            if (o === e) continue;
            if (ecs.factions.get(o)?.id === myFaction) continue;
            const dx = op.x - pos.x; const dz = op.z - pos.z;
            const d2 = dx*dx + dz*dz;
            if (d2 < bestD2) { bestD2 = d2; best = o; }
          }
          if (best !== undefined) {
            const tp = ecs.positions.get(best)!;
            const a = Math.atan2(tp.z - pos.z, tp.x - pos.x);
            const s = 1.4 * cohortSpeed(cohort);
            ecs.velocities.set(e, { x: Math.cos(a) * s, y: 0, z: Math.sin(a) * s });
          }
        }
        brain.nextDecisionTime = simTime + brain.decisionCooldownSec;
      }
    }
    // resource gather/deposit loop (per-agent)
    {
      const capacity = 3;
      for (const [e, p] of ecs.positions) {
        const inv = ecs.inventory.get(e);
        const lifeState = life.getState(e);
        const curAct = ecs.currentAction.get(e) as ActionId | undefined;
        const doFarm = lifeState?.option === 'WORK_FARM' || curAct === 'FARM';
        const doForage = curAct === 'FORAGE';
        if (doFarm || doForage) {
          const items = inv ?? [];
          const total = items.reduce((s, it) => s + it.qty, 0);
          if (total < capacity) {
            const id = doFarm ? 'food' : (Math.random() < 0.7 ? 'wood' : 'stone');
            const add = 0.06; // per frame scaled by dt below (approx since dt~const)
            const ex = items.find((it) => it.id === id);
            if (ex) ex.qty += add; else items.push({ id, qty: add });
            ecs.inventory.set(e, items);
          }
        }
        // deposit to nearest storage when carrying enough
        const items = ecs.inventory.get(e) ?? [];
        const carryTotal = items.reduce((s, it) => s + it.qty, 0);
        if (carryTotal > 0.8) {
          let bestS: number | undefined; let bestD2 = Infinity; let spx = 0; let spz = 0;
          for (const [s] of ecs.storages) {
            const sp = ecs.positions.get(s); if (!sp) continue;
            const dx = sp.x - p.x, dz = sp.z - p.z; const d2 = dx*dx + dz*dz;
            if (d2 < bestD2) { bestD2 = d2; bestS = s; spx = sp.x; spz = sp.z; }
          }
          if (bestS !== undefined) {
            if (bestD2 > 2.0 * 2.0 && Math.random() < 0.05) {
              const a = Math.atan2(spz - p.z, spx - p.x);
              ecs.velocities.set(e, { x: Math.cos(a) * 1.0, y: 0, z: Math.sin(a) * 1.0 });
            } else if (bestD2 <= 2.0 * 2.0) {
              // deposit all
              const st = ecs.storages.get(bestS);
              if (st) {
                for (const it of items) {
                  const cur = st.items.get(it.id) ?? 0;
                  st.items.set(it.id, cur + it.qty);
                }
              }
              ecs.inventory.set(e, []);
            }
          }
        }
      }
    }
    wanderAndAvoid(ecs, 35);
    // separation a bit stronger to reduce "line-up" trains
    separation(ecs, 1.2, 2.2, dt);
    smoothFaceHeading(ecs, 6.0);
    agents.syncTransforms();
    agents.animate(dt, (t) => applyWalkBounce(t));
    agentsInst.syncTransforms(ecs);
    agentsInst.animate(dt);
    markers.sync(ecs);
    agents.pruneMissing(ecs);
    // 말풍선: 생활/행동 표시를 스로틀링(초기 집중 시 혼잡 완화)
    let shown = 0;
    const maxPerFrame = 80;
    for (const e of ecs.brains.keys()) {
      const p = ecs.positions.get(e);
      if (!p) continue;
      const lifeState = life.getState(e);
      const cur = (ecs.currentAction.get(e) as ActionId | undefined) ?? (decisions.getCurrent(e) as any as ActionId | undefined);
      const kind = lifeState && lifeState.option !== 'IDLE_LIFE' ? lifeState.option : cur;
      if (kind && shown++ < maxPerFrame) bubbles.show(e, kind as any, new THREE.Vector3(p.x, 0, p.z));
    }
    // 샘플 추적: 첫 번째 에이전트를 손 구체가 따라다니게 유지
    const first = ecs.brains.keys().next().value as number | undefined;
    if (first !== undefined) {
      const obj = agents.objects.get(first) as THREE.Object3D | undefined;
      if (obj) hand.follow(obj, dt);
    }
    // update emoji bubbles lifetime
    bubbles.update(dt);
    tilemap.updateVisibility(camera, 120);
    controls.update();
    // Settlement economy + (플레이어 버튼 없이) 자동 건설 진행
    tickSettlement(town, dt);
    // 그룹 형성: 근접 밀집을 허브로 승격하고 앵커 생성(초기 1-2분 사이 산발적)
    if (Math.random() < 0.02) {
      const formed = social.formGroups(ecs);
      for (const g of formed) {
        life.registerGroupHub(g.id, g.x, g.z);
        // 그룹 창고 엔티티를 생성해 저장소 맵에 등록
        const storageE = ecs.create();
        ecs.positions.set(storageE, { x: g.x, y: 0, z: g.z });
        ecs.storages.set(storageE, { items: new Map<string, number>() });
      }
    }
    // Drive construction by nearby workers: if queue exists, attract nearby group members and progress when close
    if (town.buildQueue && town.buildQueue.length > 0) {
      const job = town.buildQueue[0];
      // create a single temporary anchor for the active job once
      if (!job.anchorId) {
        life.registerBuilding('forge', job.x, job.z);
        job.anchorId = `tmp.${Math.floor(Math.random()*1e6)}`; // marker only; life system holds actual anchor
      }
      // material reservation from nearest storages (one-off)
      if (!job.reserved) {
        const need: Record<string, number> = { ...job.req } as any;
        const sumNeed = (need.wood ?? 0) + (need.stone ?? 0) + (need.iron ?? 0);
        if (sumNeed > 0) {
          // compute totals across storages
          const totals: Record<string, number> = { wood: 0, stone: 0, iron: 0 };
          for (const [, st] of ecs.storages) {
            for (const k of Object.keys(totals)) totals[k] += st.items.get(k) ?? 0;
          }
          if ((totals.wood >= (need.wood ?? 0)) && (totals.stone >= (need.stone ?? 0)) && (totals.iron >= (need.iron ?? 0))) {
            // deduct from storages greedily
            for (const k of Object.keys(need)) {
              let left = need[k] ?? 0;
              if (left <= 0) continue;
              for (const [, st] of ecs.storages) {
                const have = st.items.get(k) ?? 0;
                const take = Math.min(have, left);
                if (take > 0) { st.items.set(k, have - take); left -= take; }
                if (left <= 0) break;
              }
              (job.req as any)[k] = 0;
            }
            job.reserved = true;
          }
        } else {
          job.reserved = true;
        }
      }
      for (const [e, tag] of ecs.agents) {
        // allow any nearby members to help, with worker/farmer prioritized by speed
        const isHelper = tag.job === 'worker' || tag.cohort === 'farmer' || Math.random() < 0.1;
        if (isHelper) {
          const p = ecs.positions.get(e); if (!p) continue;
          const dx = job.x - p.x, dz = job.z - p.z; const d2 = dx*dx + dz*dz;
          // 간단한 운반: 가까운 창고(허브 storageE)를 찾아 자재를 빼고 현장에 공급
          if (d2 > 2.0*2.0 && Math.random() < 0.02) {
            // find nearest storage
            let bestS: number | undefined; let bestD2 = Infinity;
            for (const [s, st] of ecs.storages) {
              const sp = ecs.positions.get(s); if (!sp) continue;
              const sdx = sp.x - p.x, sdz = sp.z - p.z; const sd2 = sdx*sdx + sdz*sdz;
              if (sd2 < bestD2) { bestD2 = sd2; bestS = s; }
            }
            if (bestS !== undefined) {
              const sp = ecs.positions.get(bestS)!;
              const a = Math.atan2(sp.z - p.z, sp.x - p.x);
              ecs.velocities.set(e, { x: Math.cos(a) * 1.0, y: 0, z: Math.sin(a) * 1.0 });
            }
          }
          // light steering toward site if far
          if (d2 > 2.5*2.5 && Math.random() < 0.02) {
            const a = Math.atan2(job.z - p.z, job.x - p.x);
            ecs.velocities.set(e, { x: Math.cos(a) * 0.9, y: 0, z: Math.sin(a) * 0.9 });
          }
          // if within range, progress build (only after reserved)
          if (job.reserved && d2 <= 2.0*2.0) {
            job.progress += (tag.job === 'worker' || tag.cohort === 'farmer' ? 0.7 : 0.3) * dt;
          }
        }
      }
      if (job.progress >= 1) {
        addBuilding(town, job.id, job.x, job.z);
        life.registerBuilding(job.id, job.x, job.z);
        town.buildQueue.shift();
        // 마나타워가 생겼다면 오라 링 표시 및 근접 보정 활성화
        if (job.id === 'wizard_tower') {
          const ring = createAuraRing(job.x, job.z, 10);
          scene.add(ring);
        }
      }
    }
    bld.sync(town);
    // 근처 농부 수집(간단): 전체 중 농부 직군만 추출
    const farmersNear: number[] = [];
    for (const [e, tag] of ecs.agents) if (tag.cohort === 'farmer') farmersNear.push(e);
    tickEconomy(town, world, dt, { rl, agentsNear: farmersNear });
    applyAuraEffects(ecs, [{ x: 0, z: -6, radius: wizardAuraRadius, type: 'wizard', moraleRegenPerSec: 0.15, speedMultiplier: 1.05 }], dt);
    tickMorale(ecs, dt);
    magic.tick(dt, world);
    // life schedule
    life.tick(world, dt, simTime);
    // advance world time and simple weather
    tickWorld(world, dt);
    // visual: rain tint
    (tilemap as any).setRainTint?.(world.rainIntensity);
    // time-of-day tint: sky shifts across day
    const dayT = world.timeOfDay / 24;
    const dayColor = new THREE.Color(0xa8d0ff);
    const duskColor = new THREE.Color(0xffb080);
    const nightColor = new THREE.Color(0x0a0f1a);
    let target = dayColor;
    if (world.timeOfDay >= 6 && world.timeOfDay < 18) target = dayColor;
    else if (world.timeOfDay >= 18 && world.timeOfDay < 20) target = duskColor;
    else target = nightColor;
    (scene.background as THREE.Color).lerp(target, 0.05);
    if (scene.fog) (scene.fog as any).color.lerp(target, 0.05);
    lodAccum += dt;
    if (lodAccum >= 0.25) {
      lod.updateVisibility((agents as any).objects as any, 120);
      lodAccum = 0;
    }
    social.tickDecay(dt);
    // teach nearby same cohort occasionally
    if (Math.random() < 0.2) {
      const grid = buildUniformGrid(ecs, 2.5);
      const pairs: Array<[number, number]> = [];
      let count = 0;
      for (const e of ecs.positions.keys()) {
        const cohort = ecs.agents.get(e)?.cohort;
        if (!cohort) continue;
        for (const nb of queryNeighbors(grid, ecs, e, 2.5)) {
          if (ecs.agents.get(nb)?.cohort === cohort) { pairs.push([e, nb]); if (++count > 20) break; }
        }
        if (count > 20) break;
      }
      social.teachNearby(pairs, 0.05);
    }
    rlAccum += dt;
    let rlPerSec: number | undefined = undefined;
    if (rlAccum >= 1) { rlPerSec = rlUpdates; rlUpdates = 0; rlAccum = 0; }
    const visibleCount = agents.objects ? agents.objects.size : ecs.positions.size;
    // worker step at 10Hz
    workerAccum += dt;
    if (workerAccum >= 0.1) {
      const keys = Array.from(ecs.positions.keys()).slice(0, 200);
      const n = keys.length;
      const ids = new Uint32Array(n);
      const dataArr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const id = keys[i];
        ids[i] = id;
        const p = ecs.positions.get(id)!;
        dataArr[i * 3 + 0] = p.x;
        dataArr[i * 3 + 1] = p.z;
        dataArr[i * 3 + 2] = ecs.stats.get(id)?.morale ?? 1;
      }
      lastIds = ids;
      simWorker.postMessage({ cmd: 'step', dt: workerAccum, ids: ids.buffer, data: dataArr.buffer }, [ids.buffer, dataArr.buffer]);
      workerAccum = 0;
    }
    const wrk = workerTicks >= 1 ? workerTicks : undefined; // crude per-frame display; normalized below each second if needed
    hud.update(dt, { agents: ecs.positions.size, visibleAgents: visibleCount, mana: town.stock.mana, food: town.stock.food, rlUpdatesPerSec: rlPerSec, workerTicksPerSec: wrk });
    cityPanel.update(town, (getGameData().tech?.tech ?? []).map((t) => `${t.id}:${t.alpha ?? 1}/${t.beta ?? 1}`), world);
    // 버튼 활성/비활성 갱신(해금/요건/자원)
    const canRitual = town.unlocked.has('ritual_minor_rain') || town.buildings.some(b => b.id === 'wizard_tower');
    (panel as any).setDisabled(btnRitual, !canRitual, canRitual ? '' : 'Requires wizard_tower');
    const needStone = 20, needIron = 5;
    const okForge = town.stock.stone >= needStone && town.stock.iron >= needIron;
    (panel as any).setDisabled(btnForge, !okForge, okForge ? '' : 'Insufficient resources');
    inspector.update();
    // open agent modal when there is a selection and user presses Enter
    tickCombat(ecs, dt);
    // RL 지연 보상: 처치 보상 전달
    cullDead(ecs, (killer, victim) => {
      rl.addReward(killer, +0.6);
      rl.addReward(victim, -1.0);
    });
    tickReproduction(ecs, genes, repro, dt);
    lod.updateVisibility(agents.objects as any, 120);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // click placement
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  function onClick(ev: MouseEvent) {
    if (!placeMode) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, point);
    // cost check
    const c = placeMode.cost;
    if ((c.stone ?? 0) > town.stock.stone || (c.iron ?? 0) > town.stock.iron) {
      notify.show('Not enough resources');
      return;
    }
    town.stock.stone -= c.stone ?? 0; town.stock.iron -= c.iron ?? 0;
    addBuilding(town, placeMode.id, point.x, point.z);
    placeMode = null;
  }
  renderer.domElement.addEventListener('click', onClick);
}

init();


