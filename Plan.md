1) 콘셉트 요약
스케일: 커다란 타일 월드 위에 수백수천 개의 나무·식물, 수십수백 명의 주민/동물.

핵심 특징

개인별 자가학습(경량 RL)으로 버릇/전술이 다름

유전+문화 전파로 세대별 성격/적성/주술 소질이 변함

건물/기술/마법이 도시의 개성과 전술을 바꿈

브라우저 최적화: 인스턴싱/워커/LOD로 60fps 근접 유지

God 개입(지형 편집, 축복·재앙, 지식 주입)

2) 코어 루프
월드 틱: 바이옴·성장도(grow)·날씨·레이라인(aura) 업데이트

에이전트 틱: 후보 행동(게이트형 BT) → 유틸리티 점수 → 1개 실행

결과 처리: 즉시 보상(EAT/HARVEST/격퇴) + 이벤트 기반 지연 보상(의식 성공/건설 완성/전투 결과)

학습/전파: TD(λ)+Double Q 업데이트, 휴식 중 우선 리플레이(|δ|↑), Teach/Apprentice/소문으로 규칙·레시피·주술 전파

건물/기술/마법: 직업 슬롯·오라 효과 적용, TechFragment 신뢰도 상승, 주술·의식 실행

유전/세대: 번식 조건 충족 시 후대 생성(성격 기저/적성/마법소질 상속+소변이)

3) 엔티티 & 시스템
3.1 개인(Resident/Animal)
Stats: hp, stamina, hunger, morale

Traits: Big-5 유사(호기심/이타/사교/신중/지배) + Aggro + MagicAffinity(0..1)

Aptitudes: combat/farm/craft/arcana (학습률 보정)

Brain:

Q 테이블(소수 피처): nearEnemy, cover, allyDist, staminaLow, moraleLow, resourceNear, homeland, auraType, weather

TD(λ)(α=0.2, γ=0.92, λ=0.85) + Double Q 교대 + Softmax 탐험(온도 T)

우선 리플레이(휴식 중 |δ| 상위 n건)

Rulebook: 반복 우위 패턴에 +h(소규모 고정 선호)

유전: 16~24비트 유전자(성격 기저, aptitudes, 수명, 병저항, MagicAffinity)

지식: 레시피/전술 팁/주술 단편(신뢰도 0..1)

성능 핵심: 직군 Cohort Q 공유(보병/궁수/정찰/주술사/농부…), 개인은 Δbias만 저장.

3.2 정착지(Settlement)
Stock: food/wood/stone/iron/mana

Buildings: 슬롯+오라 중심(예: Forge, Granary, Academy, WizardTower, Shrine)

Tech: DAG + TechFragment(Beta 신뢰도). Thompson Sampling으로 연구 선택.

Culture: 공용 Rulebook(도시 습관), 규범(협동도/폭력성/금기)

3.3 마법 & 세계
Ley Lines: 월드에 깔린 마나 흐름—WizardTower가 연결 시 수급↑/의식 범위↑

Auras: 타일별 속성 강도(fire/water/earth/air/life/death)

Spell:

즉시 주문: 화염구/속박/치유(개인 CAST)

Ritual: 다인 프로젝트(비기/정령소환/성역화). 성공/실패에 따른 부작용(번아웃/오염)

이벤트: 가뭄/질병/정령폭주/마나 폭풍

4) 행동 & 보상
4.1 행동셋(게이트형 BT)
PATROL, FORAGE, HUNT, FARM, BUILD, GARRISON, SCOUT, RAID, FLEE, TREAT, CAST, RITUAL_JOIN

유틸리티

r
복사
U(a)=w_need·N + w_trait·T + w_role·R + w_Q·Q̂ + w_rule·H + w_aura·A - Cost
선택: Softmax(U/T)   // ε 대신 온도 기반 탐험
4.2 보상(정규화: −1..+1)
즉시: 생존/격퇴/치유/전리품/피해

지연: 임무 성공, 의식 완료, 건물 기여, 도시 번영(식량 안전/행복)

마법 전용: 주문 성공/실패, 마나 번아웃 패널티, 오염 정화 보상

5) 그래픽 사양(Three.js, GH Pages 친화)
5.1 기본 스택
Vite + TypeScript + Three.js + OrbitControls

UI 필요 시 React/Vue는 패널 전용, 엔진은 프레임워크 밖에서.

5.2 메시/지오메트리(저폴리)
지면/타일: PlaneGeometry 인스턴싱 또는 타일 머지(Chunk 단위). 높이·바이옴은 색상/스케일로 표현.

나무(Tree): Cylinder(줄기) + Cone(수관) → InstancedMesh (수천 그루). 랜덤 스케일/회전/색상 바리에이션.

식물/풀: 얇은 Plane ×2 교차 또는 작은 Cylinder → InstancedMesh. 흔들림은 버텍스 오프셋(시간+인스턴스 ID).

사람(Human): Capsule 몸통 + Sphere 머리(그룹). 걷기 바운스: y += sin(t*speed)*amp, yaw = atan2(vx, vz).

