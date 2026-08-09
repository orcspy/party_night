# Asset Plan (Phaser 시각 에셋 트랙)

> 병합 메모: 이 문서는 별도 `assets_pn` 작업본의 계획과 검증 이력을 현재 프로젝트로 가져온 것이다. 아래의 `AGENTS.md` 절 번호 참조는 해당 작업본 당시의 에셋 전용 규칙을 가리킨다. 현재 프로젝트에서 새 작업을 수행할 때는 루트 `AGENTS.md`를 우선한다.

이 문서는 AGENTS.md 12항에 따라 교체 대상, 신규 에셋, 변경 파일, fallback, 검증 방법을 기록한다. 실제 진행 상태는 이 문서를 계속 갱신한다.

## 진행 상태 요약

| 단계 | 내용 | 상태 |
|---|---|---|
| 1 | 탐사 지형 에셋 계획 수립 + 1차 draft 이미지 생성 | 완료 |
| 2 | 에셋 registry/loader 구현 (`src/phaser/assets/`) | 완료 |
| 3 | `ExplorationScene.ts`에 이미지 적용 + fallback 배선 | 완료 |
| 4 | 조우/출구 마커 좌표 배치 및 판정 위치 일치 검증 | 완료 |
| 5 | 전투(파티/적/다이스) 에셋 | 부분 진행 — 적(고블린 2종) 배선 완료, 파티(종족×직업×성별×1P~4P, 288종) 제작+배선 완료(`Actor.raceId`/`gender` 최소 인터페이스 추가), 다이스는 미착수 |
| 6 | v0.2.0 map별 terrain 7종·`marker_boss` | 에셋·registry 완료, 구현된 3개 맵 배선 완료 |
| 7 | v0.2.0 적 16종 | 에셋·registry 완료, 구현된 5개 enemy 배선 완료 |
| 8 | 아이템·장비·스킬 대표 아이콘 11종 | 생성·React UI 배선·등급색 적용 완료 |

## 교체 대상 조사 (기존 상태)

> 현재 통합 상태: 초기 조사와 `dungeon_*` 계획은 역사적 기록이다. 런타임은 `terrain_<mapId>_<part>` registry와 적 16종 manifest를 사용한다. 미구현 퀘스트도 승인 map/enemy ID를 사용하면 준비된 에셋이 자동 연결되도록 유지한다.

### v0.2.0 설계 대비 통합 후 누락 감사

- 승인 terrain asset ID: 7/7 등록·파일 존재, 누락 없음.
- 승인 enemy sprite ID: 16/16 등록·파일 존재, 누락 없음.
- 승인 encounter marker: `marker_encounter`, `marker_boss` 모두 등록·파일 존재, 누락 없음.
- 현재 구현 콘텐츠의 실제 연결: map 7/7, enemy 16/16 연결.
- 별도 영구 asset ID가 설계되지 않은 항목: 함정, 비밀문, 비밀방 보상, 다이스. 아이템·장비·스킬 대표 아이콘 11종은 생성·배선됐고 개별 로드 실패 시 텍스트 배지를 사용한다.
- `raw_data_table.md` 19절의 animation/effect/sound 연결값은 여전히 `TBD`이며 v0.2.0 완료용 구체 asset ID가 승인되지 않았다.

기존 `ExplorationScene.ts`는 `Phaser.Graphics` 벡터 도형(`fillRect`/`fillTriangle`/`strokeRect`/`lineBetween`)만으로 원근 복도를 그리며, 실제 이미지 에셋은 0개다(별도 조사 결과, 앞선 대화 참조). `E`(조우)·`X`(출구) 셀에는 시각 마커가 전혀 없다.

## 대상 범위: 탐사 지형(Exploration Terrain) — 1차 draft

