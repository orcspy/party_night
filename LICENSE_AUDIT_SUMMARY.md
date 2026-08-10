# Party Night v0.2.0 — License Audit Summary

검수 기준: `party_night-v0.2.0.zip`

## Runtime package-lock 결과

| Package | Version | License |
|---|---:|---|
| react | 19.0.0 | MIT |
| react-dom | 19.0.0 | MIT |
| scheduler | 0.25.0 | MIT |
| phaser | 3.90.0 | MIT |
| eventemitter3 | 5.0.4 | MIT |

## Phaser vendored source notice 대상

- Matter.js 0.20.0 — MIT
- poly-decomp.js 0.3.0 — MIT
- Earcut 2.2.4 — ISC

## 최종 판정

- Party Night 자체 `All Rights Reserved` 정책과 충돌하는 강한 copyleft
  runtime 의존성은 현재 검수에서 발견되지 않음.
- 실제 배포와 관련된 MIT/ISC 저작권 및 허가 고지는
  `THIRD_PARTY_NOTICES.md`에 보존함.
- 현재 asset 감사에서는 제3자 media asset 고지 대상이 발견되지 않음.
- package/asset 구성이 변경되면 재검수 필요.

이 파일은 내부 검수 기록이며, 실제 공개 저장소에서 필요한 핵심 파일은
`LICENSE`와 `THIRD_PARTY_NOTICES.md`이다.
