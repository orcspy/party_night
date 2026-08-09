# Asset Catalog (Phaser 시각 에셋 트랙)

> 병합 메모: 이 문서는 별도 `assets_pn` 작업본에서 작성되었다. 아래의 `AGENTS.md` 절 번호 참조는 당시 에셋 전용 규칙을 가리키며, 현재 프로젝트의 새 작업에는 루트 `AGENTS.md`가 우선한다.

AGENTS.md 6항에 따라 에셋 ID·용도·경로·출처·라이선스·규격·상태를 기록한다. `Scene 적용` 항목은 해당 에셋이 실제 Phaser Scene 코드에 배선되었는지 여부다.

> 현재 기준: 아래 초기 `dungeon_*` 기록은 역사적 항목이다. 현재 런타임 기준은 문서 하단의 **v0.2.0 terrain·적 통합 카탈로그**와 `src/phaser/assets/{terrainAssets,enemyAssets}.ts`다.

## 탐사 지형(Exploration Terrain)

### dungeon_floor

- 용도: 탐사 원근 복도의 바닥 반복 타일 (기존 `fillTriangle(#28213a)` 대체)
- 런타임 경로: `src/assets/terrain/dungeon_floor.png`
- 출처/생성 방법: 절차적 생성 — `assets-source/terrain/generate_terrain_tiles.mjs` (자체 작성 Node 스크립트, 외부 소스 없음). 석재 블록 16×16, 줄눈 2px, 약한 베벨(delta 10)로 걷는 바닥은 벽보다 차분하게 유지.
- 라이선스/attribution: 없음 (자체 생성 원본, 사용 제약 없음)
- 이미지 크기: 32×32px, 프레임 수 1(단일 정적 타일, 애니메이션 없음)
- animation: 없음
- anchor: 좌상단(0,0), TileSprite 반복 배치 전제
- 상태: `draft`
- Scene 적용: 배선 완료 (`ExplorationScene.ts`, geometry mask로 삼각형 바닥 영역에만 표시, depth 1)

### dungeon_ceiling

- 용도: 탐사 원근 복도의 천장 반복 타일 (기존 `fillTriangle(#100f19)` 대체)
- 런타임 경로: `src/assets/terrain/dungeon_ceiling.png`
- 출처/생성 방법: 절차적 생성 — `assets-source/terrain/generate_terrain_tiles.mjs`. 석재 블록 16×16, 줄눈 2px, 베벨 없음(가장 어둡고 차분한 면으로 유지).
- 라이선스/attribution: 없음 (자체 생성 원본)
- 이미지 크기: 32×32px, 프레임 수 1
- animation: 없음
- anchor: 좌상단(0,0), TileSprite 반복 배치 전제
- 상태: `draft`
- Scene 적용: 배선 완료 (`ExplorationScene.ts`, geometry mask로 삼각형 천장 영역에만 표시, depth 0)

### dungeon_wall_side

- 용도: 탐사 원근 복도의 좌/우측 벽 반복 타일 (기존 `fillRect(#312944)` 대체, 좌우 공용)
- 런타임 경로: `src/assets/terrain/dungeon_wall_side.png`
- 출처/생성 방법: 절차적 생성 — `assets-source/terrain/generate_terrain_tiles.mjs`. 벽돌 16×8 러닝본드, 줄눈 3px(두껍게), 강한 베벨(delta 24, 블록 내부 좌상단 하이라이트/우하단 그림자)로 벽돌 하나하나가 도드라진 두꺼운 석조 벽으로 보이도록 함.
- 라이선스/attribution: 없음 (자체 생성 원본)
- 이미지 크기: 32×32px, 프레임 수 1
- animation: 없음
- anchor: 좌상단(0,0), TileSprite 반복 배치 전제
- 상태: `draft`
- Scene 적용: 배선 완료 (`ExplorationScene.ts`, 깊이별(3단) TileSprite 풀, 좌·우 각각 재사용)

### dungeon_wall_front