| 교체 대상(기존 Graphics) | 신규 에셋 ID | 런타임 경로 | 용도 | 우선순위 | 비고 |
|---|---|---|---|---|---|
| 바닥 사다리꼴 `fillTriangle(#28213a)` | `dungeon_floor` | `src/assets/terrain/dungeon_floor.png` | 32×32 반복 타일(TileSprite), 석재 바닥 | P1 | 기존 색상 계열 계승 |
| 천장 사다리꼴 `fillTriangle(#100f19)` | `dungeon_ceiling` | `src/assets/terrain/dungeon_ceiling.png` | 32×32 반복 타일, 어두운 천장 | P1 | 상동 |
| 좌/우측 벽 `fillRect(#312944)` | `dungeon_wall_side` | `src/assets/terrain/dungeon_wall_side.png` | 32×32 반복 타일, 벽돌 벽 | P1 | 좌·우 공용(좌우 반전 없이 사용) |
| 정면 막다른 벽 `fillRect(#3c324c)`+`lineBetween` | `dungeon_wall_front` | `src/assets/terrain/dungeon_wall_front.png` | 32×32 반복 타일, 정면 벽돌+밝은 줄눈 | P1 | 기존 가로줄 연출 의도 계승 |
| (없음, 신규) | `marker_encounter` | `src/assets/terrain/marker_encounter.png` | 24×24 단일 아이콘, 조우 지점 표시 | P2 | AGENTS.md 8항: 조우 표시-판정 위치 일치 요구 충족용 |
| (없음, 신규) | `marker_exit` | `src/assets/terrain/marker_exit.png` | 24×24 단일 아이콘, 퀘스트 출구 표시 | P2 | 상동, 출구 표시 요구 충족용 |

P1(벽/바닥/천장 타일)은 기존 시야 프레임 3단 구조를 그대로 유지한 채 텍스처만 교체하는 목적이라 위험이 낮다. P2(조우/출구 마커)는 기존에 없던 신규 표현이므로 좌표 배치·판정 위치 일치 검증이 별도로 필요해 우선순위를 낮춘다.

## fallback 원칙

- `ExplorationScene.ts`는 Scene 생성 시(`create()`) 6개 텍스처 각각의 로딩 성공 여부(`terrainReady`)를 개별적으로 확인한다.
- 텍스처별로 독립적으로 fallback을 적용한다: 특정 텍스처(예: `dungeon_wall_front`)만 로딩에 실패해도 그 요소만 기존 `fillRect`/`fillTriangle`/`lineBetween` Graphics 경로로 대체되며, 나머지 성공한 텍스처는 정상적으로 표시된다(전부-아니면-전무 방식이 아님).
- 기존 Graphics 코드는 삭제하지 않고 `if (!this.terrainReady.xxx) { ...기존 코드... }` 형태로 분기 보존했다(AGENTS.md 13항 준수).
- 로딩 실패 시 `console.error`(개별 파일 실패)와 `console.warn`(텍스처별 fallback 사용) 로그를 남겨 식별 가능하게 했다(AGENTS.md 9항).

## 산출물 (전체 완료)

- `assets-source/terrain/generate_terrain_tiles.mjs`: 절차적 픽셀아트 생성 스크립트(원본, 재실행 가능)
- `src/assets/terrain/*.png`: 6개 런타임 이미지(draft)
- `src/vite-env.d.ts`: Vite 에셋 import(`*.png`) 타입 선언 추가(`/// <reference types="vite/client" />`)
- `src/phaser/assets/terrainAssets.ts`: 에셋 키·URL 중앙 registry, 중복 등록 방지, 로딩 여부 조회 헬퍼
- `src/phaser/ExplorationScene.ts`: `preload()`에서 registry를 통해 로딩, `create()`에서 텍스처별 준비 상태 확인 후 TileSprite/Image GameObject 생성, `drawWorld()`에서 매 상태 갱신마다 위치·크기·표시 여부 갱신. 좌/우측 벽은 depth별(3단) 풀, 정면 벽은 단일 재사용 인스턴스, 조우/출구 마커는 단일 인스턴스(맵에 각 1개뿐)로 구현.
- `asset-catalog.md`: 6개 항목의 Scene 적용 상태를 `배선 완료`로 갱신
- `changelog-assets.md`: 작업 이력 기록

## 검증 방법 및 결과 (완료)

