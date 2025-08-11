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
- `main`에 push 시 GitHub Pages 자동 배포
- SPA 라우팅을 위해 `public/404.html` 리디렉션 사용

### 현재 상태
- M0: 부트스트랩/씬/라이트/컨트롤/워크플로우 완료
- M1(진행중): 타일/나무 인스턴싱 기본 배치


