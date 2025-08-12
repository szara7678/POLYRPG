## PolyRPG

브라우저 기반 대규모 시뮬/전술 샌드박스. `Plan.md`의 로드맵에 따라 구현됩니다.

### 폴더 구조
- `src/engine`: 프레임워크 독립 엔진 코드(시뮬/AI/월드)
- `src/renderer`: Three.js 렌더러 및 인스턴싱 유틸
- `src/workers`: Web Worker (추가 예정)
- `public`: 정적 자산

### 개발
- 의존성 설치: `npm install`
- 로컬 실행: `npm run dev`
- 빌드: `npm run build`

### 배포
- gh-pages 브랜치 배포: `main`에 push 시 `gh-pages` 브랜치로 자동 배포됩니다.
- SPA 라우팅: `public/404.html`가 리디렉션을 수행합니다.

### 현재 상태
- M0: 부트스트랩/씬/라이트/컨트롤/워크플로우 완료
- M1: 타일/나무/풀 인스턴싱 기본 배치, 에이전트 렌더(그룹/인스턴싱)
- M2: 기본 이동/스티어링(wander/avoid/separation), 간단 애니메이션 바운스
- M3: 행동 게이트 + 유틸리티 평가 + 코호트 Q 바이어스, 선택은 소프트맥스(온도)
- M4: 경량 RL(Double Q + TD(λ) 추적), 사회 전파(teach/rumor), 텔레메트리 표기
- M5(부분): 건물/경제/마법(마나비/소나기 의식), 오라 효과/표시, 연구(Thompson)

### God 모드 및 편집 기능(추가)
- 우측 상단 `Inspector`: 월드에서 에이전트를 클릭해 선택/상태 조회
- 우측 하단 `Actions`: 주문/연구/건설/시간배속/스폰 도구
- 신규 `God` 패널:
  - Spawn N, Cohort, HP, Faction 지정 후 Spawn으로 소환
  - 선택된 에이전트에 Heal +5, Morale +0.2, Faction 설정

### 이모지 행동 말풍선(확장)
- 👣 Patrol, 🏃 Flee, 🔭 Scout, 🌾 Farm, 🍄 Forage, 🏗️ Build, 🏹 Hunt, ✨ Cast, 🌀 Ritual, 💤 Idle


