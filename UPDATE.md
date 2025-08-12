## 업데이트 로그

- 2025-08-11
  - `package.json`, `tsconfig.json`, `vite.config.ts` 추가: Vite+TS 환경 구성
  - `index.html`, `src/main.ts` 추가: 기본 씬/카메라/라이트/OrbitControls, 타일/나무 인스턴싱
  - `src/renderer/*`, `src/engine/world.ts` 추가: 렌더/엔진 기초 유틸
  - `.github/workflows/deploy.yml` 추가: GH Pages 자동 배포
  - `public/404.html` 추가: SPA 라우팅 대응
  - 배포 변경: `gh-pages` 브랜치로 배포하도록 워크플로 추가(`.github/workflows/gh-pages.yml`), 기존 Pages 액션 워크플로는 수동 트리거로 전환

- 2025-08-12
  - 행동 선택에 소프트맥스 샘플링 도입(탐험 온도 사용)
    - `src/engine/ai/utility.ts`: `softmaxSample(scores, temperature)` 추가(수치 안정성 포함)
    - `src/main.ts`: 그리디 선택 → 소프트맥스 샘플링으로 변경, 디버그/레코더는 정렬 목록 유지
  - 말풍선 자동 소멸/수명 관리 추가
    - `src/renderer/emojis.ts`: TTL 관리 + `update(dt)` 추가, 1.2초 후 자동 제거
    - `src/main.ts`: 매 프레임 `bubbles.update(dt)` 호출
  - 손 구체 크기 축소
    - `src/renderer/hand_sphere.ts`: 구 반지름 0.25 → 0.15
  - 액션 유틸리티 데이터 연동(기본 역할값/비용)
    - `public/data/actions.json`: `baseRole`, `cost` 필드 추가
    - `src/engine/ai/utility.ts`: `getGameData()`를 통해 baseRole/cost 반영
  - 전투 고도화(코호트별 사거리/공속/데미지, 표적 선택/추격/이격, 사기 반영)
    - `src/engine/combat.ts` 업데이트, `spatial` 그리드 활용
  - 유틸 디버그 분해 항목 확장(N/T/R/Q/H/A/C)
    - `src/renderer/debug_panel.ts` 확장

- 2025-08-12 (추가)
  - God 패널 추가 및 편집 기능
    - `src/renderer/god_panel.ts` 신규: 스폰/선택 유닛 편집(체력/사기/진영)
    - `src/renderer/inspector.ts`: `getSelected()` 추가
    - `src/main.ts`: God 패널을 통합하여 스폰/편집 훅 연결
  - 행동 이모지 확장 및 생활감 보강
    - `src/renderer/emojis.ts`: Build/Hunt/Cast/Ritual 이모지 추가
    - `src/main.ts`: FORAGE/BUILD/HUNT 이동 패턴 추가, 이모지 표시 유지
  - UI 보조 입력 유틸
    - `src/renderer/ui_panel.ts`: `addInput`, `addNumber` 추가
  - 문서화
    - `README.md`: God 모드/이모지/사용법 갱신
  - UI/UX 보강 (2025-08-12 late)
    - 통합 컨트롤 모달(`ui_modal.ts`)에 재오픈 버튼 추가
    - 에이전트 상세 모달(`agent_modal.ts`) 단일 탭으로 정보 통합
    - 스폰 분포를 원판 랜덤으로 변경(중앙 한 줄 몰림 해결)
    - God 패널에 스폰 `Radius` 입력 추가, 코호트별 시작 행동 프라이밍

- 2025-08-13
  - Life Layer(생활 루틴 레이어) 1차 도입
    - `src/engine/life.ts` 신규: 간단 스케줄(통근/작업/점심/사교/기도/수면) + 홈/허브/작업 앵커 + 인사 마이크로 씬(1.2s 정지)
    - `src/engine/world.ts`: `timeOfDay`, `dayLengthSec`, `tickWorld` 추가(일주기/가벼운 비 변화)
    - `src/main.ts`: LifeSystem 초기화/에이전트별 홈 배정/매 프레임 `life.tick` 호출, 배경색/포그에 시간대 틴트 적용
    - `src/renderer/emojis.ts`: 생활 옵션 이모지(🚶💬🛐🛏️🍞👋) 추가, 말풍선에 생활 옵션 우선 표시
  - 스폰 정렬 현상 완화
    - `src/main.ts`: 스폰 지터 강화, separation 반발거리/힘 증가(1.2/2.2)