- `npm run typecheck`: 통과
- `npm run test`(기존 21개): 전부 통과, 변경 없음(게임 판정 미변경 확인)
- `npm run build`: 성공. 6개 PNG(총 ~1.7KB)는 Vite `assetsInlineLimit` 기본값(4096B) 이하라 별도 파일이 아닌 JS 번들에 base64로 인라인됨 → 번들 +6KB, 별도 네트워크 요청/404 위험 없음
- Chrome DevTools Protocol(CDP) 기반 자체 헤드리스 브라우저 구동 스크립트로 `ExplorationScene` 실제 실행 확인:
  - Vite dev 서버(`/pn/` base 경로 포함)를 띄우고 헤드리스 Edge를 원격 디버깅 포트로 연결
  - 시작 화면 → 새 게임 → 이름 입력 → 훈련 폐허 입장 → 탐사 화면(Phaser canvas 마운트) 전체 흐름을 실제 클릭/입력으로 재현
  - 콘솔 이벤트 수집 결과 에러/예외 0건, `terrain asset unavailable` 경고 0건(6개 텍스처 전부 정상 로딩), 네트워크 실패는 무관한 `favicon.ico` 404 1건뿐(에셋 요청 아님)
  - 스크린샷으로 바닥/천장/좌우 벽/정면 벽 텍스처 렌더링 육안 확인
  - `Input.dispatchMouseEvent`(CDP)로 실제 이동 버튼(회전·전진)을 조작해 조우 셀(`E`, 좌표 3,5) 인근까지 이동 후 스크린샷 확인 — 좌표 로그(`(1,2)→(1,3)→(2,3)→(3,3)`, 방향 전환)가 기대 경로와 일치했고, 화면에 조우 마커(다이아몬드 아이콘)가 원근 프레임 내 올바른 위치에 표시됨을 확인
  - 검증에 사용한 임시 스크립트/프로세스는 작업 완료 후 정리(레포에 커밋하지 않음). `chromium-cli` 등 사전 구성된 프로젝트 실행 스킬이 없어 즉석에서 CDP 드라이버를 작성했음 — 재사용이 필요하면 `/run-skill-generator`로 프로젝트 스킬화 권장.
- 모바일 실기(Android Chrome, iOS Safari) 및 `/pn/` 프로덕션 배포 확인은 마일스톤 검증 범위로 이번 변경 단위 검증에는 포함하지 않았다.

## 미확정 / 후속 확인 필요 (탐사 지형)

- 현재 팔레트는 기존 Graphics 색상값을 그대로 계승한 draft이며, 최종 아트 디렉션 승인 전까지 `approved`로 승격하지 않는다.
- 좌/우측 벽에 동일 텍스처(`dungeon_wall_side`)를 좌우 대칭 없이 재사용하는 방식이 최종 승인 대상인지 확인 필요(기존 코드도 좌우 동일 색상이었으므로 동일 원칙 유지).
- 마일스톤 검증(전체 test, Android/iOS 실기, `/pn/` production 배포, 저장 데이터 복구 등)은 아직 수행하지 않았다.

## 대상 범위: 전투 — 적(Enemy) 고블린 1차 draft

사용자 지시: "고블린 이미지 어셋을 만들고 MVP에 적용." `src/game/content.ts` `createEnemies()`가 정의한 적은 `goblin_scout`(고블린 정찰병)·`goblin_guard`(고블린 경비병) 2종뿐이며, 둘 다 이번 요청 범위인 "고블린"에 해당해 함께 처리했다(파티·다이스는 이번 지시에 포함되지 않아 미착수 유지).

| 교체 대상(기존 `BattleScene.actorCard` Graphics) | 신규 에셋 ID | 런타임 경로 | contentId | 우선순위 |
|---|---|---|---|---|
| 사각형 몸통(70×80)+머리(42×34), 단색 `0x7b3f46` | `goblin_scout` | `src/assets/enemies/goblin_scout.png` | `goblin_scout` | P1 |
| 상동 | `goblin_guard` | `src/assets/enemies/goblin_guard.png` | `goblin_guard` | P1 |