- 용도: 탐사 원근 복도의 정면 막다른 벽 반복 타일 (기존 `fillRect(#3c324c)` + `lineBetween` 가로줄 대체)
- 런타임 경로: `src/assets/terrain/dungeon_wall_front.png`
- 출처/생성 방법: 절차적 생성 — `assets-source/terrain/generate_terrain_tiles.mjs`. 벽돌 16×8 러닝본드, 줄눈 3px, 베벨(delta 18) + 밝은 줄눈(`#665877`)으로 정면에서 빛을 받는 막다른 벽 느낌을 강조.
- 라이선스/attribution: 없음 (자체 생성 원본)
- 이미지 크기: 32×32px, 프레임 수 1
- animation: 없음
- anchor: 좌상단(0,0), TileSprite 반복 배치 전제
- 상태: `draft`
- Scene 적용: 배선 완료 (`ExplorationScene.ts`, 정면 막힌 프레임에 단일 재사용 TileSprite)

### marker_encounter

- 용도: 조우(`E`) 셀 위치 표시 아이콘 (신규 표현, 기존 코드에 대응 요소 없음)
- 런타임 경로: `src/assets/terrain/marker_encounter.png`
- 출처/생성 방법: 절차적 생성 — `assets-source/terrain/generate_terrain_tiles.mjs` (다이아몬드 링 + 코어 도형)
- 라이선스/attribution: 없음 (자체 생성 원본)
- 이미지 크기: 24×24px, 프레임 수 1, 배경 투명(alpha 0)
- animation: 없음
- anchor: 중앙(0.5, 0.5)
- 상태: `draft`
- Scene 적용: 배선 완료 (`ExplorationScene.ts`, 조우 셀 도달 시 프레임 하단 중앙에 깊이별 스케일 축소 표시, `triggeredEncounterIds`로 클리어된 조우는 표시 안 함). CDP 헤드리스 브라우저로 실제 이동 후 스크린샷 확인 완료.

### marker_exit

- 용도: 퀘스트 출구(`X`) 셀 위치 표시 아이콘 (신규 표현, 기존 코드에 대응 요소 없음)
- 런타임 경로: `src/assets/terrain/marker_exit.png`
- 출처/생성 방법: 절차적 생성 — `assets-source/terrain/generate_terrain_tiles.mjs` (상향 화살표 도형)
- 라이선스/attribution: 없음 (자체 생성 원본)
- 이미지 크기: 24×24px, 프레임 수 1, 배경 투명(alpha 0)
- animation: 없음
- anchor: 중앙(0.5, 0.5)
- 상태: `draft`
- Scene 적용: 배선 완료 (`ExplorationScene.ts`, 출구 셀 도달 시 프레임 하단 중앙에 깊이별 스케일 축소 표시)

## 생성 스크립트 재현 방법 (탐사 지형)

```bash
node assets-source/terrain/generate_terrain_tiles.mjs
```

- Node 내장 모듈(`node:fs`, `node:zlib`, `node:path`, `node:url`)만 사용하며 신규 npm 패키지를 추가하지 않았다.
- 팔레트는 기존 `ExplorationScene.ts`의 Graphics 색상값을 그대로 계승했다(바닥 `#28213a`, 천장 `#100f19`, 벽 `#312944`, 정면 벽 `#3c324c`/`#665877`).
- 타일 크기 32×32는 `size % blockSize === 0` 조건으로 이음매 없는(seamless) 반복을 보장하도록 설계했다.
- 시드 기반 결정적 노이즈(mulberry32)를 사용해 재실행 시 동일한 결과가 재현된다.
- `makeMasonryTile()`에 `bevel` 파라미터를 추가해 각 블록 내부의 좌상단(밝게)·우하단(어둡게) 1px을 음영 처리한다(단일 광원 가정). 바닥/천장보다 벽에 더 강한 값을 주어 "벽은 두껍고 막힌 입체", "바닥은 평평하고 걸을 수 있는 면"이라는 대비를 의도적으로 만들었다. 이 처리는 블록 단위로 반복되므로 타일을 이어 붙여도 이음매 밴딩이 생기지 않는다.

## 전투(Battle) — 적(Enemy)

### goblin_scout

