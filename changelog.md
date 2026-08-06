# Changelog

## 2026-08-06 21:41:10 +09:00 | Planner | 설계 전 요구사항 완전성 분석

- 대상: `E:\Work\20260806\party_night`의 현재 프로젝트 문서
- 사용자 작업 지시 원문: `현재 프로젝트의 agents.md를 분석하고 설계를 진행하기 전 누락되거나 추가로 입력 되어야 할 사항이 있는지 확인 할 것.`
- 사용한 기준 문서: `AGENTS.md`; 비교 참고 자료 `__AGENTS_original.md`
- 조사 범위: 프로젝트 루트 파일 목록, 현재 `AGENTS.md` 전체, 원본 비교 문서 전체, 코드·설정·설계 문서 존재 여부
- 생성·갱신 문서: `architecture.md`, `changelog.md`
- 결정 근거: 현재 `AGENTS.md`가 MVP 목표·범위·기술·책임 경계·핵심 규칙·검증 기준과 미확정 사항의 임시 결정 원칙을 제공하므로 상위 설계를 차단할 누락은 없다고 판단했다. 구현 가능한 상세 설계에는 선택형 요구사항의 명시가 필요하다.
- 핵심 결과: 설계는 조건부 착수 가능하다. 동료 구성, 조우 방식, 콘텐츠 수치, 리롤 규칙, 전투 입력 흐름, 맵·퀘스트 완료 조건을 높은 우선도의 설계 입력으로 식별했다. 사용자 응답이 없을 때 적용 가능한 단순 임시 결정을 함께 제안했다.
- 위험·미확정 사항: 코드와 빌드 설정이 없어 실행 상태는 검증하지 못했다. React–Phaser 입력 소유권, 브라우저 저장 범위, 실제 모바일 검증 환경, 장기 요구사항 문서의 향후 지위가 미확정이다.

## 2026-08-06 21:44:14 +09:00 | Planner | MVP 구현 설계

- 대상: `E:\Work\20260806\party_night`의 첫 번째 동작 산출물
- 사용자 작업 지시 원문: `임시결정해서 설계를 수행해줘.`
- 사용한 기준 문서: `AGENTS.md`, `architecture.md`; 비교 참고 자료 `__AGENTS_original.md`
- 조사 범위: 기존 요구사항 완전성 분석, MVP 포함·제외 범위, 기술 책임 경계, 게임 규칙, 화면·입력 기준, 테스트 및 완료 기준
- 생성·갱신 문서: `implements.md` 생성, `architecture.md` 및 `changelog.md` 갱신
- 결정 근거: 사용자가 미확정 사항의 임시 결정을 허용했고, `AGENTS.md`가 가장 단순한 기본값과 세로 확장보다 동작하는 전체 플레이 루프를 우선하도록 규정한다.
- 핵심 결과: 고정 동료 3명, 고정 조우, 7×7 맵, 직업별 임시 능력치·스킬, 궁수 선택 리롤, 적 2종, 고정 보상, 단일 store, 명령·이벤트 경계, localStorage 최소 저장, 자동·수동 검증 및 6단계 구현 계획을 확정했다.
- 위험·미확정 사항: 모든 콘텐츠 수치는 MVP 임시값이다. 실제 코드·빌드 설정·실기기 환경이 없어 구현 및 실행 검증은 수행하지 않았다. 최소 브라우저 버전, 최종 에셋·밸런스, 장기 서버·성장 시스템은 미확정이다.

## 2026-08-06 22:04:57 +09:00 | Coder | Git 저장소 상태 재확인

- 작업 루트·모드: `E:\Work\20260806\party_night` | 원본 직접 작업
- 사용자 작업 지시 원문: `현재 경로에 대해서 git저장소인지 다시 확인 해볼 것.`
- 사용한 설계문서: 해당 없음
- 조사 범위: Git work tree, 저장소 최상위 경로, 현재 브랜치, upstream 및 remote
- 검증 단계: 1단계 기본 검증 중 저장소 상태 확인
- 변경 파일: `changelog.md`
- 결정 근거 및 결과: `git rev-parse`, `git status`, `git remote`로 재확인한 결과 현재 경로는 Git 저장소이며 `main` 브랜치가 `origin/main`을 추적한다. 원격은 `https://github.com/orcspy/party_night.git`이다.
- 실패·미확정 사항: 패키지 설치 승인과 최종 검증 단계 선택은 아직 확인되지 않았다.