### 결정 근거(확인 없이 진행한 가정, 미차단 판단)

- **정적 idle 프레임 단일 장(전투/피격/패배 애니메이션 없음)**: AGENTS.md 8항 "animation이 없는 캐릭터는 idle 또는 정적 프레임으로 대체"가 이를 명시적으로 허용하는 최종 형태로 규정하고 있어 별도 확인 없이 진행. 피격 연출은 기존 `animateEvents()`의 카메라 shake(`DAMAGE_APPLIED`)로 이미 충족되어 있어 변경하지 않았다. 패배 상태는 기존 사각형 placeholder와 동일하게 `setTint(0x29252e)`로 어둡게 처리(신규 아트 없이 동일 원칙 재사용).
- **2종 모두 개별 스프라이트로 제작(공용 1종 재사용 대신)**: 두 contentId가 이미 게임 데이터상 이름·능력치가 다른 별개 개체이고, `contentId` 기반 registry(`enemyAssets.ts`)가 어차피 키 단위로 매핑되므로 시각적으로도 구분해 정찰병(가죽/단검)·경비병(강철 갑옷/방패/장창)으로 분리 제작했다. 이는 이전 탐사 지형 작업에서 "좌/우 벽에 동일 텍스처 재사용"으로 결정한 것과 반대 방향의 선택이므로, 최종 승인 전까지 확정 아님을 아래에 기록한다.
- 파티(전열/후열 4인) 카드와 다이스는 이번 사용자 지시(`고블린 이미지 어셋`)의 범위 밖으로 판단해 손대지 않았다. `actorCard()`의 `// TODO(MVP): Replace geometric actors with final pixel sprites.` 주석은 파티 카드에는 여전히 유효하므로 유지했다.

## fallback 원칙 (전투 — 적)

- `BattleScene.preload()`에서 `queueEnemyAssets()`로 2개 텍스처를 로딩하고 `FILE_LOAD_ERROR`를 `console.error`로 남긴다.
- `renderActors()`가 매 상태 갱신마다 `actor.contentId`로 `enemySpriteKeyFor()`를 조회해, 텍스처가 등록·로딩되어 있으면 `enemySpriteCard()`(이미지)로, 아니면 기존 `actorCard()`(사각형)로 개별 폴백한다 — 두 적 중 하나만 로딩에 실패해도 그 적만 사각형으로 표시되고 나머지는 정상 표시된다(전부-아니면-전무 아님, AGENTS.md 9항).
- `contentId`에 매핑이 아예 없는 신규 적(향후 콘텐츠 확장)도 자동으로 같은 폴백 경로를 탄다(`enemySpriteKeyFor()`가 `undefined` 반환).
- 폴백 사용 시 `console.warn`을 `contentId`당 1회만(재렌더마다 스팸 방지) 남긴다.
- 기존 `actorCard()` Graphics 코드는 삭제하지 않고 그대로 유지했다(AGENTS.md 13항).

## 검증 방법 및 결과 (전투 — 적 고블린 1차, 완료)

- `npm run typecheck`: 통과
- `npm run test`: 기존 5개 파일 21개 테스트 전부 통과, 변경 없음(게임 판정 미변경 확인)
- `npm run build`: 성공. 2개 PNG(총 633B)는 Vite 기본 `assetsInlineLimit`(4096B) 이하라 별도 파일이 아닌 base64로 JS 번들에 인라인됨(+2.09KB) → `dist/assets/`에 이미지 파일이 생성되지 않아 네트워크 요청/404 위험 없음
- CDP(Chrome DevTools Protocol) 기반 헤드리스 Edge 구동 스크립트로 실제 실행 확인(탐사 지형 작업 때와 동일한 방식, 임시 스크립트는 검증 후 삭제하고 레포에 커밋하지 않음):
  - Vite dev 서버(`/pn/` base) → 시작 화면 → 새 게임 → 이름 입력 → 훈련 폐허 입장 → Phaser 이동/회전 버튼을 실제 클릭으로 조작해 조우 지점까지 이동 → 전투 화면(`BATTLE / ROUND 1`) 진입까지 전체 흐름 재현
  - 콘솔 이벤트 수집 결과 에러/예외 0건, `enemy asset load failed`/`enemy sprite unavailable` 경고 0건(2개 텍스처 전부 정상 로딩·스프라이트 경로로 렌더링됨을 확인)
  - 네트워크 실패는 무관한 `favicon.ico` 404 1건뿐(에셋 요청 아님)
  - 스크린샷으로 "고블린 정찰병"(가죽 갈색 튜닉+단검)과 "고블린 경비병"(강철 회색 갑옷+원형 방패+장창)이 파티 쪽 파란 사각형 placeholder와 시각적으로 뚜렷이 구분되어 렌더링됨을 육안 확인