동물(Animal): 눕힌 Capsule + 머리 구체 + 꼬리 원통. 이동은 wander/seek/avoid 스티어링.

건물(Buildings): Box/Cylinder/Cone 조합(색/오브제) + 오라(바닥 원형 Mesh).

5.3 머티리얼/라이트
재질: MeshLambertMaterial(가볍고 음영감 있음) → 필요시 MeshStandard로 승급

광원: DirectionalLight(캐스케이드X) + AmbientLight 또는 HemisphereLight. 초기 그림자 OFF(성능).

안개: scene.fog = Fog(color, near, far)로 원근감.

5.4 애니메이션
사람/동물: phase += speed*dt; model.position += vel*dt; model.rotation.y=heading; model.position.y=base + sin(phase)*amp

식물 흔들림: 간단 버텍스 셰이더 또는 프레임마다 인스턴스 회전 미세조정(셰이더가 더 저렴).

5.5 렌더 성능 목표(중급 노트북)
나무/풀: InstancedMesh 5k~20k

사람/동물: 200~400(개별 Mesh) 또는 1종류당 InstancedMesh

프레임: 60fps 목표, 대규모 전투 시에도 >45fps

6) 최적화 계획
6.1 인스턴싱/드로우콜 억제
나무/풀/건물은 InstancedMesh 필수.

인스턴스 행렬은 바뀐 것만 업데이트(더티 마스크). instanceMatrix.setUsage(DynamicDrawUsage).

6.2 업데이트 예산 분리
Render 60fps, Sim 30Hz(또는 20Hz): 고정 스텝.

BrainTick 주기: 에이전트마다 decisionCooldown(예: 0.3~1.0초).

원거리 LOD: 화면 밖/작은 개체는 상태 전이만(집계 사망/생산률), 애니메이션 OFF.

6.3 Web Worker 분리
시뮬(학습/AI/경제)은 Worker에서 계산, Transferable ArrayBuffer로 스냅샷만 전달(SharedArrayBuffer 불가).

버퍼 구성(SoA; 예시):

pos: Float32Array[N*3], rotY: Float32Array[N], state: Uint16Array[N], hp/stamina: Float32Array[N*2]

변경분만 보내기(더티 인덱스 리스트)

6.4 공간 파티셔닝
Uniform Grid(셀 크기 ~ 시야거리)로 근접 탐색 O(1)화(전투/포식/자원 채집/충돌회피).

타일/나무는 청크 단위로 활성화/비활성화.

6.5 RL 비용 절감
이벤트 기반 TD(λ): 전투 처치/사망, 수확/건설/의식 완료 등 “굵은 이벤트”에서만 업데이트.

샘플 학습 슬롯: 전체의 p%(예: 25%)만 개인 학습 ON, 나머지는 Cohort Q 참조. 슬롯은 시간 경과로 교체(지식 확산).

Tech/마법은 확률 모델(Beta)만 갱신 → 가벼움.

7) 전투/전술 & 마법 상호작용
Cohort Q로 기본 전술(엄폐/집중사격/퇴각) 결정, 개인 Δbias로 성격 반영.

사기/결속(morale/settlement cohesion)이 도주 임계에 영향.

마법 오라:

바닥 원/고리로 시각화, 내부 유닛에 버프/디버프

Ley Line 근접 시 WizardTower 오라 강화

대형 주문(의식): 범위 날씨 변경(소나기/안개), 지형 변화(불길/성역화), 정령 소환(소환수는 단순 AI)

8) 데이터 설계(외부 JSON)
bash
복사
/data
  actions.json      # 행동 정의(게이트/비용/보상)
  buildings.json    # 슬롯/오라/코스트/요건
  tech.json         # TechFragment(선행/증거가중/스펠해금)
  spells.json       # 즉시 주문/의식(참가자/리스크)
  biomes.json       # 스폰 규칙/색상/성장
  cohorts.json      # 직군별 Q 기본값/유틸 가중
예시: wizard_tower

json
복사
{
  "id": "wizard_tower",
  "jobs": {"magus": 3},
  "aura": {"mana_gain": 0.15, "ritual_range": 10},
  "cost": {"stone": 30, "crystal": 5},
  "req": ["scribe_hut"],
  "effects": ["unlock:ritual_minor_rain","teach_bonus:arcana=0.2"]
}
예시: ritual_minor_rain