- 용도: 전투 화면 적 파티 슬롯의 "고블린 정찰병"(`contentId: goblin_scout`, `src/game/content.ts` `createEnemies()`) 표현. 기존 `BattleScene.ts`의 사각형(몸통 70×80 + 머리 42×34) placeholder를 대체.
- 런타임 경로: `src/assets/enemies/goblin_scout.png`
- 출처/생성 방법: 절차적 생성 — `assets-source/enemies/generate_goblin_sprites.mjs` (자체 작성 Node 스크립트, 외부 소스 없음). 타원/삼각형/사각형 히트테스트 조합으로 정면 기준 인간형 실루엣(머리·뾰족귀·몸통·팔·다리·무기)을 픽셀 단위로 채색하고, 실루엣 외곽 1px에 자동 아웃라인을 적용. 정찰병은 가죽 갈색 튜닉 + 단검(칼날/손잡이) 무장.
- 라이선스/attribution: 없음 (자체 생성 원본, 사용 제약 없음)
- 이미지 크기: 32×40px, 프레임 수 1(단일 정적 idle 프레임, 애니메이션 없음)
- animation: 없음. `BattleScene.ts`에서 `setTint()`로 생존(흰색, 무변화)/패배(`0x29252e`, 기존 사각형 placeholder의 패배 색상과 동일) 2개 상태만 표현.
- anchor: 하단 중앙(0.5, 1), Phaser Scene 표시 배율 2x(정수 배율)로 64×80 표시
- 상태: `draft`
- Scene 적용: 배선 완료 (`BattleScene.ts` `enemySpriteCard()`, `contentId` → 텍스처 키 매핑은 `src/phaser/assets/enemyAssets.ts`에서 중앙 관리)

### goblin_guard

- 용도: 전투 화면 적 파티 슬롯의 "고블린 경비병"(`contentId: goblin_guard`) 표현.
- 런타임 경로: `src/assets/enemies/goblin_guard.png`
- 출처/생성 방법: 절차적 생성 — `assets-source/enemies/generate_goblin_sprites.mjs`. goblin_scout과 동일한 골격에 팔레트만 강철 회색 갑옷/부츠로 교체, 왼팔 대신 원형 방패(이중 타원으로 테두리 표현), 무기는 단검 대신 장창(자루+삼각형 창날+날밑)으로 변경해 두 적이 시각적으로 구분되도록 했다.
- 라이선스/attribution: 없음 (자체 생성 원본)
- 이미지 크기: 32×40px, 프레임 수 1
- animation: 없음(goblin_scout과 동일한 생존/패배 2상태 tint 처리)
- anchor: 하단 중앙(0.5, 1), 2x 배율 표시
- 상태: `draft`
- Scene 적용: 배선 완료 (`BattleScene.ts`, 위와 동일 경로)

## 생성 스크립트 재현 방법 (전투 적 스프라이트)

```bash
node assets-source/enemies/generate_goblin_sprites.mjs
```

- Node 내장 모듈만 사용(신규 npm 패키지 없음), `generate_terrain_tiles.mjs`와 동일한 PNG 인코더를 이 스크립트 안에 자체 포함(독립 실행 가능, 공용 모듈로 분리하지 않음 — 두 스크립트 모두 `assets-source/` 하위의 독립 원본이라는 기존 관례를 유지).
- 픽셀 단위 실루엣 유니온을 계산해 배경과 맞닿는 경계만 1px 아웃라인 색(`#14100d`)으로 칠하고, 내부 경계(예: 몸통과 팔이 겹치는 부분)는 아웃라인 없이 파츠 색만 이어지도록 해 과도한 선이 생기지 않게 했다.
- 눈·입 등 얼굴 디테일은 실루엣/아웃라인 패스 이후 마지막에 덧칠해 항상 보이도록 했다.

## 파티 캐릭터(Character) — 종족 × 직업 × 성별 × 1P~4P

`src/game/content.ts`의 `RACES`(4종)·`CLASS_DATA`(6종)와 `SetupScreen.tsx`의 성별 선택지(남성/여성/기타, 3종)를 조합한 전체 매트릭스에 대해, 파티 내 종족·직업·성별 조합이 겹칠 때(예: 메인 캐릭터가 브람과 같은 `warrior`를 선택) 구분할 수 있도록 4개 파티 슬롯(1P~4P)별 색상 변형을 각각 별도 PNG로 제작했다. `BattleScene.ts`에 배선 완료(하단 "Scene 적용" 및 `asset-plan.md` "전투 — 파티(Party) 적용" 절 참조).