## 2026-08-06 22:20:56 +09:00 | Coder | MVP 최초 구현

- 작업 루트·모드: `E:\Work\20260806\party_night` | 원본 직접 작업
- 사용자 작업 지시 원문:
  - `/agent Coder`
  - `설계문서를 참고하여 작업을 진행해줘. 진행 완료 후 github에도 적용할 것.`
  - `승인.`
- 사용한 설계문서: `implements.md` 최우선, `architecture.md`, `AGENTS.md`
- 조사 범위: 저장소 상태, 설계된 프로젝트 구조·게임 상태·명령·이벤트, 전투·탐사 규칙, React–Phaser 경계, 저장·모바일 UI·테스트·실행 계약
- 검증 단계: 1단계 기본 검증
- 변경 파일: `.gitignore`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `README.md`, `src/main.tsx`, `src/styles.css`, `src/app/App.tsx`, `src/app/gameStore.ts`, `src/game/{types,rng,content,exploration,combat}.ts`, `src/phaser/{PhaserGame,ExplorationScene,BattleScene}.ts`, `src/ui/{SetupScreen,GameHud,BattleCommands,ResultScreen}.tsx`, `src/tests/{rng,combat,exploration}.test.ts`, `changelog.md`
- 결정 근거: 설계의 고정 파티·7×7 맵·고정 조우·직업 수치·리롤·보상·최소 저장 사양을 그대로 적용하고, 추가 상태 관리·라우팅 라이브러리 없이 단일 store와 순수 TypeScript 엔진을 사용했다. 외부 폰트 네트워크 의존은 제거했다.
- 핵심 구현: 시작/준비/탐사/전투/결과 전체 루프, 시드 PRNG, AGI 행동 순서, d6·선택 리롤·피해·승패, 고정 적 AI, 1인칭 도형 탐사, Phaser 결과 연출, React 명령 UI·로그, `localStorage` 프로필·누적 보상, 모바일 가로·safe area·세로 회전 안내를 구현했다.
- 호환성·의존성 변경: React 19, Phaser 3.90, Vite 6.4.3, TypeScript 5.7, Vitest 3.2.7을 등록하고 `package-lock.json`으로 고정했다. 보안 취약 버전이었던 초기 Vite/Vitest 잠금값을 같은 메이저의 수정 버전으로 교체했으며 `npm audit` 결과 취약점 0건이다.
- 검증 결과: `npm run typecheck` 성공. `npm test -- --run src/tests/combat.test.ts`에서 1개 파일·8개 테스트 성공. `npm audit` 취약점 0건. 최초 타입 검사에서 `.ts` 파일의 JSX 구문 오류를 확인해 `React.createElement`로 수정한 뒤 재검증했다.
- 실패·미확정 사항: 1단계 범위에 따라 전체 테스트, production build, 애플리케이션 실제 실행, 모바일 실기기 및 수동 플레이 시나리오는 실행하지 않았다. 임시 콘텐츠 수치·도형 그래픽과 장기 기능은 설계대로 미확정 또는 제외 상태다.

## 2026-08-06 22:31:04 +09:00 | Coder | 사용자 기본 플레이 검증 결과 기록 및 후속 단계 정리

- 작업 루트·모드: `E:\Work\20260806\party_night` | 원본 직접 작업
- 사용자 작업 지시 원문: `기본 테스트는 진행 했어. 플레이어 설정후 입장 던전 탐사와 전투, 출구진입 후 결산 단계까지 확인. \n이제 이후의 남은 진행 단계를 정리해서 출력해줘.`
- 사용한 설계문서: `implements.md`, `AGENTS.md`
- 조사 범위: 사용자 수동 검증 결과와 `implements.md`의 구현 단계·완료 기준 비교
- 검증 단계: 사용자 수행 수동 기본 플레이 검증 결과 기록
- 변경 파일: `changelog.md`
- 결정 근거 및 결과: 사용자가 플레이어 설정부터 던전 탐사, 전투, 출구 진입, 결산까지 핵심 성공 루프를 확인했다. 남은 항목은 자동 회귀 검증, 패배·저장·리롤 경계 시나리오, production build, 모바일 실기기 검증, 발견 결함 수정과 MVP 완료 판정 순으로 정리한다.
- 실패·미확정 사항: 패배 흐름, 새로고침 저장 복구, 모바일 iOS/Android 실기기, 전체 테스트·build 결과는 아직 보고되지 않았다.