json
복사
{
  "id":"ritual_minor_rain",
  "type":"ritual",
  "participants":3,
  "cost":{"mana":20,"herb":2},
  "duration":600,
  "success":{"rain":"+0.4","crop_growth":"+0.1"},
  "fail":{"mana_burnout":"0.3","madness":"0.05"},
  "affinity":["water","life"],
  "req":["wizard_tower"]
}
9) 아키텍처 & 폴더
bash
복사
/src
  /engine             # 프레임워크 독립 TS
    ecs.ts            # 경량 ECS 또는 bitecs
    world.ts          # 바이옴/성장/레이라인
    ai/
      bt.ts           # 게이트형 행동트리
      utility.ts      # 유틸리티 계산
      q_double.ts     # Double Q(λ) + 우선 리플레이
      social.ts       # Teach/Apprentice/Rumor
    sim_loop.ts       # step(dt): 고정 스텝
    genetics.ts       # 유전/적성/소질
    research.ts       # Tech(Beta) + Thompson
    magic.ts          # 오라/의식/리스크
    spatial.ts        # Uniform Grid
  /renderer           # Three.js
    scene.ts          # 씬/카메라/조명/안개
    instancing.ts     # 나무/풀/건물 InstancedMesh
    draw_agents.ts    # 사람/동물 렌더/애니
  /ui (React or Vue)  # 인스펙터/툴 패널
  /workers
    sim.worker.ts     # Web Worker(스냅샷 전송)
public/data/*.json
10) UI/UX & 디버그
인스펙터(개인/도시):

상위 3 행동과 유틸리티 분해(N/T/R/Q/Rule/A/Cost)

최근 |δ|, Rulebook 적용 항목, 유전자/적성/주술 소질

도시: Stock, 건물 슬롯, Tech 신뢰도 상위 3, 오라 맵 미니뷰

패널: 스폰/삭제, 시간 가속, 의식 개시, God 툴(비/불/치유).

시각: 타일 색(바이옴), 오라 원, 전투 히트스파크(파티클 X, 단순 메쉬).

텔레메트리: fps, 에이전트 수, 드로우콜, RL 업데이트 건수/초.

11) 성능 목표 & 수락 기준
그래픽: 10k 나무/풀 인스턴스 + 200~400 에이전트에서 >55fps(일반 노트북)

AI: 이벤트 기반 RL로 초당 TD 업데이트 ≤ 200건(피크 전투 500건)

LOD: 화면 밖 집계 모드 ON 시 동일 장면 대비 CPU 사용 40%↓

학습 체감: 동일 소대가 3~5회 교전 후 퇴각/엄폐 습관이 측정 가능(사망률 감소 ≥ 15%)

마법/의식: 비/성역화 등 오라 변화가 작물 성장/전투에 수치로 반영

유전: 3세대 경과 시 마법 소질 평균이 마나 풍부 지역에서 유의미 상승

12) 로드맵
M0 부트

Vite+TS+Three, GH Pages 배포(액션), 지면+카메라+조명

수락: 푸시→Pages 자동 배포, 기본 씬 렌더

M1 지형/바이옴/인스턴싱

타일 청크 + 나무/풀 InstancedMesh, 색상/스케일 변이

수락: 10k 인스턴스 >60fps

M2 에이전트 기본 이동

사람/동물 프리팹, wander/seek/avoid, 간단 애니

수락: 200 에이전트 55fps+

M3 AI 코어

게이트형 BT + 유틸리티 + Cohort Q 기본값

수락: 지형/적 상황에 따라 전술 차이

M4 자가학습 경량

TD(λ)+Double Q+Softmax, 이벤트 기반, 우선 리플레이

수락: 반복 교전 후 퇴각/엄폐 비율↑, 사망률↓(≥15%)

M5 건물/경제

6~8종 건물(슬롯/오라), 직업 할당, Stock 흐름

수락: 도시별 생산/전투 능력 차이

M6 기술/마법 v1

TechFragment(Beta+Thompson), WizardTower, 소규모 의식/주문

수락: 비/성역화가 농업/전투에 영향

M7 유전/문화 전파

유전자/적성/마법소질 상속, Teach/Apprentice/소문

수락: 지역별 특화(마나풍부지역=주술사↑)

M8 최적화/워커/LOD

Web Worker 스냅샷, LOD, 더티 업데이트

수락: 같은 장면에서 CPU 40%↓, >45fps(대규모 전투)

M9 UI/튜토리얼/밸런스

인스펙터/툴패널, 텔레메트리, 튜토리얼 시나리오

수락: 3분 내 농사·전투·의식 체험 가능

13) 배포(깃허브 페이지)
vite.config.ts

ts
복사
import { defineConfig } from 'vite';
export default defineConfig({ base: '/<repo-name>/' });
.github/workflows/deploy.yml

yaml
복사
name: Deploy to GitHub Pages
on: { push: { branches: [main] } }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
SPA 라우팅 시 dist/index.html을 dist/404.html로 복사.

SharedArrayBuffer 미사용(GH Pages는 COOP/COEP 헤더 X) → Transferable ArrayBuffer로 워커 통신.

14) 리스크 & 대응
프레임 드랍(대규모 전투) → 의사결정 주기 증가, 집계 전투 모드, 그림자/후처리 OFF, 이펙트 단순화

학습 폭주/불안정 → Double Q, 온도 스케줄, δ 클리핑, 규칙북 페널티/감쇠

문화 수렴 → 전이 감쇠/상한, 무작위 돌연변이, 외생 이벤트(마나 폭풍)

콘텐츠 병목 → 데이터 외부화(JSON), 템플릿·툴로 제작 속도 확보
.