- 런타임 경로 패턴: `src/assets/characters/<raceId>_<classId>_<gender>_p<slot>.png`
  - `raceId` ∈ `human`, `elf`, `dwarf`, `halfling` (`RaceId` 타입과 동일한 영문 키)
  - `classId` ∈ `warrior`, `rogue`, `archer`, `paladin`, `priest`, `mage` (`ClassId` 타입과 동일한 영문 키)
  - `gender` ∈ `male`, `female`, `neutral` — UI의 `남성`/`여성`/`기타`에 각각 대응(파일명은 AGENTS.md 6항에 따라 영문 소문자 `snake_case`로 매핑; 한글 문자열을 파일명에 직접 쓰지 않음)
  - `slot` ∈ `1`,`2`,`3`,`4` (1P~4P 파티 슬롯)
  - 총 4×6×3×4 = **288개 파일**, 총 용량 약 83KB(평균 296B/파일)
- 출처/생성 방법: 절차적 생성 — `assets-source/characters/generate_character_sprites.mjs` (자체 작성 Node 스크립트, 외부 소스 없음). `generate_goblin_sprites.mjs`와 동일한 도형 히트테스트(타원/사각형/삼각형/고리) + 실루엣 아웃라인 기법을 재사용하되, 파츠에 최종 색상 대신 **역할(role)** 을 태깅한 뒤 (종족, 직업, 성별, 슬롯) 조합마다 역할→색상 팔레트를 다르게 resolve하는 방식으로 확장했다.
- 라이선스/attribution: 없음 (자체 생성 원본)
- 이미지 크기: 32×40px, 프레임 수 1(정적 idle, 애니메이션 없음)
- anchor: 하단 중앙(0.5, 1) — 고블린 적 스프라이트와 동일 컨벤션, 향후 적용 시 동일 배율(2x 권장)로 표시
- 상태: `draft`
- Scene 적용: 배선 완료 (`BattleScene.ts` `partySpriteCard()`. `src/phaser/assets/characterAssets.ts`가 `(raceId, classId, gender, slot)` → 텍스처 키를 중앙 관리하며, `import.meta.glob`(non-eager)로 288개 전체를 선로딩하지 않고 해당 전투의 파티가 실제로 쓰는 조합만 지연 로드한다 — 상세는 `asset-plan.md` 참조)

### 조합 축(파라미터) 정의 — `assets-source/characters/generate_character_sprites.mjs` 상수와 1:1 대응

**종족(Race) — 스킨톤, 귀 모양, 체형 프리셋, 수염/맨발 여부**

| raceId | 스킨 | 헤어(대표색) | 체형 | 귀 | 수염(남성만) | 맨발 |
|---|---|---|---|---|---|---|
| human | `#d9a66c` | `#4a3626` | standard | 둥근형(별도 조형 없음) | 없음 | 없음(부츠) |
| elf | `#e8d2ae` | `#c9b26a` | standard | 뾰족귀(4점 두꺼운 quad, 스킨색 채움) | 없음 | 없음(부츠) |
| dwarf | `#c98a5e` | `#6b3a24` | short(단신·다부짐) | 둥근형 | 있음(남성만) | 없음(부츠) |
| halfling | `#e3b98c` | `#5b4028` | short(단신) | 둥근형 | 없음 | **있음**(스킨톤 맨발) |

`short` 프리셋은 머리를 크게·낮게, 다리를 짧게 조정하되 발 위치(y=37~39)는 `standard`와 동일하게 고정해 모든 종족이 같은 지면선에 서도록 했다.

**엘프 귀 수정 이력(사용자 피드백 반영)**: 최초 버전은 얇은 삼각형 1개로 귀를 표현했는데, 이 스크립트의 아웃라인 로직(실루엣이 배경과 맞닿는 모든 픽셀을 테두리색으로 칠함)이 1px 두께의 얇은 도형 전체를 거의 잠식해, 귀가 스킨색 없이 "어두운 배경에서 보이지 않는 1px 검은 선"으로만 보이는 문제가 있었다. 대각선을 공유하는 삼각형 2개로 구성한 4점 "잎사귀형" quad로 교체해 항상 스킨색 내부 면적이 남도록 수정했다(`assets-source/characters/generate_character_sprites.mjs`의 `earShapes()`). 추가로 여성/기타 성별의 옆머리(sideLocks)가 귀 영역과 겹쳐 다시 귀를 가리던 2차 문제도 발견해, 옆머리 시작 y좌표를 귀 아래쪽(`cy + ry*0.35`)으로 낮춰 해결했다(`hairTest()`). 두 수정 모두 픽셀 값을 직접 덤프해 재발이 없음을 확인했다(아래 검증 결과 참조).