## 2026-08-06 22:36:26 +09:00 | Coder | 전체 자동 테스트 및 production build 결과 기록

- 작업 루트·모드: `E:\Work\20260806\party_night` | 원본 직접 작업
- 사용자 작업 지시 원문: `npm run test 완료. npm run build 완료.\n============================\nnpm run build\n\n> party-night@0.1.0 build\n> tsc -b && vite build\n\nvite v6.4.3 building for production...\n✓ 44 modules transformed.\ndist/index.html                     0.50 kB │ gzip:   0.31 kB\ndist/assets/index-Dbz0DAia.css      6.39 kB │ gzip:   2.21 kB\ndist/assets/index-B1RGQ7q5.js   1,698.02 kB │ gzip: 409.12 kB\n\n(!) Some chunks are larger than 500 kB after minification. Consider:\n- Using dynamic import() to code-split the application\n- Use build.rollupOptions.output.manualChunks to improve chunking: https://rollupjs.org/configuration-options/#output-manualchunks\n- Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.\n✓ built in 6.83s\n============================\n빌드 로그 참조.`
- 사용한 설계문서: `implements.md`, `AGENTS.md`
- 조사 범위: 사용자가 보고한 전체 자동 테스트 완료 여부와 Vite production build 로그
- 검증 단계: 사용자 수행 전체 자동 테스트 및 production build
- 변경 파일: `changelog.md`
- 결정 근거 및 결과: `npm run test`가 완료되었고 `npm run build`가 44개 모듈을 변환해 6.83초에 성공했다. 생성된 주요 JS 청크는 1,698.02 kB, gzip 409.12 kB이다.
- 실패·미확정 사항: 빌드 실패는 없다. 500 kB를 초과한 JS 청크 경고가 있으나 MVP 진행을 막는 오류는 아니다. 현재 콘텐츠 규모에서는 즉시 코드 분할을 추가하지 않고 모바일 초기 로딩·메모리 측정에서 실제 문제가 확인될 때 최적화하는 것이 `AGENTS.md`의 조기 최적화 금지 원칙에 부합한다. 패배·저장 경계 시나리오와 모바일 실기기 검증은 아직 미확정이다.

## 2026-08-06 22:38:21 +09:00 | Coder | 모바일 실기기 테스트 절차 안내

- 작업 루트·모드: `E:\Work\20260806\party_night` | 원본 직접 작업
- 사용자 작업 지시 원문: `현재 상태에서 pc에서 test, build, 실 플레이(npm run dev)는 확인 했지만 모바일 환경에서 테스트는 어떻게 하는가?`
- 사용한 설계문서: `implements.md`, `AGENTS.md`
- 조사 범위: Vite 개발·preview 서버의 LAN 접근 방식과 Android Chrome·iOS Safari 수동 검증 항목
- 검증 단계: 실행 절차 안내; 명령 미실행
- 변경 파일: `changelog.md`
- 결정 근거 및 결과: PC와 모바일을 같은 신뢰 가능한 LAN에 연결하고 Vite 서버를 `--host`로 바인딩한 뒤 PC의 사설 IP와 포트로 접속하는 절차를 우선 제시한다. 실제 배포 번들 확인에는 `npm run preview -- --host`를 사용한다.
- 실패·미확정 사항: 현재 PC의 사설 IP, Windows 방화벽 허용 상태, 사용 가능한 Android/iOS 기기와 브라우저 버전은 확인하지 않았다.

## 2026-08-06 23:00:55 +09:00 | Coder | Android 실기기 검증 결과 및 iOS 접속 원인 분석