- 모바일 실기(Android Chrome, iOS Safari) 및 `/pn/` 프로덕션 배포 확인은 마일스톤 검증 범위로 이번 변경 단위 검증에는 포함하지 않았다.

## 미확정 / 후속 확인 필요 (전투 — 적)

- 픽셀아트 실루엣/음영이 절차적 도형 조합(타원·삼각형·사각형)만으로 제작된 draft 수준이며, 탐사 지형처럼 최종 아트 디렉션 승인 전까지 `approved`로 승격하지 않는다.
- 정찰병/경비병을 별도 스프라이트로 분리 제작한 결정(위 "결정 근거" 참조)이 최종 방향인지 확인 필요.
- 피격/공격 전용 애니메이션(현재는 idle 정적 프레임 + 카메라 shake/tint만 사용) 추가 여부는 후속 확인 필요.
- 파티(전열/후열 4인) 카드, 다이스 Sprite는 이번 작업 범위에 포함되지 않아 여전히 사각형 placeholder이다(`asset-plan.md` 진행 상태 표 5단계 잔여 항목).
- 마일스톤 검증(전체 test, Android/iOS 실기, `/pn/` production 배포)은 아직 수행하지 않았다.

## 대상 범위: 전투 — 파티(Party) 종족×직업×성별×1P~4P 원본 제작

사용자 지시: "파티 케릭터 에셋에 대해서 작업을 진행할 것. 1. 종족, 직업, 성별 별로 에셋을 작성. 2. 1에서의 만들어진 파티원 에셋을 파티내 종족, 직업, 성별이 겹칠 경우를 위한 1p, 2p, 3p, 4p 용 컬러 바리에이션도 각각 작업할 것. 테스트는 간단한 기본 테스트(코드의 경우 구문 오류 정도)만 진행 할것. build 및 실제 플레이 테스트는 사용자가 진행함." — 이번 요청은 **에셋 제작까지**이며(고블린 작업 때와 달리 "MVP에 적용" 지시가 없었고, 검증도 build/실행이 아닌 구문 오류 확인으로 명시적으로 축소됨), `BattleScene.ts` 등 Phaser 코드는 건드리지 않았다.

| 축 | 값 | 개수 |
|---|---|---|
| 종족(raceId) | human, elf, dwarf, halfling (`RaceId` 타입과 동일) | 4 |
| 직업(classId) | warrior, rogue, archer, paladin, priest, mage (`ClassId` 타입과 동일) | 6 |
| 성별(gender) | male, female, neutral (SetupScreen `남성`/`여성`/`기타`에 대응) | 3 |
| 파티 슬롯(1P~4P) | 1, 2, 3, 4 | 4 |

총 4×6×3×4 = **288개** PNG(`src/assets/characters/<raceId>_<classId>_<gender>_p<slot>.png`). 상세 파라미터 표·생성 방법·대표 예시는 `asset-catalog.md`의 "파티 캐릭터(Character)" 절 참조.

### 결정 근거(확인 없이 진행한 가정, 미차단 판단)