**직업(Class) — 주 갑옷색(`class_main`), 보조색/벨트(`class_trim`), 무기, 소매 처리, 특수 머리쓰개**

| classId | 주색(class_main) | 보조색(class_trim) | 무기 | 소매(팔) | 머리쓰개 |
|---|---|---|---|---|---|
| warrior | `#5b5f66`(강철) | `#3b2a1a` | 검+원형 방패 | class_trim(수갑) | 없음 |
| rogue | `#3a3a42`(암색 가죽) | `#23232a` | 쌍단검 | 스킨(맨팔) | 후드 |
| archer | `#4f6b3a`(녹색 가죽) | `#5c4128` | 활(고리 형태) | 스킨(맨팔) | 없음 |
| paladin | `#cfc9a8`(백색 판금) | `#b98b3d`(금색) | 검+방패 | class_trim(수갑) | 없음 |
| priest | `#dce4ea`(백색 로브) | `#5d7a99` | 지팡이+십자 성물 | class_main(로브 소매) | 없음 |
| mage | `#4b3d6b`(보라 로브) | `#2e2645` | 지팡이+오브(`#7fd8c0`) | class_main(로브 소매) | 뾰족 모자 |

**성별(Gender) — 머리 실루엣만 변화(체형은 공유), 몸통 폭 등 추가 조정 없음(draft 단순화)**

| gender | UI 표시 | 머리 실루엣 |
|---|---|---|
| male | 남성 | 정수리 짧은 밴드만 |
| female | 여성 | 정수리 밴드 + 어깨까지 긴 옆머리 |
| neutral | 기타 | 정수리 밴드 + 귀 아래까지 짧은 옆머리(중간 길이) |

**파티 슬롯(1P~4P) — `team_accent` 역할(가슴~팔을 가로지르는 대각선 어깨띠) 색상만 변경, 나머지 색은 종족/직업 고정**

| slot | 색상 | 비고 |
|---|---|---|
| 1P | `#3d6485`(청색) | 기존 `BattleScene.ts` 파티 카드 색상과 동일 계열로 연속성 유지 |
| 2P | `#a2453f`(적색) | |
| 3P | `#4f8f5b`(녹색) | |
| 4P | `#c9a23d`(호박색) | |

**색 구분 영역 확대 이력(사용자 피드백 반영)**: 최초 버전은 팔·몸통 실루엣보다 살짝 크게 그린 "케이프"를 몸통보다 먼저 그려 어깨/옆구리 가장자리에 2px 정도만 비치게 하는 방식이었는데, 실제로는 팔이 케이프보다 바깥쪽까지 뻗어 있어 케이프가 거의 전부 가려져 색 구분이 사실상 보이지 않는 문제가 있었다. 몸통·팔 영역 전체를 대상으로 한 대각선 띠(어깨~반대쪽 허리, 폭은 대각선 길이의 약 40%)를 몸통·소매를 그린 **뒤**에 덧그리는 방식으로 교체해, 항상 눈에 띄는 굵은 대각선 색 밴드로 슬롯을 구분할 수 있게 했다. 동일 종족·직업·성별 조합이 슬롯만 다른 경우(예: 메인 캐릭터가 브람과 같은 인간 전사 남성을 선택) CDP 헤드리스 브라우저로 실제 전투 화면을 캡처해 1P(청색)와 2P(적색) 띠가 뚜렷이 구분됨을 확인했다(아래 검증 결과 참조).

### 대표 예시 1건 상세 (`human_warrior_male_p1.png`)

- 용도: 인간·전사·남성·1P 슬롯 조합의 파티원 표현(예: 메인 캐릭터가 인간 전사 남성으로 1번 슬롯에 위치할 때)
- 런타임 경로: `src/assets/characters/human_warrior_male_p1.png`
- 이미지 크기: 32×40px, 프레임 1, anchor 하단 중앙(0.5,1)
- 상태: `draft`

나머지 287개 파일은 위 4개 축 표의 조합으로 완전히 결정되며(파일명이 곧 조합 키), 개별 항목을 전부 나열하는 대신 이 표와 생성 스크립트를 단일 진실 공급원으로 유지한다.

