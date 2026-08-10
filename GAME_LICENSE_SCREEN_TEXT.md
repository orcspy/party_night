# Party Night — License 화면 최종 표시 내용

이 문서는 640×360 가로 viewport에서 `License` 버튼을 눌렀을 때 표시할
내용의 기준본이다. 화면은 세로 스크롤 가능한 modal 또는 별도 License 화면으로
구현하는 것을 전제로 한다.

## 기본 화면

```text
Party Night

Copyright © 2026 orcspy.
All Rights Reserved.

Party Night의 자체 코드, 문서 및 자체 제작 에셋에 대한 권리는
orcspy에게 있습니다.

제3자 소프트웨어는 각 구성요소의 원 라이선스가 적용됩니다.
```

## Third-Party Software

```text
React 19.0.0 — MIT
React DOM 19.0.0 — MIT
Scheduler 0.25.0 — MIT
Phaser 3.90.0 — MIT
EventEmitter3 5.0.4 — MIT

Phaser distributed / vendored components:
Matter.js 0.20.0 — MIT
poly-decomp.js 0.3.0 — MIT
Earcut 2.2.4 — ISC
```

## 표시 구조 권장

```text
License
├─ Party Night Copyright
├─ Third-Party Software
├─ [Third-Party License Texts]
└─ [Close]
```

`Third-Party License Texts`는 스크롤 가능한 영역으로 만들고 저장소의
`THIRD_PARTY_NOTICES.md`와 동일한 저작권 고지 및 라이선스 원문을 제공한다.

GitHub Pages 또는 정적 `dist/`만 배포하여 저장소의 Markdown 파일을
사용자가 직접 열 수 없는 구성이라면, `THIRD_PARTY_NOTICES.md`의 runtime
notice 내용을 게임 코드/정적 리소스에도 포함시켜 License 화면에서 접근할 수
있도록 하는 것을 권장한다.

개발 전용 TypeScript, Vite, Vitest, `@types/*` 등은 플레이어가 실행하는
브라우저 runtime 구성요소가 아니므로 기본 게임 License 목록에는 표시하지 않아도
된다. 저장소의 `THIRD_PARTY_NOTICES.md`에는 개발 환경 참고 정보로 기록한다.