- **성별 3종(男/女/기타) 전부를 별도 실루엣으로 제작**: `SetupScreen.tsx`가 `<option>남성</option><option>여성</option><option>기타</option>` 3종을 실제로 제공하므로 사용자 지시의 "성별 별로"를 3종 모두로 해석했다. 3종 모두 동일 체형에 머리 실루엣만 다르게 해(남성: 짧은 정수리 밴드, 여성: 어깨까지 옆머리, 기타: 귀 아래까지 중간 길이) 특정 성별에 고정관념적 체형을 부여하지 않도록 했다.
- **1P~4P는 "팀 컬러"(케이프 한 부위)만 바꾸고 종족/직업 색은 고정**: 만약 슬롯 색이 직업의 주 갑옷/로브 색 전체를 덮어써버리면 "이 캐릭터가 전사인지 마법사인지"를 슬롯마다 다시 알아볼 수 없게 되어, 오히려 직업 구분성을 해친다고 판단했다. 그래서 슬롯 색은 어깨/옆구리에 살짝 비치는 케이프(`team_accent` role) 1곳에만 적용해, "직업/종족은 항상 같은 색으로 읽히되 슬롯끼리는 케이프로 구분되는" 방식을 택했다. 이 결정이 사용자가 의도한 "컬러 바리에이션"의 범위(전신 재염색 vs 부분 액센트)와 일치하는지는 미확정으로 아래에 남긴다.
- **종족별 체형은 완전 연속 스케일링 대신 2가지 프리셋(`standard`=인간/엘프, `short`=드워프/하플링)만 사용**: 32×40 픽셀 캔버스에서 연속적인 좌표 스케일링은 픽셀 정렬이 깨지기 쉬워, 대신 발 위치(y=37~39)를 모든 종족에서 고정하고 머리·다리 비율만 프리셋 단위로 바꿔 "같은 바닥선 위에 선 서로 다른 키의 캐릭터"를 안정적으로 구현했다.
- **드워프(남성만)에게 수염, 하플링에게 맨발**을 종족 식별 요소로 추가했고, 엘프는 뾰족귀로 구분했다(인간은 기본 실루엔트를 그대로 사용해 별도 특징 없음).
- **얼굴은 눈 2개 + 입 1개만 표현**(종족별 눈 색 등 세분화 없음) — 32×40 규모에서 세부 표정 차별화는 가독성 이득이 적다고 판단해 범위를 좁혔다.

## fallback 원칙 (파티 캐릭터)

이번 작업은 Scene에 배선하지 않았으므로 아직 fallback 배선 대상이 아니다. 향후 적용 시에는 고블린 적 에셋과 동일한 원칙(텍스처별 개별 로딩 확인 → 실패 시 기존 파티 사각형 `actorCard()`로 개별 폴백, `contentId`/조합 키당 1회만 `console.warn`)을 그대로 재사용할 수 있도록 설계했다(파일명이 곧 조합 키라 look-up 로직이 단순하다).

## 검증 방법 및 결과 (파티 캐릭터, 완료 — 사용자 지시에 따라 최소 범위)

- 사용자가 "테스트는 간단한 기본 테스트(코드의 경우 구문 오류 정도)만 진행"하도록 명시적으로 범위를 축소했으므로, `npm run typecheck`/`npm run test`/`npm run build`는 이번 변경 단위 검증에서 실행하지 않았다(신규/수정된 `.ts` 코드도 없음 — `.mjs` 생성 스크립트와 PNG 산출물, 문서만 변경).
- `node assets-source/characters/generate_character_sprites.mjs` 실행 결과: 오류 없이 288개 파일 생성 완료(구문 오류 확인 충족).
- 생성된 288개 중 6개 조합(`human_warrior_male_p1`, `elf_mage_female_p2`, `dwarf_priest_neutral_p3`, `halfling_rogue_male_p4`, `elf_archer_female_p1`, `human_paladin_male_p3`)을 `Read` 도구로 육안 샘플 확인 — 종족별 체형·귀·수염, 직업별 갑옷/로브 색과 무기 실루엣, 슬롯별 케이프 색이 의도대로 반영된 것을 확인했다. 나머지 조합은 동일 파라미터 테이블에서 결정적으로 파생되므로 전수 육안 확인은 하지 않았다.
- build/실제 플레이 테스트는 사용자 지시에 따라 사용자가 직접 진행 예정이며 이번 작업에서는 수행하지 않았다.