## 생성 스크립트 재현 방법 (파티 캐릭터 스프라이트)

```bash
node assets-source/characters/generate_character_sprites.mjs
```

- Node 내장 모듈만 사용(신규 npm 패키지 없음). 288개 파일을 결정적으로(수학적 도형 계산만 사용, 랜덤 노이즈 없음) 재생성하므로 재실행해도 동일한 바이트 결과가 나온다.
- 파츠를 직접 색상이 아닌 역할(`skin`/`hair`/`class_main`/`class_trim`/`weapon_wood`/`weapon_metal`/`boot`/`team_accent`)로 태깅한 뒤 (종족,직업,성별,슬롯) 조합별로 역할→색을 resolve하는 구조라, 향후 종족·직업을 추가하려면 `RACE_TRAITS`/`CLASS_TRAITS`에 항목만 추가하면 된다(좌표 로직 재작성 불필요).
- 대각선 어깨띠(`team_accent`)는 몸통·소매 영역 안에서 `Math.abs(u) < 0.2`(u는 어깨~허리 대각선 진행률) 조건으로 그려지며, 몸통·소매를 그린 **뒤**에 덧그려 항상 위에 보인다 — 직업을 나타내는 주 갑옷/로브 색(`class_main`)은 슬롯과 무관하게 항상 고정되어 유지된다.
- 엘프 귀는 대각선을 공유하는 삼각형 2개(quad)로 구성해 얇은 도형이 아웃라인에 전부 잠식되지 않도록 했고, 옆머리(sideLocks)는 귀 아래쪽부터 시작하도록 해 귀를 다시 덮지 않는다.

## Scene 적용 (파티 캐릭터, 완료)

- **`src/game/types.ts`**: `Actor`에 `raceId?: RaceId`·`gender?: string` 필드를 추가했다(선택적, 순수 표시용 메타데이터 — HP/공격/승패 등 게임 판정 계산에는 전혀 사용되지 않는다).
- **`src/game/content.ts`**: `createParty()`가 메인 캐릭터에는 `MainCharacterConfig.raceId`/`gender`를 그대로 채운다. `MainCharacterConfig.gender`는 `SetupScreen.tsx`의 `<select>`가 저장하는 한글 표시값(`남성`/`여성`/`기타`)을 그대로 담고 있어, 에셋 파일명의 영문 토큰(`male`/`female`/`neutral`)으로 변환하는 `toAssetGender()` 헬퍼를 추가했다. 고정 NPC 3명(브람/세라/로웬)은 종족·성별 설정 UI가 없어 표시용으로 `human`을 부여했고, 성별은 이름의 관용적 어감에 따라 브람=`male`, 세라=`female`, 로웬=`male`로 임의 지정했다(게임 판정 무관, 순수 표시 선택).
- **`src/phaser/assets/characterAssets.ts`(신규)**: `import.meta.glob('../../assets/characters/*.png')`를 **non-eager**로 선언해 288개 URL을 즉시 임포트하지 않고, `queueCharacterAsset(scene, raceId, classId, gender, slot)` 호출 시점에 필요한 그 조합 하나만 동적 `import()`로 resolve한 뒤 `scene.load.image()`에 등록한다. 프로덕션 빌드 시 Vite가 각 조합을 별도의 작은 청크(`dist/assets/<race>_<class>_<gender>_p<slot>-*.js`, 약 0.4~0.6KB)로 code-split해, 실제로 요청되지 않은 조합은 네트워크로 전혀 내려가지 않는다(AGENTS.md 9항: "초기 화면과 무관한 대형 에셋을 무조건 선로딩하지 않는다" 충족).
- **`src/phaser/BattleScene.ts`**: `create()`에서 기존 사각형으로 즉시 1차 렌더링한 뒤, `loadPartyCharacterAssets()`(신규 비동기 메서드)가 그 전투의 파티원(최대 4명)이 실제로 쓰는 조합만 순회하며 로드를 요청한다. 로드 완료(`Phaser.Loader.Events.COMPLETE`) 시 `renderActors()`를 다시 호출해 사각형을 스프라이트로 교체한다. 스프라이트 파일이 아예 없는 조합(raceId/classId/gender 미설정 또는 파일 없음)은 `actorCard()` 사각형으로 개별 폴백하며 `actor.id`당 1회만 `console.warn`을 남긴다(적 에셋과 동일한 개별 폴백 원칙, AGENTS.md 9항).
- 파티 슬롯(1P~4P)은 `combat.participants`에서 `side==='party'`인 항목의 배열 인덱스+1로 결정한다(현재 메인=1P, 브람=2P, 세라=3P, 로웬=4P 고정 순서 — 기존 렌더링 순서를 그대로 재사용, 별도 매핑 로직 추가 없음).