- 작업 루트·모드: `E:\Work\20260806\party_night` | 원본 직접 작업
- 사용자 작업 지시 원문: `android에서는 문제 없이 접속 되고 진행 되었어, iOS Safari에서는 접속 시 "연결된 네트워크가 비공개가 아님" 문제가 발생하고 있음. 아래의 결과는 android 타블렛에서의 테스트 결과임. 원인만 분석 후 iOS는 우선 지원 대상에서 제외.\n가로 화면에서 전체 ui가 표시가 되었어. ( 타블렛 가로 화면 )\n세로 화면에서는 가로 회전 안내 표시됨.\nSafe Area와 브라우저 주소창 변화에 UI가 가려지지 않는지. : 타블렛 화면에서는 가져지지 않음.\n이동 버튼은 정확함.\n빠른 연속 터치로 중복 행동 없음.\n스크롤, 확대는 안되지만 텍스트 부분에 롱터치를 할 경우 텍스트 선택이 발생함.\n전투명령, 대상 선택, 리롤은 정확함.\n백그라운드 후 복구됨\n저장 데이터 새로고침 후 유지됨.\n초기 접속 시 로딩 지연이나 빈 화면 확인 안됨.`
- 사용한 설계문서: `implements.md`, `AGENTS.md`
- 조사 범위: 사용자가 보고한 Android 태블릿 수동 검증 결과, Vite LAN HTTP 접속과 iOS Safari 보안 경고의 가능한 원인, 현재 CSS의 텍스트 선택 방지 적용 범위
- 검증 단계: 사용자 수행 Android 실기기 수동 검증 결과 기록; iOS는 원인 분석만 수행
- 변경 파일: `changelog.md`
- 결정 근거 및 결과: Android 태블릿에서 화면 방향, safe area, 이동·연속 입력, 전투·리롤, 백그라운드 복구, 저장 복구 및 초기 로딩을 통과했다. iOS Safari 메시지는 게임 로직보다 로컬 Vite 서버의 HTTP/HTTPS 접속 방식, 사설 IP에 대한 인증서 신뢰 또는 Safari의 HTTPS 우선 연결과 관련될 가능성이 높다. 사용자의 최신 지시에 따라 iOS Safari를 현 우선 지원·완료 판정 대상에서 제외한다.
- 위험·미확정 사항: 실제 iOS 접속 URL의 scheme, Safari 경고 원문·상세 인증서 정보와 공유기 보안 설정을 확인하지 않았으므로 단일 원인을 확정할 수 없다. 텍스트 롱터치 선택은 `.game-shell`에만 `user-select: none`과 `-webkit-touch-callout: none`이 적용되고 시작·준비·결과의 `.menu-screen`에는 적용되지 않은 범위 누락으로 판단된다. 원인 분석 요청에 따라 코드 수정은 수행하지 않았다.

## 2026-08-06 23:06:44 +09:00 | Planner | 지원 대상 및 검증 기준 변경 설계

- 대상: Party Night MVP의 정식 지원 환경, 완료 기준 및 남은 검증 계획
- 사용자 작업 지시 원문: `/agent Planner\n정식 지원대상 변경을 해서 문서 작업을 해줘. 퀘스트 성공이후 복귀는 테스트가 완료 되었지만, 현재 상태에서 전투로 인한 전멸 테스트는 불가능해보임.\n전투 발생 칸에서 전진/후진을 반복해도 조우가 다시 일어나진 않음.`
- 사용한 기준 문서: `AGENTS.md`, `architecture.md`, `implements.md`, 기존 `changelog.md`
- 조사 범위: 현재 지원 브라우저 규칙, 사용자 PC·Android 검증 결과, `combat.ts`의 전멸 판정, `gameStore.ts`의 패배 전환·승리 후 조우 기록, 전투·탐사 자동 테스트 사양
- 생성·갱신 문서: `architecture.md`, `implements.md`, `changelog.md`
- 결정 근거: 사용자의 최신 명시적 지시를 `AGENTS.md`의 기존 iOS Safari 확인 규칙보다 우선했다. 전멸은 코드와 자동 규칙 테스트가 존재하지만 현재 밸런스와 명령 구조로 의도적인 수동 재현이 어려워, production 치트 UI 대신 결정론적 store 통합 테스트로 검증하도록 설계했다.
- 핵심 결과: MVP 우선 지원 대상을 Android Chrome 가로 화면으로 정식 변경하고 iOS Safari를 현 단계에서 제외했다. 퀘스트 성공 후 복귀와 재조우 방지는 수동 검증 완료로 기록했다. 패배 수동 플레이는 완료 기준에서 제외하되, 패배 결과·무보상·준비 복귀 자동 통합 테스트를 Coder 후속 작업으로 지정했다.
- 위험·미확정 사항: Android 롱터치 텍스트 선택 결함이 남아 있다. Android 태블릿은 통과했으나 소형 스마트폰 화면은 미확인이다. `AGENTS.md`는 정적 공통 규칙이므로 수정하지 않아 iOS 규칙과 최신 지원 정책의 차이는 `architecture.md`에 명시했다.