## 미확정 / 후속 확인 필요 (파티 캐릭터, 1차 draft 시점 — 아래 절에서 해소됨)

- ~~`src/game/` 최소 인터페이스 변경 필요 여부~~ → 사용자가 "최소 인터페이스 추가 허가"로 명시적으로 승인, 아래 "전투 — 파티(Party) 적용" 절에서 구현.
- ~~케이프(팀 컬러) 방식이 사용자가 원한 "컬러 바리에이션"과 맞는지~~ → 사용자 피드백("색 차별 영역이 너무 적어서 구분하기 어려움")으로 부적합 확인, 대각선 어깨띠 방식으로 교체.
- ~~1P~4P 슬롯과 실제 파티 배열 매핑~~ → 아래 절에서 배열 인덱스+1로 확정.
- ~~288개 파일 로드 전략~~ → 아래 절에서 lazy glob 방식으로 확정.
- 남은 항목: 픽셀아트 디테일 단순화, 어깨띠 폭 비율(0.2)·엘프 귀 quad 형태는 여전히 draft이며 최종 아트 디렉션 승인 전까지 `approved`로 승격하지 않는다.

## 대상 범위: 전투 — 파티(Party) 적용 (사용자 피드백 반영 + Scene 배선)

사용자 지시 원문: `케이프의 색 차별 영역이 너무 적아서 구분하기 어려운 문제가 있음.\n엘프의 귀가 1px의 검은 선으로 표현 된 부분에 대해서는 던전 같이 어두운 배경에서는 엘프의 귀 표현이 보이지 않아서 구별이 어렵다고 판단됨.\n최소 인터페이스 추가 허가.` 이어서 `케이프의 색 차별 영역이 너무 적어서 구분하기 어려운 문제가 있음. 컬러 바리에이션 부분을 늘릴 것.\n엘프의 귀가 1px의 검은 선으로 표현 된 부분에 대해서는 던전 같이 어두운 배경에서는 엘프의 귀 표현이 보이지 않아서 구별이 어렵다고 판단됨. 엘프의 귀를 검은색이 아닌 피부색으로 표현하도록 변경할 것.\nsrc/game/types.ts·content.ts에 최소 인터페이스 추가 허가.`

### 원인 분석 및 수정 내용

1. **케이프 색 구분 영역 부족**: 팔이 케이프보다 바깥쪽까지 뻗어 있어 케이프가 거의 다 가려지는 기하학적 결함이었다. 몸통+양팔 전체 영역에 대각선 띠(폭 비율 0.2)를 몸통·소매를 그린 뒤에 덧그리는 방식으로 교체해 항상 크게 보이는 색 밴드를 확보했다.
2. **엘프 귀가 안 보임**: 이 스크립트의 outline 로직은 "실루엣이 배경과 맞닿는 모든 픽셀"을 테두리색으로 칠하는데, 얇은 삼각형 1개짜리 귀는 거의 전체가 그 조건에 해당해 스킨색 내부가 남지 않았다. 대각선을 공유하는 삼각형 2개(quad)로 교체해 실제 폭을 확보했다. 픽셀 덤프로 직접 RGBA 값을 찍어 확인하는 과정에서, 여성/기타 성별의 옆머리(sideLocks)가 같은 자리를 다시 덮어써 귀를 가리는 2차 문제도 추가로 발견해 함께 수정했다(sideLocks 시작 y좌표를 귀 아래로 이동).
3. **`src/game` 최소 인터페이스 추가(사용자 승인)**: `Actor`에 `raceId?: RaceId`·`gender?: string`을 추가하고 `createParty()`가 채우도록 구현했다. 구현 중 `MainCharacterConfig.gender`가 실제로는 `SetupScreen.tsx`의 `<select>`가 담는 한글 표시값("남성"/"여성"/"기타") 그 자체라는 것을 확인했다 — 에셋 파일명은 영문 토큰이므로 그대로 연결하면 텍스처 키가 항상 어긋난다. `toAssetGender()` 변환 헬퍼를 추가해 해결했다(CDP 검증 중 실제로 재현·수정한 버그, 아래 검증 결과 참조).
4. **Scene 배선**: `src/phaser/assets/characterAssets.ts`(신규)와 `BattleScene.ts` 수정으로 실제 렌더링에 연결했다. 상세 설계는 `asset-catalog.md`의 "Scene 적용 (파티 캐릭터, 완료)" 절 참조(중복 기록하지 않음).