### 검증 결과 (Scene 적용 — 2단계 빌드 검증 상당)

- `npm run typecheck`: 통과(0 오류)
- `npm run test`: 기존 5개 파일 21개 테스트 전부 통과, 무변경(게임 판정 미변경 재확인 — `raceId`/`gender`는 판정 로직 어디에서도 읽지 않음)
- `npm run build`: 성공. 288개 캐릭터 조합이 각각 독립 청크로 code-split됨(`dist/assets/`에 0.4~0.6KB짜리 파일 288개 생성, 메인 번들은 1708.78KB→1745.05KB로 +36KB만 증가 — 이는 288개 동적 `import()` 참조 자체의 코드 크기이며 이미지 데이터 자체는 각 청크에 분리되어 있어 실제로 페치되는 것은 전투마다 최대 4개뿐이다).
- CDP 헤드리스 Edge로 실제 검증: 새 게임 → **종족 human/직업 warrior(브람과 동일 직업으로 의도적 충돌 유발)/성별 남성**으로 메인 캐릭터 생성 → 훈련 폐허 입장 → 이동/회전 버튼 실클릭으로 조우 지점 도달 → 전투 화면 진입. 콘솔에는 텍스처 로딩 전 표시되는 예상된 1회성 폴백 경고 4건(`party sprite unavailable ... party_main/party_warrior/party_priest/party_archer`)만 있었고, 로딩 완료 후 오류·경고 없음(missing 텍스처 없음 — 이전 세션에서 발견했던 `MainCharacterConfig.gender`가 한글 문자열("남성")로 전달되어 텍스처 키가 매칭되지 않던 버그를 `toAssetGender()` 추가로 수정하고 재검증함). 스크린샷 확인 결과 4명의 파티원 전원이 사각형이 아닌 실제 캐릭터 스프라이트로 렌더링되었고, **메인 캐릭터(1P, 인간 전사 남성)는 청색 어깨띠, 브람(2P, 동일 조합)은 적색 어깨띠**로 뚜렷이 구분되어 표시됨을 확인 — 이번 작업의 핵심 요구사항(종족/직업/성별 충돌 시 슬롯 색으로 구분)이 실제 충돌 시나리오에서 정상 동작함을 실증했다.
- 검증에 사용한 임시 CDP 스크립트·스크린샷·헤드리스 Edge·dev 서버 프로세스는 작업 종료 후 전부 정리했으며 레포에 커밋하지 않았다.
- 모바일 실기(Android Chrome/iOS Safari) 및 `/pn/` production 배포 확인은 AGENTS.md 11항의 마일스톤 검증 범위이며 이번 변경 단위 검증에는 포함하지 않았다.

## 미확정 사항 (파티 캐릭터 — 후속 확인 필요)

- 고정 NPC 3명(브람/세라/로웬)에게 부여한 종족(`human`)·성별(이름 어감 기반 추정)은 임의 선택이며, 최종 설정으로 확정된 것이 아니다.
- 어깨띠(대각선 밴드, 폭 비율 0.2) 굵기·엘프 귀 quad 형태는 draft이며 최종 아트 디렉션 승인 전까지 `approved`로 승격하지 않는다.
- 픽셀아트 디테일(눈 2개+입만 표현 등)은 여전히 draft 단순화 상태다.
- 마일스톤 검증(전체 test, Android/iOS 실기, `/pn/` production 배포, 저장 데이터 복구 등)은 아직 수행하지 않았다.

## v0.2.0 terrain·적 통합 카탈로그 (현재 기준)

- 가져온 원본: `E:\Work\20260806\assets_pn` (`d16b6ed` 기준 에셋 작업본)
- 출처/라이선스: `assets-source/terrain`·`assets-source/enemies`의 Node 내장 모듈 기반 절차적 생성 원본. 외부 이미지·attribution·사용 제약 없음.
- 상태: 모든 이미지는 최종 아트가 아닌 `draft`다.
- 런타임 계약: terrain은 32×32 단일 반복 TileSprite, 적은 32×40·36×44·40×48 단일 idle 이미지, 적 anchor `(0.5,1)`, 정수 2배 표시.