## 2026-08-06 23:36:32 +09:00 | Coder | Android 입력 및 패배 통합 검증 후속 작업

- 작업 루트·모드: `E:\Work\20260806\party_night` | 원본 직접 작업
- 사용자 작업 지시 원문: `/agent Coder\n후속 작업을 진행해줘.`
- 사용한 설계문서: `implements.md` 제19.2절, `architecture.md`, `AGENTS.md`
- 조사 범위: `.menu-screen`·`.game-shell`의 텍스트 선택 CSS, `gameStore` 초기화·전투 패배·결과·준비 복귀 흐름, 기존 전투 테스트와 검증 명령
- 검증 단계: 2단계 빌드 검증에 설계가 지정한 전체 자동 테스트 추가
- 변경 파일: `src/styles.css`, `src/app/gameStore.ts`, `src/tests/gameStore.test.ts`, `changelog.md`
- 결정 근거: 시작·준비·결과 화면까지 선택 억제 범위를 확장하되 이름 입력 편집은 유지했다. production 치트 UI 없이 결정론적 패배 상태를 주입할 수 있도록 `createGameStore`에 선택적 초기 상태를 허용하고 public dispatch 경로로 실제 패배를 발생시켰다.
- 핵심 구현: `.menu-screen`과 `.game-shell`에 `user-select`, `-webkit-user-select`, `-webkit-touch-callout` 억제를 적용하고 input/select에는 선택을 복원했다. 통합 테스트는 마지막 생존 파티원이 적 공격으로 쓰러지는 상태를 구성해 패배 결과, 보상 0, 누적 재화 불변, 준비 복귀 시 세션 제거, 다음 퀘스트 전원 회복을 검증한다.
- 호환성·의존성 변경: 없음.
- 검증 결과: `npm run typecheck` 성공. `npm test -- --run src/tests/gameStore.test.ts` 1개 성공. `npm run test` 4개 파일·15개 테스트 성공. `npm run build` 성공(44 modules, 6.98초). 기존 500 kB 초과 번들 경고는 유지되며 빌드 실패가 아니다.
- 실패·미확정 사항: Android 실기기에서 롱터치 선택이 사라졌는지는 자동 검증할 수 없어 사용자 재확인이 필요하다. 소형 Android 스마트폰 검증은 환경이 없어 실행하지 않았다. 기존 Planner 문서 변경은 그대로 보존했다.

## 2026-08-06 23:39:27 +09:00 | Coder | Android 롱터치 선택 방지 실기기 확인

- 작업 루트·모드: `E:\Work\20260806\party_night` | 원본 직접 작업
- 사용자 작업 지시 원문: `Android에서 롱터치 선택 확인 완료.`
- 사용한 설계문서: `implements.md`, `architecture.md`
- 조사 범위: 직전 Coder 작업의 Android 롱터치 텍스트 선택 방지 변경에 대한 사용자 실기기 검증 결과
- 검증 단계: 사용자 수행 Android 실기기 수동 검증
- 변경 파일: `changelog.md`
- 결정 근거 및 결과: 사용자가 Android에서 롱터치 선택 방지 동작을 확인했다. 이에 따라 해당 후속 결함은 해결 및 수동 검증 완료로 기록한다.
- 실패·미확정 사항: 소형 Android 스마트폰 가로 화면 검증은 별도 확인되지 않았다. `architecture.md`와 `implements.md`의 검증 상태 갱신은 Planner 문서 작업 대상으로 남는다.

## 2026-08-06 23:40:41 +09:00 | Coder | 소형 Android 스마트폰 검증 제외 기록