### 검증 방법 및 결과 (완료 — 2단계 빌드 검증 상당)

- `npm run typecheck`/`npm run test`(21건 전부 통과, 무변경)/`npm run build`(성공, 288개 조합이 각각 개별 청크로 code-split됨) 전부 통과.
- CDP 헤드리스 Edge로 메인 캐릭터를 **의도적으로 브람과 동일한 조합**(인간/전사/남성)으로 생성해 충돌 시나리오를 재현 — 최초 실행에서 4명 전원이 폴백 사각형으로 나오는 것을 확인했고(`gender` 한글/영문 불일치 버그), 원인을 픽셀 덤프+콘솔 로그로 특정해 `toAssetGender()`로 수정한 뒤 재검증했다. 최종적으로 콘솔 오류 0건(로딩 완료 후), 4명 전원이 스프라이트로 렌더링, **1P(메인, 청색 띠)와 2P(브람, 적색 띠)가 동일한 인간 전사 남성 조합임에도 색으로 명확히 구분됨**을 스크린샷으로 확인했다.
- 엘프 귀 수정은 육안 확인 대신 PNG 픽셀을 직접 디코드해 RGBA 값을 덤프하는 방식으로 검증했다(육안 확인은 이미지 축소/업스케일 과정에서 오판 가능성이 있어, 실제 스킨색(`e8d2ae`)이 귀 중심부에 존재하고 순수 아웃라인(`14100d`)은 가장자리 1px에만 있는지 좌표 단위로 재확인). 이 과정에서 얼굴(눈/입) 색상도 동일한 방식으로 재검증해 `231a12`(의도한 어두운 색)로 정상 렌더링됨을 확인했다(육안상 흰색으로 오인했던 것은 실제 결함이 아니었음).
- 검증에 사용한 임시 CDP 스크립트·업스케일/픽셀덤프 스크립트·스크린샷은 작업 종료 후 전부 정리했으며 레포에 커밋하지 않았다.
- 모바일 실기, `/pn/` production 배포는 마일스톤 검증 범위로 이번에는 수행하지 않았다.

### 미확정 / 후속 확인 필요

- 브람/세라/로웬 종족은 각각 `dwarf/human/elf`로 반영됐다. 성별(남성/여성/남성)은 원시 표에 근거가 없어 여전히 후속 확인 대상이다.

## 대상 범위: 콘텐츠 대표 아이콘 11종

- 원본 생성기: `assets-source/icons/generate_content_icons.mjs`
- shield 제작 규격: `assets-source/icons/equipment_shield.asset.json`
- 런타임 경로: `src/assets/icons/*.png`
- 규격: 24×24 RGBA 투명 배경, 단일 정적 픽셀 이미지, React DOM에서 `image-rendering: pixelated`
- 종류: 포션 1, 검·몽둥이·단검·활·지팡이·방패·투구·갑옷 8, 액티브·패시브 2
- 등급색: PNG와 분리된 CSS token으로 일반 흰색, 고급 녹색, 희귀 파랑색, 영웅 보라색, 전설 노랑색을 적용한다.
- fallback: manifest 누락·decode 실패 항목만 `아/장/액/패` 배지로 대체하고 이름과 게임 동작은 유지한다.
- 상태: 11개 draft 생성·상점/창고/캐릭터/탐사/전투/결과 UI 배선 완료. 최종 아트 디렉션 승격은 별도다.
- 어깨띠 폭 비율(0.2), 엘프 귀 quad 형태는 draft이며 최종 승인 전까지 `approved`로 승격하지 않는다.
- 마일스톤 검증(전체 test, Android/iOS 실기, `/pn/` production 배포, 저장 데이터 복구)은 아직 수행하지 않았다.
