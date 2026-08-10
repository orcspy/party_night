# Party Night v0.2.0 — License Audit Summary

검수 기준: `party_night-final.zip` (2026-08-10 final)

이 문서는 내부 검수 요약이다. 공개 저장소의 실제 라이선스 조건은 루트 `LICENSE`, 제3자 고지는 `THIRD_PARTY_NOTICES.md`를 우선한다.

## Runtime package-lock 결과

| Package | Version | License |
|---|---:|---|
| react | 19.0.0 | MIT |
| react-dom | 19.0.0 | MIT |
| scheduler | 0.25.0 | MIT |
| phaser | 3.90.0 | MIT |
| eventemitter3 | 5.0.4 | MIT |

`package-lock.json`의 제3자 package 154개를 기준으로 한 license 분포는 다음과 같다.

| License | Package count |
|---|---:|
| MIT | 143 |
| ISC | 6 |
| Apache-2.0 | 3 |
| BSD-3-Clause | 1 |
| CC-BY-4.0 | 1 |

현재 lockfile 감사에서는 GPL/LGPL/AGPL/MPL 계열 package가 발견되지 않았다.

## Phaser vendored source notice 대상

- Matter.js 0.20.0 — MIT
- poly-decomp.js 0.3.0 — MIT
- Earcut 2.2.4 — ISC

해당 고지는 현재 배포용 `THIRD_PARTY_NOTICES.md`에 포함되어 있다.

## Asset 감사

현재 SFX 작업본의 `src/assets`에는 PNG **350개**와 WAV **2개**가 존재한다.

- terrain runtime tiles: 28개 (7 map × floor/ceiling/wall_side/wall_front)
- terrain marker: 3개 (`marker_encounter`, `marker_exit`, `marker_boss`)
- enemy: 16개
- character: 288개
- content icon: 11개
- SFX: 2개 (`footstep.wav`, `hit.wav`)
- 역사적 미사용 `dungeon_*` terrain: 4개

현재 runtime 대상은 총 **348개**(기존 이미지 346 + WAV SFX 2)이며, `dungeon_floor.png`, `dungeon_ceiling.png`, `dungeon_wall_side.png`, `dungeon_wall_front.png` 4개는 현재 registry에서 참조하지 않는 역사적 파일이다.

terrain, enemy, character, icon의 현재 runtime 에셋은 프로젝트의 `assets-source/**` Node 절차 생성 스크립트로 관리되는 자체 생성 원본이다. SFX 2종도 `assets-source/audio/generate_sfx.py`가 외부 음원 입력 없이 절차 생성하는 프로젝트 자체 원본이다. generator는 asset 생성 시 NumPy/SciPy를 사용하지만 이 Python package들은 웹 runtime이나 배포 bundle에 포함되지 않는다. 외부 이미지·폰트·BGM·음원 샘플 등 별도 media attribution 대상은 현재 감사에서 발견되지 않았다. 자체 원본 에셋의 사용 조건은 루트 `LICENSE`를 따른다.

## 최종 판정

- Party Night 자체 소스 코드·문서·원본 에셋에는 루트 `LICENSE`의 proprietary / All Rights Reserved 조건이 적용된다.
- 제3자 software는 각 원 라이선스를 유지하며 필요한 저작권·허가 고지는 `THIRD_PARTY_NOTICES.md`에 보존한다.
- 현재 runtime dependency에서 Party Night의 배포 정책과 충돌하는 강한 copyleft 의존성은 발견되지 않았다.
- 현재 asset 감사에서 제3자 media asset 고지 대상은 발견되지 않았다.
- dependency, lockfile, 외부 asset 또는 배포 구성에 실질적인 변경이 생기면 이 감사를 다시 수행해야 한다.