### Terrain 7종

| mapId | asset ID | 런타임 파일 | 현재 Scene 상태 |
|---|---|---|---|
| `training_ruins` | `terrain_training_ruins` | `terrain_training_ruins_{floor,ceiling,wall_side,wall_front}.png` | 실제 맵 배선 |
| `goblin_den` | `terrain_goblin_den` | `terrain_goblin_den_{floor,ceiling,wall_side,wall_front}.png` | 실제 맵 배선 |
| `ancient_site` | `terrain_ancient_site` | `terrain_ancient_site_{floor,ceiling,wall_side,wall_front}.png` | 실제 맵 배선 |
| `underground_dungeon` | `terrain_underground_dungeon` | `terrain_underground_dungeon_{floor,ceiling,wall_side,wall_front}.png` | registry 준비, 맵 구현 대기 |
| `old_castle` | `terrain_old_castle` | `terrain_old_castle_{floor,ceiling,wall_side,wall_front}.png` | 옛 고성 맵 적용 완료 |
| `volcanic_cave` | `terrain_volcanic_cave` | `terrain_volcanic_cave_{floor,ceiling,wall_side,wall_front}.png` | 화산 동굴 맵 적용 완료 |
| `deep_forest_ruins` | `terrain_deep_forest_ruins` | `terrain_deep_forest_ruins_{floor,ceiling,wall_side,wall_front}.png` | 깊은 숲 폐허 맵 적용 완료 |

- `queueTerrainAssets(scene, mapId)`는 현재 맵의 네 파트와 공용 marker만 Phaser에 등록한다.
- `marker_encounter`, `marker_boss`는 승인 마커로 배선됐다. `marker_exit`는 v0.1 잔존 에셋으로 로딩만 하며 현재 보스 완료형 맵에서는 표시하지 않는다.
- 함정·비밀문·비밀방은 승인된 별도 asset ID가 없으므로 Graphics 표현을 유지한다.
- 기존 `dungeon_*.png` 4개는 역사적 파일로 남아 있으나 현재 registry에서 참조하지 않는다.

### 적 16종

| content ID | texture key | 크기 | 현재 Scene 상태 |
|---|---|---:|---|
| `goblin_scout` | `enemy_goblin_scout` | 32×40 | 실제 조우 배선 |
| `goblin_guard` | `enemy_goblin_guard` | 32×40 | 실제 조우 배선 |
| `hobgoblin_boss` | `enemy_hobgoblin_boss` | 40×48 | 실제 조우 배선 |
| `orc_raider` | `enemy_orc_raider` | 32×40 | 실제 조우 배선 |
| `ogre` | `enemy_ogre` | 40×48 | 실제 조우 배선 |
| `kobold_skirmisher` | `enemy_kobold_skirmisher` | 32×40 | registry 준비 |
| `gnoll_brute` | `enemy_gnoll_brute` | 36×44 | registry 준비 |
| `minotaur_boss` | `enemy_minotaur_boss` | 40×48 | registry 준비 |
| `skeleton_soldier` | `enemy_skeleton_soldier` | 32×40 | registry 준비 |
| `zombie` | `enemy_zombie` | 32×40 | registry 준비 |
| `ghoul` | `enemy_ghoul` | 36×44 | registry 준비 |
| `lich_boss` | `enemy_lich_boss` | 40×48 | registry 준비 |
| `imp` | `enemy_imp` | 32×40 | registry 준비 |
| `cyclops_boss` | `enemy_cyclops_boss` | 40×48 | registry 준비 |
| `wraith` | `enemy_wraith` | 36×44 | registry 준비 |
| `skeleton_king_boss` | `enemy_skeleton_king_boss` | 40×48 | registry 준비 |

- 파일 경로는 모두 `src/assets/enemies/<contentId>.png`다.
- `enemySpriteKeyFor(contentId)`가 승인 texture key를 반환하며, 향후 encounter가 해당 content ID의 Actor를 만들면 별도 Scene 수정 없이 사용된다.
- 등록·로딩 실패 시 기존 개별 도형 fallback과 패배 tint를 유지한다.