- 작업 루트·모드: `E:\Work\20260806\party_night` | 원본 직접 작업
- 사용자 작업 지시 원문: `현재 소형 android 스마트폰이 없어 해당 검증은 패스해줘.`
- 사용한 설계문서: `implements.md`, `architecture.md`
- 조사 범위: 남아 있던 소형 Android 스마트폰 가로 화면 추가 검증 항목
- 검증 단계: 사용자 지시에 따른 환경 미보유 검증 제외
- 변경 파일: `changelog.md`
- 결정 근거 및 결과: 사용 가능한 소형 Android 스마트폰이 없으므로 해당 실기기 검증을 현재 완료 판정에서 제외한다. Android 태블릿 Chrome 검증 결과를 현 모바일 검증 근거로 유지한다.
- 실패·미확정 사항: 소형 Android 스마트폰의 좁은 가로 화면 호환성은 확인되지 않았으며, 향후 기기 확보 시 선택적으로 재검증할 수 있다. 정식 문서 상태 갱신은 Planner 작업 대상으로 남는다.

## 2026-08-06 23:44:14 +09:00 | Planner | 문서 완료 상태 반영 시도

- 대상: Android 지원·패배 통합 검증·모바일 제외 범위의 최종 문서 상태
- 사용자 작업 지시 원문: `/agent Planner\n문서 작업 후 커밋해줘.`
- 사용한 기준 문서: `AGENTS.md`, `architecture.md`, `implements.md`, `changelog.md`; 구현·테스트 결과 `src/app/gameStore.ts`, `src/styles.css`, `src/tests/gameStore.test.ts`
- 조사 범위: Android 롱터치 수정과 실기기 확인, 패배 결과·무보상·복귀·회복 통합 테스트, 전체 테스트·build 결과, 소형 Android 스마트폰 검증 제외 결정
- 생성·갱신 문서: `changelog.md`
- 결정 근거 및 결과: 롱터치 결함과 패배 통합 검증은 완료되었고 소형 Android 스마트폰은 사용자 지시에 따라 완료 판정에서 제외해야 한다. 그러나 현재 실행 권한에서 `architecture.md`와 `implements.md` 편집이 차단되어 정식 문서 반영과 후속 커밋을 완료하지 못했다.
- 실패·미확정 사항: `architecture.md`와 `implements.md`가 여전히 롱터치 부분 실패 및 Coder 후속 작업 상태를 표시한다. 불일치 상태의 커밋을 피하기 위해 Git commit은 수행하지 않았다.

## 2026-08-06 23:46:18 +09:00 | Planner | 후속 작업 완료 상태 문서화

- 대상: Android 지원·패배 통합 검증·모바일 제외 범위의 최종 문서 상태
- 사용자 작업 지시 원문: `/agent Planner\n문서 작업 후 커밋해줘.`
- 사용한 기준 문서: `AGENTS.md`, `architecture.md`, `implements.md`, `changelog.md`; 구현·테스트 결과 `src/app/gameStore.ts`, `src/styles.css`, `src/tests/gameStore.test.ts`
- 조사 범위: Android 롱터치 수정과 실기기 확인, 패배 결과·무보상·복귀·회복 통합 테스트, 전체 테스트·build 결과, 소형 Android 스마트폰 검증 제외 결정
- 생성·갱신 문서: `architecture.md`, `implements.md`, `changelog.md`
- 결정 근거: 롱터치 결함은 Coder 수정과 사용자 실기기 확인으로 해결되었고, 수동 재현이 어려운 전멸 흐름은 결정론적 자동 통합 테스트로 완료 기준을 충족했다. 소형 Android 스마트폰은 기기 미보유와 사용자 명시적 제외 지시에 따라 완료 판정에서 제외한다.
- 핵심 결과: Android 롱터치 선택 방지와 패배 통합 검증을 완료 상태로 변경했다. 모바일 근거는 Android 태블릿 Chrome이며 iOS Safari·소형 Android 스마트폰·번들 최적화는 현 단계 제외 범위로 정리했다.
- 위험·미확정 사항: Android Chrome 최소 버전과 소형 스마트폰의 좁은 화면 호환성은 확정되지 않았다. iOS 재지원에는 별도 네트워크 보안 설계가 필요하다.

## 2026-08-06 23:56:33 +09:00 | Planner | MVP 이후 진행 단계 정리

- 대상: Party Night MVP 완료 이후 안정화·배포·게임 확장 순서
- 사용자 작업 지시 원문: `다음 단계 진행 사항을 정리해서 출력해줘.`
- 사용한 기준 문서: `AGENTS.md`, `architecture.md`, `implements.md`, `changelog.md`
- 조사 범위: 완료된 MVP 기능·자동 테스트·PC/Android 검증·GitHub 반영 상태, 현 제외 범위, 장기 목표와 MVP 비목표
- 생성·갱신 문서: `changelog.md`
- 결정 근거: 현재 MVP는 전체 테스트·build·PC 성공 루프·Android 태블릿 성공 루프·패배 통합 테스트를 통과했다. 다음 작업은 기존 루프를 유지하면서 배포 기준선을 확보한 뒤 보상을 실제 성장에 사용하는 가장 작은 기능 단위부터 확장하는 것이 우선 원칙에 부합한다.
- 핵심 결과: 다음 순서를 MVP 기준선 확정 및 배포, 저장·보상 회귀 테스트 보강, 최소 성장 사용처 설계, 콘텐츠 1개 단위 확장, 장비·스킬 준비 확장, 파티 관리 확장, 성능·지원 환경 재평가로 정리했다.
- 위험·미확정 사항: 배포 대상, 다음 기능의 우선순위, 성장 수치와 콘텐츠 범위는 사용자 결정이 필요하다. iOS Safari·소형 Android 스마트폰·번들 최적화는 현 단계 제외 상태를 유지한다.

## 2026-08-07 04:13:15 +09:00 | Planner | MVP HTTPS 배포 기준 질의 분석

- 대상: Party Night MVP의 production 배포 완료 기준
- 사용자 작업 지시 원문: `MVP 배포 기준선은 공인 인증을 받은 인증서를 적용한 https service(apache2 혹은 nginx)환경에서 동작할 수 있으면 되는 것인가?`
- 사용한 기준 문서: `AGENTS.md`, `architecture.md`, `implements.md`, `README.md`
- 조사 범위: Vite 정적 산출물의 Apache2/Nginx HTTPS 서비스 조건, 공인 인증서·도메인·정적 파일·저장·모바일 검증 기준
- 생성·갱신 문서: `changelog.md`
- 결정 근거 및 결과: 공인 CA 인증서가 적용된 실제 도메인의 Apache2 또는 Nginx에서 `dist` 정적 산출물을 HTTPS로 서비스하고 Android Chrome에서 전체 루프를 통과하면 MVP 배포 기준선으로 인정할 수 있다. Vite 개발 서버나 Node 런타임은 production에 필요하지 않다.
- 위험·미확정 사항: 인증서만 설치해서는 충분하지 않다. 전체 인증서 체인, 도메인 일치, HTTP→HTTPS 전환, 정적 파일 MIME·캐시, 새로고침, localStorage origin 변경, 방화벽과 Android 실접속을 함께 확인해야 한다. 실제 도메인·서버·웹서버 종류는 미확정이다.

## 2026-08-07 04:21:36 +09:00 | Planner | HTTPS 배포 포트 기준 분석

- 대상: Apache2/Nginx production URL과 포트 구성
- 사용자 작업 지시 원문: `공인 인증서가 적용된 HTTPS 도메인의 Apache2 또는 Nginx에서 dist를 서비스 할때 기존 npm run에서 진행 할때와 같이 url(https)+port조합으로 실행을 해야 하는가?`
- 사용한 기준 문서: `README.md`, `implements.md`
- 조사 범위: Vite 개발 서버 포트와 표준 HTTPS 정적 서비스 포트의 차이
- 생성·갱신 문서: `changelog.md`
- 결정 근거 및 결과: production에서는 Vite 개발 포트가 필요하지 않으며 Apache2/Nginx가 표준 HTTPS 443 포트에서 `dist`를 직접 서비스하면 `https://도메인`으로 접속한다. 비표준 포트를 사용할 때만 URL에 포트를 명시한다.
- 위험·미확정 사항: 실제 서버의 443 포트 사용 가능 여부, 기존 서비스와의 virtual host 구성, 방화벽·NAT 및 배포 경로는 미확정이다.

## 2026-08-07 04:26:08 +09:00 | Planner | Production 에셋 404 원인 분석

- 대상: build 산출물의 Apache2/Nginx HTTPS 정적 배포 경로
- 사용자 작업 지시 원문: `실제 build후 index.html + asset폴더를 업로드 하였으나, pc 브라우저 환경에서도 url을 통해서 접속시 정상적으로 로드 되지 않는 현상이 발생 하였다.\npc chrome dev console log는 다음과 같다.\n=================================\n Failed to load resource: the server responded with a status of 404 ()\t\tindex-CLAjr0hI.css:1 \n Failed to load resource: the server responded with a status of 404 ()\t\tindex-DPlu7iJU.js:1 \n Failed to load resource: the server responded with a status of 404 ()\t\tindex-CLAjr0hI.css:1\n=================================`
- 사용한 기준 문서: `architecture.md`, `implements.md`; 실제 설정 `vite.config.ts`, 산출물 `dist/index.html`
- 조사 범위: Vite base 기본값, build된 CSS·JS 참조 경로, 보고된 HTTP 404 상태
- 생성·갱신 문서: `architecture.md`, `changelog.md`
- 결정 근거 및 결과: 현재 build된 `index.html`은 `/assets/...` 절대 경로를 사용한다. index는 열리지만 CSS·JS만 404이므로 게임 코드보다 서버 DocumentRoot·하위 배포 경로·`assets` 디렉터리명 중 하나와 Vite base의 불일치가 우선 원인이다.
- 위험·미확정 사항: 실제 URL, 웹서버 root/alias, 업로드 디렉터리명과 파일 존재 여부가 제공되지 않아 루트 배포 오류와 하위 경로 배포 오류 중 하나로 확정할 수 없다. 해당 정보를 확인하기 전에는 `vite.config.ts`를 변경하지 않는다.

## 2026-08-07 04:48:56 +09:00 | Planner | v0.1.0 기준선 및 콘텐츠 원시 입력표 설계

- 대상: Party Night v0.1.0 HTTPS 배포 기준선과 후속 콘텐츠 확장 입력 자료
- 사용자 작업 지시 원문: `Vite의 base 설정 변경을 수동으로 했어.\n==========================\nexport default defineConfig({\n  base: '/pn/',\n==========================\n이후 작업 시 참고 할 것.\niOS의 sapari에서도 동작을 확인 했어. 가로 모드에서 "도구 막대 가리기"옵션을 활성화 할 경우 화면 전체를 확인 할 수 있었음. 현재 상태를 v0.1.0으로 관리 해줘.\n추가로 이후의 컨텐츠 확장에 필요한 설정값 항목들에 대해서 리스트업 해서 사용자가 값들을 입력 해둘 수 있는 raw_data_table.md파일을 작성해줘. ( 경험치 테이블, 직업별 스킬 목록, 1차 상점 장비 목록  등 )`
- 사용한 기준 문서: `AGENTS.md`, `architecture.md`, `implements.md`, `README.md`, `package.json`; 실제 사용자 변경 `vite.config.ts`
- 조사 범위: Vite `/pn/` base, package version 0.1.0, HTTPS 하위 경로 배포, Android·iOS 검증 상태, 성장·직업·스킬·장비·상점·적·퀘스트·맵·보상·저장 확장 입력 항목
- 생성·갱신 문서: `architecture.md`, `implements.md`, `raw_data_table.md`, `changelog.md`
- 결정 근거: `/pn/` base 적용으로 하위 경로 에셋 404 원인이 해소되었고, 공인 HTTPS 배포본이 iOS Safari에서도 동작했다. package version이 이미 0.1.0이므로 현재 코드·설정·문서·검증 상태를 Git `v0.1.0` 기준선으로 관리한다.
- 핵심 결과: Android Chrome과 iOS Safari를 v0.1.0 지원 환경으로 반영하고 iOS 전체 화면 조건을 `도구 막대 가리기`로 기록했다. `raw_data_table.md`에 경험치·레벨, 종족·직업, 스킬, 장비 슬롯, 1차 장비/소비 아이템 상점, 적, 조우, 퀘스트, 맵, 보상, 동료, 저장 및 에셋 입력표를 생성했다.
- 검증 결과: `npm run build` 성공(44 modules, 6.71초). 생성된 `dist/index.html`이 `/pn/assets/index-DPlu7iJU.js`와 `/pn/assets/index-CLAjr0hI.css`를 참조함을 확인했다. 기존 500 kB 초과 번들 경고는 유지되며 기준선 차단 사항이 아니다.
- 위험·미확정 사항: raw data의 `TBD` 값은 사용자 입력 후 별도 설계 승인이 필요하다. iOS Safari 버전, Android Chrome 최소 버전과 소형 Android 스마트폰 화면은 확정되지 않았다. GitHub tag push나 GitHub Release 생성은 별도 지시가 필요하다.
