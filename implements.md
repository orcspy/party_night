# Party Night MVP 구현 설계

## 1. 문서 지위

- 목적: `AGENTS.md`의 첫 번째 동작 산출물을 코드로 구현할 수 있는 수준의 사양과 순서를 정의한다.
- 기준 문서: `AGENTS.md`, `architecture.md`
- 적용 범위: 모바일 웹에서 시작 화면부터 준비, 탐사, 전투, 결과, 준비 화면 복귀까지 한 사이클.
- 문서 내 **임시 결정**은 MVP 속도를 위한 기본값이며 최종 게임 규칙이 아니다.
- 실제 코드·설정·테스트 구현은 Coder가 수행한다.

## 2. 목표와 비목표

### 2.1 목표

1. `npm install` 후 `npm run dev`로 실행한다.
2. 사용자가 메인 캐릭터를 설정하고 고정 동료 3명과 파티를 구성한다.
3. 고정 격자 맵을 1인칭 시점으로 이동해 고정 조우를 시작한다.
4. AGI 기반 순서, d6 굴림, 선택 리롤, 피해 및 승패를 순수 TypeScript 엔진에서 처리한다.
5. 승리 후 출구에서 보상을 받고, 패배 시 보상 없이 준비 화면으로 복귀한다.
6. 프로필과 누적 보상을 브라우저에 저장한다.

### 2.2 비목표

- `AGENTS.md` 3.2절의 MVP 제외 기능 전체.
- 레벨업, 경험치 소비, 상점, 인벤토리 UI, 장비 교체, 파티원 생성·고용.
- 탐사 진행 중 저장·복원, 복수 퀘스트, 재조우, 보스 페이즈.
- 범용 효과 DSL, 플러그인, 라우터, 외부 상태 관리 라이브러리.
- 최종 에셋, 사운드, 정교한 밸런스 및 세로 화면 전용 UI.
- 로컬 개발용 HTTPS·인증서 구성. Production은 공인 인증서가 적용된 외부 HTTPS 웹서버를 사용한다.

## 3. 기술 구성과 실행 계약

- Vite + React + TypeScript `strict` + Phaser + Vitest.
- 구현 시점의 상호 호환되는 안정 버전을 설치하고 `package-lock.json`으로 고정한다.
- 추가 런타임 상태 관리 라이브러리는 사용하지 않는다.
- 필수 npm scripts:
  - `dev`: Vite 개발 서버
  - `build`: TypeScript 빌드 검사 후 Vite production build
  - `typecheck`: emit 없는 TypeScript 검사
  - `test`: Vitest 단일 실행
- 권장 검증 순서: `npm run typecheck` → `npm run test` → `npm run build`.

## 4. 대상 파일과 책임

초기 구현은 다음보다 세분화하지 않는다.

```text
package.json
package-lock.json
tsconfig.json
vite.config.ts
index.html
src/
├─ main.tsx                  # React 진입점
├─ styles.css                # 가로 레이아웃, 터치, safe area, pixelated 설정
├─ app/
│  ├─ App.tsx               # 화면 단계 조합 및 Phaser 마운트
│  └─ gameStore.ts          # 단일 상태 원본, command dispatch, 구독, 저장 경계
├─ game/
│  ├─ types.ts              # 상태, 명령, 이벤트, 콘텐츠 타입
│  ├─ rng.ts                # 시드 PRNG와 d6
│  ├─ exploration.ts        # 회전·이동·벽·조우·출구 판정
│  ├─ combat.ts             # 순서·굴림·리롤·피해·AI·승패
│  └─ content.ts            # 직업, 파티, 적, 스킬, 맵, 보상 임시 데이터
├─ phaser/
│  ├─ PhaserGame.ts         # Phaser 생성·정리·store bridge
│  ├─ ExplorationScene.ts   # 1인칭 벽 합성, 탐사 터치 입력
│  └─ BattleScene.ts        # 참가자·다이스 표시와 결과 기반 최소 연출
├─ ui/
│  ├─ SetupScreen.tsx       # 시작/신규·이어하기 및 캐릭터·파티 준비
│  ├─ GameHud.tsx           # 파티 HP, 위치/방향, 로그
│  ├─ BattleCommands.tsx    # 스킬·대상·리롤·건너뛰기
│  └─ ResultScreen.tsx      # 승패, 보상, 준비 복귀
└─ tests/
   ├─ rng.test.ts
   ├─ combat.test.ts
   └─ exploration.test.ts
```

- 시작 화면과 준비 화면은 MVP에서 `SetupScreen.tsx` 내부의 두 단계로 둔다.
- 파일이 커지기 전에는 별도 라우팅, providers, 서비스 계층을 추가하지 않는다.

## 5. 상태 모델

### 5.1 식별자와 기본 타입

- 콘텐츠 ID는 영문 소문자 `snake_case`.
- 개체 인스턴스 ID는 `party_main`, `party_warrior`, `enemy_goblin_scout`처럼 세션 내 고유 문자열.
- 방향은 `'north' | 'east' | 'south' | 'west'`.
- 화면 단계는 `'start' | 'setup' | 'exploration' | 'battle' | 'result'`.
- 진영은 `'party' | 'enemy'`.

### 5.2 단일 원본 `GameState`

```text
GameState
├─ screen
├─ profile
│  ├─ mainCharacterConfig { name, raceId, classId, gender }
│  ├─ totalGold
│  └─ totalExperience
├─ session | null
│  ├─ seed
│  ├─ rngState
│  ├─ party[4]
│  ├─ exploration
│  │  ├─ mapId, x, y, direction
│  │  ├─ triggeredEncounterIds
│  │  └─ questStatus
│  ├─ combat | null
│  └─ logs[]
└─ result | null
```

- `GameState`만 판정 상태의 원본이다. React와 Phaser는 선택한 스냅샷을 읽는다.
- Phaser 객체, DOM 상태, 애니메이션 진행률은 `GameState`에 넣지 않는다.
- 상태 갱신은 명령을 받아 새로운 상태와 이벤트를 반환하는 reducer 방식으로 처리한다.

### 5.3 전투 상태

```text
CombatState
├─ battleId
├─ round
├─ phase: awaiting_action | awaiting_target | awaiting_reroll | resolving | ended
├─ participants[]
├─ turnOrder[]
├─ turnIndex
├─ selectedSkillId | null
├─ pendingRoll | null
│  ├─ actorId, targetId, skillId
│  ├─ dice[] { value, rerolled }
│  ├─ fixedModifier
│  └─ rerollsRemaining
└─ usedSkillIdsByActor
```

- 전투에서 HP가 0인 참가자는 행동 및 대상에서 제외한다.
- `pendingRoll`이 있을 때 허용되지 않은 다른 행동 명령은 상태를 바꾸지 않고 거부 이벤트를 낸다.

## 6. 명령과 이벤트 계약

### 6.1 최소 `GameCommand`

```text
OPEN_SETUP
LOAD_PROFILE
START_QUEST { mainCharacterConfig, seed? }
TURN_LEFT
TURN_RIGHT
MOVE_FORWARD
MOVE_BACKWARD
SELECT_SKILL { skillId }
SELECT_TARGET { targetId }
REROLL_DIE { dieIndex }
SKIP_REROLL
RETURN_TO_SETUP
RESET_PROFILE
```

- UI와 Phaser는 상태를 직접 바꾸지 않고 위 명령만 전달한다.
- 개발 UI가 seed를 전달하지 않으면 `Date.now()`를 세션 seed 생성에 사용할 수 있다. 생성된 seed 이후의 모든 게임 판정은 `rng.ts`만 사용한다.
- `Math.random()`은 판정 코드에서 금지한다.

### 6.2 최소 `GameEvent`

```text
SCREEN_CHANGED
SESSION_STARTED
PARTY_MOVED
PARTY_TURNED
MOVE_BLOCKED
ENCOUNTER_STARTED
TURN_STARTED
DICE_ROLLED
DIE_REROLLED
DAMAGE_APPLIED
ACTOR_DEFEATED
ROUND_STARTED
BATTLE_WON
BATTLE_LOST
QUEST_COMPLETED
REWARD_GRANTED
COMMAND_REJECTED
```

- 이벤트는 확정된 결과의 표현 및 로그 생성에 사용한다.
- Phaser 애니메이션 완료 콜백은 다음 게임 결과를 확정하지 않는다.
- 연출 중 입력 잠금은 화면 로컬 상태로 둘 수 있지만, 엔진도 phase 기준으로 잘못된 명령을 거부해야 한다.

## 7. 임시 콘텐츠 사양

### 7.1 메인 캐릭터 입력

- 이름: 공백 제거 후 1~12자. 빈 값은 시작 불가.
- 종족: `human`, `elf`, `dwarf`, `halfling`.
- 직업: `warrior`, `rogue`, `archer`, `paladin`, `priest`, `mage`.
- 성별: 표시용 문자열 선택값이며 수치에 영향이 없다.
- **임시 결정**: 종족 역시 MVP에서는 수치에 영향이 없다.
- 이름 중복 검사는 동료 이름과 하지 않는다. 계정·다중 캐릭터가 없으므로 중복 개념을 도입하지 않는다.

### 7.2 직업 능력치

| 직업 | HP | ATK | DEF | AGI |
|---|---:|---:|---:|---:|
| 전사 | 30 | 5 | 4 | 2 |
| 도적 | 22 | 4 | 2 | 6 |
| 궁수 | 24 | 5 | 2 | 5 |
| 성기사 | 28 | 4 | 5 | 2 |
| 사제 | 23 | 3 | 3 | 3 |
| 마법사 | 18 | 6 | 1 | 4 |

- 생성 시 `currentHp = maxHp`.
- ATK는 공격 보정값, DEF는 피해식의 방어값으로 사용한다.
- MP, 회복, 상태 효과, 행/거리 보정은 구현하지 않는다.

### 7.3 고정 파티

| 슬롯 | 위치 | 캐릭터 | 직업 |
|---|---|---|---|
| 1 | 전열 | 메인 캐릭터 | 사용자 선택 |
| 2 | 전열 | 브람 | 전사 |
| 3 | 후열 | 세라 | 사제 |
| 4 | 후열 | 로웬 | 궁수 |

- **임시 결정**: 전열·후열은 표시 정보이며 MVP의 대상 또는 피해 공식에는 영향을 주지 않는다.
- 직업 중복을 허용한다.

### 7.4 스킬

모든 공격 피해는 다음을 사용한다.

```text
rollTotal = 유효한 dice 합 + skillFixedModifier
damage = max(1, rollTotal + actor.ATK - target.DEF)
```

| ID | 사용 캐릭터 | 다이스 | 고정 보정 | 사용 제한 | 특수 규칙 |
|---|---|---:|---:|---|---|
| `basic_attack` | 전원 | 2d6 | 0 | 없음 | 단일 적 공격 |
| `power_strike` | 전사 | 3d6 | 0 | 전투당 1회 | 단일 적 공격 |
| `quick_stab` | 도적 | 2d6 | +2 | 전투당 1회 | 단일 적 공격 |
| `aimed_shot` | 궁수 | 3d6 | 0 | 전투당 1회 | 굴린 다이스 하나를 1회 선택 리롤 가능 |
| `holy_strike` | 성기사 | 2d6 | +2 | 전투당 1회 | 단일 적 공격 |
| `smite` | 사제 | 2d6 | +1 | 전투당 1회 | 단일 적 공격 |
| `arcane_bolt` | 마법사 | 3d6 | +1 | 전투당 1회 | 단일 적 공격 |

- 각 캐릭터는 `basic_attack`과 자기 직업 스킬만 사용한다.
- 직업 스킬 사용 횟수는 캐릭터별로 추적한다.
- `aimed_shot`은 항상 고정 동료 로웬에게 있으므로 어떤 메인 직업을 선택해도 리롤 플레이가 가능하다.
- 리롤은 최초 굴림 직후에만 가능하고, 이미 리롤한 다이스는 선택할 수 없다. 이전 값은 폐기한다.
- 리롤 후 다시 리롤할 수 없으며 `SKIP_REROLL`로 최초 결과를 확정할 수 있다.

### 7.5 적과 AI

| ID | 이름 | HP | ATK | DEF | AGI | 공격 |
|---|---|---:|---:|---:|---:|---|
| `goblin_scout` | 고블린 정찰병 | 18 | 3 | 2 | 4 | 2d6 |
| `goblin_guard` | 고블린 경비병 | 24 | 4 | 3 | 2 | 2d6 |

- 적은 자신의 턴에 살아 있는 파티원 중 하나를 시드 RNG로 선택하고 기본 공격한다.
- 적 스킬, 리롤, 도주, 방어, 위치 변경은 없다.

### 7.6 맵과 퀘스트

- 맵 ID: `training_ruins`
- 크기: `7 × 7`; `#` 벽, `.` 통로, `S` 시작, `E` 고정 조우, `X` 출구.

```text
#######
#S....#
#.###.#
#...#.#
###.#.#
#..E.X#
#######
```

- 좌표 원점은 좌상단 `(0, 0)`, x는 오른쪽, y는 아래로 증가한다.
- 시작점 `(1, 1)`, 시작 방향 east.
- 조우점 `(3, 5)`, 출구 `(5, 5)`.
- 전진·후진은 방향을 바꾸지 않고 한 칸 이동한다. 좌·우회전은 위치를 바꾸지 않는다.
- 벽 또는 맵 밖으로 이동하면 위치가 유지되고 `MOVE_BLOCKED`를 발생시킨다.
- 조우점 최초 진입 시 화면을 battle로 전환한다. 승리하면 같은 위치의 exploration으로 돌아오며 조우 ID를 기록한다.
- 패배하면 즉시 result 화면으로 이동한다.
- 조우 승리 전 출구 완료는 허용하지 않는다. 현재 맵 구조상 조우점을 지나야 출구에 도달한다.
- 승리 후 출구에 진입하면 퀘스트를 완료하고 result 화면으로 이동한다.

### 7.7 보상과 복구

- 승리: 골드 100, 경험치 50을 프로필 누적값에 더한다.
- 패배: 보상 없음.
- 결과 화면에서 준비 화면으로 복귀할 때 세션을 제거하고 다음 퀘스트 시작 시 파티를 최대 HP로 재생성한다.
- 재시작은 결과 화면에서 곧바로 탐사로 가지 않고 준비 화면으로 복귀하는 단일 흐름으로 제한한다.

## 8. 처리 흐름

### 8.1 시작과 준비

1. 앱 시작 시 저장 데이터를 검증해 읽는다.
2. 저장이 없으면 “새 게임”, 있으면 “이어하기”와 “초기화”를 표시한다.
3. 새 게임/이어하기 모두 setup 단계로 이동한다. 이어하기는 진행 중 세션이 아니라 저장된 프로필만 불러온다.
4. 유효한 메인 캐릭터 입력으로 퀘스트 시작 명령을 보낸다.
5. 고정 파티, 맵, seed, 완전 회복 상태를 생성하고 exploration으로 전환한다.

### 8.2 탐사

1. Phaser의 방향 버튼이 이동·회전 명령을 보낸다.
2. 엔진이 벽과 목적 셀을 판정해 새 상태와 이벤트를 반환한다.
3. React HUD는 상태를, Phaser는 위치·방향 변경 이벤트를 표현한다.
4. 조우점이면 battle 상태를 만들고 화면을 전환한다.
5. 조우 승리 후 출구에 도착하면 보상과 result를 확정한다.

### 8.3 전투 시작과 턴

1. 파티 4명과 적 2명을 참가자로 복사한다.
2. AGI 내림차순으로 정렬한다.
3. AGI가 같으면 참가자별 시드 RNG tie 값으로 정렬하고, 극히 같은 값이면 instance ID 오름차순으로 안정화한다.
4. 순서는 전투 시작 시 한 번만 계산한다.
5. 사망한 행동자는 건너뛴다.
6. 플레이어 행동자는 React에서 스킬과 살아 있는 적 대상을 선택한다.
7. 적 행동자는 엔진이 즉시 유효 대상을 선택하고 처리한다.
8. 전체 순서를 소진하면 round를 1 증가시키고 turnIndex를 처음으로 되돌린다.

### 8.4 굴림과 리롤

1. 스킬 사용 가능 여부와 대상을 검증한다.
2. `rng.ts`로 필요한 d6를 굴려 `pendingRoll`을 만든다.
3. 리롤 권한이 없으면 즉시 피해를 확정한다.
4. `aimed_shot`이면 `awaiting_reroll`에서 다이스 선택 또는 건너뛰기를 기다린다.
5. 선택 다이스만 새 값으로 교체하고 `rerolled = true`로 표시한 뒤 피해를 확정한다.
6. HP 적용 후 적/파티 전멸을 확인하고, 아니면 다음 행동자로 진행한다.

### 8.5 승패 우선순위

- 한 번의 피해 적용 후 적 전멸을 먼저 검사하고, 이어 파티 전멸을 검사한다.
- 현재 사양에는 반사 피해나 동시 피해가 없어 양측 동시 전멸은 발생하지 않는다.
- 적 전멸: 전투 승리, exploration 복귀, 조우 완료 기록.
- 파티 전멸: 전투 패배, result 전환, 보상 없음.

## 9. React와 Phaser 경계

### 9.1 React 소유

- 시작/준비/결과 화면.
- 파티 HP, 로그, 전투 턴 표시.
- 스킬·대상·리롤 선택.
- 화면 단계에 따른 Phaser 컨테이너 마운트 여부.

### 9.2 Phaser 소유

- 탐사 원근 벽 표현: 전방 최대 3칸의 벽/통로를 단순 도형 또는 임시 이미지로 합성한다.
- 탐사 방향 버튼과 전진/후진 버튼의 시각 요소.
- 파티 및 적 임시 스프라이트, 다이스, 공격·피격 트윈.
- 엔진 이벤트를 큐로 받아 순서대로 표현하되, 이벤트 누락·연출 생략이 상태에 영향을 주지 않는다.

### 9.3 연결 및 생명주기

- `PhaserGame.ts`가 store의 `dispatch`, `getState`, `subscribe`만 Scene에 주입한다.
- Scene은 생성 시 구독하고 shutdown/destroy에서 구독과 입력 리스너를 제거한다.
- React는 Phaser 객체를 state에 저장하지 않는다.
- 전투 명령은 React만 표시하고 Phaser 전투 화면은 표현 전용으로 둔다. 탐사 명령은 Phaser 버튼만 표시해 중복 입력 UI를 피한다.

## 10. 저장 사양

- key: `party_night_mvp_save_v1`.
- 저장 데이터:

```text
{
  version: 1,
  mainCharacterConfig,
  totalGold,
  totalExperience
}
```

- 저장 시점: 유효한 프로필로 퀘스트 시작 시, 퀘스트 보상 확정 시, 결과에서 준비 화면 복귀 시.
- 읽기 실패, JSON 오류, 버전 불일치, 필수 필드 오류 시 저장을 무시하고 새 게임을 제공한다. 앱이 중단되어서는 안 된다.
- 초기화는 해당 key만 삭제하고 메모리 상태를 start로 되돌린다.
- **금지**: 세션 seed, 현재 HP, 탐사 좌표, 전투 중 상태 저장.

## 11. UI·렌더링 사양

- 논리 게임 영역 `640 × 360`, 가로 중심.
- Canvas는 `pixelArt: true`, antialias 비활성화, 이미지에 `image-rendering: pixelated`.
- 모바일 뷰포트에서 게임 영역과 React HUD가 화면 안에 들어오도록 축소하되 비율을 유지한다.
- 세로 화면에서는 회전 안내 오버레이를 표시하고 플레이 입력을 막는다. 별도 세로 레이아웃은 만들지 않는다.
- 주요 터치 영역은 최소 44 CSS px.
- safe area inset을 패딩에 반영한다.
- 게임 컨테이너에서 스크롤, 텍스트 선택, 길게 누르기 메뉴 및 의도치 않은 확대를 억제한다.
- `.game-shell`과 시작·준비·결과의 `.menu-screen`에 텍스트 선택·callout 억제를 적용하되 이름 input과 select의 편집 선택은 유지한다. Android 실기기에서 롱터치 선택 방지를 확인했다.
- 로그에는 행동자, 스킬, 최초 다이스, 리롤 전후 값, 보정, 최종 피해, 승패를 표시한다.
- 임시 그래픽은 Phaser 도형 또는 프로젝트 내부 단색 자산으로 만들고 `TODO(MVP)`로 교체 지점을 표시한다.

## 12. 오류 및 경계 처리

- 유효하지 않은 명령, 현재 phase와 맞지 않는 명령, 죽은 대상, 이미 사용한 스킬은 상태를 변경하지 않고 `COMMAND_REJECTED` 이벤트를 반환한다.
- 빠른 연속 터치가 들어와도 reducer phase와 turnIndex로 한 행동만 수락한다.
- 리롤 die index가 범위를 벗어나거나 이미 리롤된 경우 거부한다.
- HP는 `0...maxHp` 범위로 제한한다.
- 전투 로그는 메모리 증가를 막기 위해 최근 200개만 유지한다.
- 앱 백그라운드 전환 후 Phaser 연출이 중단되어도 현재 `GameState`로 화면을 다시 그릴 수 있어야 한다.
- 이름은 표시 전에 React 기본 escaping을 사용하며 HTML로 직접 삽입하지 않는다.

## 13. 자동 테스트 사양

### 13.1 `rng.test.ts`

- 같은 seed와 같은 호출 순서에서 동일한 d6 열을 반환한다.
- d6 결과는 항상 1~6이다.

### 13.2 `combat.test.ts`

- AGI가 높은 참가자가 먼저 행동한다.
- 같은 AGI와 같은 seed에서 동일한 순서가 나온다.
- 순서가 같아도 instance ID fallback으로 결과가 안정적이다.
- `damage`는 높은 DEF에서도 최소 1이다.
- 선택한 다이스 한 개만 리롤되고 나머지는 유지된다.
- 리롤한 다이스를 다시 리롤할 수 없다.
- 사용한 전투당 1회 스킬은 재사용할 수 없다.
- HP 0 참가자는 다음 턴과 대상 후보에서 제외된다.
- 적 전멸은 승리, 파티 전멸은 패배로 판정된다.
- 적 AI 대상 선택은 같은 seed에서 재현된다.

### 13.3 `exploration.test.ts`

- 벽으로 전진/후진하면 위치가 유지된다.
- 좌우회전의 방향 변환이 정확하다.
- 후진은 방향을 유지한다.
- 조우 셀 최초 진입만 전투를 시작한다.
- 승리 전 출구는 완료 처리하지 않는다.
- 조우 승리 후 출구 진입은 퀘스트를 완료한다.

### 13.4 store/저장 검증

- `gameStore`에 결정론적 패배 상태를 주입해 `BATTLE_LOST` 이후 result 전환, 보상 0, `RETURN_TO_SETUP` 이후 세션 제거와 다음 세션 완전 회복을 자동 통합 테스트한다.
- production UI에는 패배 강제 버튼이나 치트 명령을 추가하지 않는다. 테스트에서만 상태·reducer 경계를 사용한다.
- 손상된 저장 데이터가 앱 초기화를 방해하지 않는지 확인한다.
- 승리 보상만 누적되고 패배 보상은 누적되지 않는지 확인한다.

## 14. 수동 검증 시나리오

1. 새 게임에서 이름·종족·직업·성별을 선택하고 4인 파티가 표시되는지 확인한다.
2. 벽 충돌, 전진, 후진, 좌·우회전이 화면과 좌표에 반영되는지 확인한다.
3. 조우점에서 전투로 전환되는지 확인한다.
4. 행동 순서대로 스킬과 대상을 선택하고 다이스·보정·피해 로그를 확인한다.
5. 로웬의 `aimed_shot`에서 특정 다이스를 리롤하고 해당 다이스만 바뀌는지 확인한다.
6. 승리 후 탐사로 돌아와 같은 셀에서 재조우하지 않고 출구에서 골드 100/경험치 50을 받는지 확인한다.
7. 준비 화면 복귀 시 전원 HP가 회복되고 누적 보상이 저장되는지 확인한다.
8. 패배 후 무보상·준비 복귀는 현재 밸런스에서 수동 재현이 어려우므로 제13.4절의 자동 통합 테스트로 대체한다. 재현 가능한 테스트 모드가 별도로 승인된 경우에만 수동 확인한다.
9. 새로고침 후 프로필과 누적 보상만 복구되고 진행 중 세션은 복구되지 않는지 확인한다.
10. Android Chrome과 iOS Safari 실기기의 가로 화면에서 터치, safe area, 주소창·도구 막대 높이 변화, 스크롤·확대·텍스트 선택 억제를 확인한다. iOS는 `도구 막대 가리기` 활성화 후 전체 화면을 판정한다.
11. 성공 후 탐사 복귀 상태에서 조우 칸을 전진·후진해도 같은 조우가 다시 발생하지 않는지 확인한다.

## 15. 구현 단계

각 단계는 typecheck·관련 테스트·build가 성공하고 브라우저에서 진입 가능해야 완료한다.

### 단계 1: 프로젝트 기반

- Vite React TypeScript, Phaser, Vitest 구성.
- npm scripts, strict TypeScript, 기본 640×360 레이아웃.
- 빈 React 화면과 Phaser Canvas의 생성·정리 확인.

### 단계 2: 순수 엔진

- `types.ts`, `rng.ts`, 콘텐츠, 전투 계산 구현.
- 행동 순서, 다이스, 리롤, 피해, 승패 테스트 완료.
- React/Phaser 의존이 game 폴더에 없는지 확인.

### 단계 3: 전투 플레이 단위

- store, 전투 명령 UI, 로그, BattleScene 연결.
- 고정 파티 대 고정 적 전투의 승리 흐름을 실제 플레이하고, 패배 흐름은 결정론적 자동 테스트로 검증한다.
- 연속 입력과 잘못된 phase 명령 거부 확인.

### 단계 4: 탐사 플레이 단위

- 맵 이동 판정과 테스트.
- ExplorationScene의 벽 합성과 터치 입력.
- 고정 조우에서 전투로 전환하고 승리 시 탐사 복귀.

### 단계 5: 전체 루프

- 시작/준비, 메인 캐릭터 입력, 고정 파티.
- 출구 완료, 결과, 보상, 준비 복귀.
- localStorage 프로필·누적 보상 저장.

### 단계 6: 모바일 검증

- 가로 화면, safe area, 동적 viewport, 터치 영역, 스크롤/확대 오작동 수정.
- Android Chrome과 공인 HTTPS 배포 URL의 iOS Safari 실기기 플레이 루프를 확인한다.
- iOS Safari 가로 모드에서는 `도구 막대 가리기`를 전체 화면 확인 조건으로 문서화한다.
- 임시 데이터와 제외 기능을 README 또는 구현 결과 문서에 명시.

## 16. 단계별 완료 기준

- 지정된 단일 명령으로 개발 실행 가능.
- `npm run typecheck`, `npm run test`, `npm run build` 성공.
- `src/game`이 React와 Phaser를 import하지 않음.
- React와 Phaser가 HP, 다이스, 승패를 직접 계산하지 않음.
- 동일 seed 전투의 순서·굴림·AI 대상이 재현됨.
- 시작부터 승리 결과와 준비 복귀까지 실제 플레이 가능.
- 패배 판정은 자동 규칙 테스트를 통과하고, 패배 결과·무보상·준비 복귀는 결정론적 store 통합 테스트를 통과함.
- 탐사·조우·리롤·피해·보상·저장이 실제 단일 상태에 반영됨.
- Android Chrome과 iOS Safari 가로 화면에서 진행 차단 오류가 없음. iOS 전체 화면은 `도구 막대 가리기` 활성화를 전제로 한다.

## 17. 금지 범위와 변경 관리

- 현재 계획 밖 기능을 위한 인터페이스·폴더·추상 계층을 미리 만들지 않는다.
- 게임 규칙을 React/Phaser에 중복하지 않는다.
- 테스트 없이 RNG, 리롤, 피해, 승패 또는 이동 규칙을 바꾸지 않는다.
- 임시 수치와 콘텐츠 교체 지점은 `content.ts`에 집중하고 `TODO(MVP)`를 표시한다.
- 본 문서의 임시 결정을 제품 규칙으로 승격할 때 사용자 승인을 받고 `architecture.md`, `implements.md`, `changelog.md`를 함께 갱신한다.

## 18. 남은 미확정 사항

다음은 MVP 구현을 막지 않으며 현재 설계에서 의도적으로 확정하지 않는다.

- 최종 종족 능력치와 직업 밸런스.
- 최종 동료 모집·계약·사망 규칙.
- 장비, MP, 회복, 상태 효과, 성장 및 레벨업.
- 최종 에셋 규격, 오디오, 애니메이션 프레임 수.
- 최소 지원 OS·브라우저 버전과 성능 예산.
- 서버 저장, 계정, 배포 환경 및 수익 모델.

## 19. 구현 후 검증 현황과 남은 작업

### 19.1 완료된 항목

- `npm run test`, `npm run build` 성공.
- PC에서 설정 → 탐사 → 전투 → 승리 후 탐사 복귀 → 출구 → 결산 완료.
- Android 태블릿 Chrome에서 가로 UI, 세로 회전 안내, safe area·주소창, 이동, 연속 입력 방지, 전투 명령·대상·리롤, 백그라운드 복구, 저장 복구, 초기 로딩 확인.
- 공인 HTTPS `/pn/` 배포본을 iOS Safari 가로 모드에서 실행하고 `도구 막대 가리기` 활성화 후 전체 화면과 게임 동작을 확인.
- 승리 후 조우 칸을 반복 통과해도 재조우하지 않음을 확인.

### 19.2 완료된 후속 작업

1. `.menu-screen`을 포함한 모든 게임 화면에서 Android 롱터치 텍스트 선택과 callout을 억제했다. 이름 input과 select의 편집 기능은 유지했다.
2. `gameStore`의 패배 결과 전환, 무보상, 준비 복귀 및 다음 세션 회복을 검증하는 결정론적 자동 통합 테스트를 추가했다.
3. `npm run typecheck`, 관련 테스트, 전체 테스트 15개 및 production build를 통과했다.
4. Android 태블릿 실기기에서 롱터치 선택 방지를 확인했다.

### 19.3 완료 판정에서 제외하는 항목

- 실제 플레이를 통한 파티 전멸 재현. 자동 규칙·통합 테스트로 대체한다.
- 소형 Android 스마트폰 가로 화면 검증. 기기 미보유로 사용자 승인하에 제외하고 Android 태블릿 검증을 근거로 사용한다.
- 500 kB 초과 번들 경고 최적화. Android 초기 로딩 문제가 확인되지 않았으므로 현재는 조기 최적화하지 않는다.

## 20. v0.1.0 배포 기준선

- package version: `0.1.0`.
- Vite base: `/pn/`.
- 배포 형식: `npm run build` 결과인 `dist/index.html`과 `dist/assets/`를 공인 HTTPS 웹서버의 `/pn/` 경로에서 정적 서비스.
- 검증 환경: PC 브라우저, Android 태블릿 Chrome, iOS Safari 가로 모드.
- iOS 조건: `도구 막대 가리기` 활성화.
- Git 기준: 현재 상태를 `v0.1.0` 태그로 고정한다.
- 후속 콘텐츠 입력은 `raw_data_table.md`를 기준 자료로 사용하되, 테이블 입력만으로 구현 승인을 대체하지 않는다.

## 21. 기본 능력치 파생 모델 적용 사양

### 21.1 목표와 범위

- 캐릭터에 `STR`, `DEX`, `INT`, `CON`, `AGI`, `LUCK` 원본 능력치를 추가한다.
- HP·ATK·DEF·전투 AGI를 단일 파생 함수로 계산한다.
- 기존 직업별 전투 수치와 실제 플레이 밸런스를 유지한다.
- 준비 화면에서 기본 능력치와 계산된 전투 수치를 구분해 표시한다.
- 성장, 장비, 크리티컬과 LUCK 효과는 이번 적용 범위에서 제외한다.

### 21.2 대상 파일

| 파일 | 변경 사양 |
|---|---|
| `src/game/types.ts` | `BaseAttributes`, 직업 파생 설정 타입, Actor의 원본 능력치 필드 추가 |
| `src/game/content.ts` | 직업별 6능력치·공격 기준·ATK/DEF 보정 데이터 등록 |
| `src/game/combat.ts` 또는 `src/game/content.ts` | UI와 무관한 순수 `deriveCombatStats` 함수 배치 |
| `src/ui/SetupScreen.tsx` | 파티 미리보기에서 기본 능력치와 파생 수치 표시 |
| `src/ui/GameHud.tsx` | 필요 시 전투 AGI 표기명을 구분하고 HP 표시는 유지 |
| `src/tests/combat.test.ts` 또는 신규 최소 테스트 | 공식·직업별 결과·최소값·호환성 검증 |

- 파생 함수가 커지지 않으면 신규 파일을 만들지 않는다.
- React와 Phaser에서 공식을 다시 계산하지 않는다.

### 21.3 타입 사양

```text
BaseAttributes
├─ str: number
├─ dex: number
├─ int: number
├─ con: number
├─ agi: number
└─ luck: number

ClassDerivation
├─ attackBasis: str | dex | int | max_str_int
├─ attackModifier: number
└─ defenseModifier: number
```

- Actor에는 `attributes: BaseAttributes`를 원본으로 둔다.
- 기존 Actor의 `maxHp`, `atk`, `def`, `agi`는 전투에서 즉시 사용하는 파생 스냅샷으로 유지한다.
- `attributes.agi`는 기본 AGI, Actor의 `agi`는 전투 행동 순서용 AGI다.
- LUCK은 Actor에 포함하지만 현재 판정 함수에서 읽지 않는다.

### 21.4 파생 함수 계약

```text
deriveCombatStats(
  attributes: BaseAttributes,
  derivation: ClassDerivation
) -> { maxHp, atk, def, agi }
```

```text
maxHp = 11 + (CON × 2) + floor((STR + DEX) / 10)
atk = max(1, floor(attackBasis / 2) + attackModifier)
def = max(1, floor(((CON × 2) + STR + DEX) / 10) + defenseModifier)
agi = max(1, floor((AGI + 2) / 2))
```

- `max_str_int`는 `max(STR, INT)`다.
- 함수는 입력을 변경하지 않는 순수 함수다.
- 기본 능력치는 유한한 정수인지 검증한다. 직업 초기값은 1~10이며 합계 36이어야 한다.
- 파생값은 모두 1 이상의 정수다.

### 21.5 직업 임시 데이터

| class_id | STR | DEX | INT | CON | AGI | LUCK | attackBasis | ATK 보정 | DEF 보정 |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|
| `warrior` | 10 | 5 | 3 | 9 | 3 | 6 | str | 0 | 1 |
| `rogue` | 4 | 9 | 4 | 5 | 10 | 4 | dex | 0 | 0 |
| `archer` | 5 | 10 | 4 | 6 | 8 | 3 | dex | 0 | 0 |
| `paladin` | 8 | 4 | 7 | 8 | 3 | 6 | max_str_int | 0 | 3 |
| `priest` | 4 | 5 | 10 | 6 | 5 | 6 | int | -2 | 1 |
| `mage` | 3 | 7 | 10 | 3 | 7 | 6 | int | 1 | 0 |

### 21.6 생성 및 상태 흐름

1. 메인 캐릭터와 고정 동료의 직업을 선택한다.
2. 직업 콘텐츠에서 기본 능력치와 파생 설정을 읽는다.
3. `deriveCombatStats`로 전투 수치를 계산한다.
4. `currentHp = maxHp`로 Actor를 생성한다.
5. 전투 시작 시 계산된 Actor 스냅샷을 참가자로 복사한다.
6. 준비 화면 복귀와 새 퀘스트 시작 시 현재 기본 능력치에서 다시 계산한다.

### 21.7 UI 표시

- 준비 화면 파티 행에 `STR/DEX/INT/CON/AGI/LUCK`를 표시한다.
- 같은 행 또는 상세 영역에 `HP/ATK/DEF/전투 AGI`를 파생 수치로 표시한다.
- 기본 AGI는 `AGI`, 파생값은 `행동 AGI` 또는 `전투 AGI`로 표시해 구분한다.
- LUCK에는 `현재 효과 없음` 또는 동등한 안내를 제공한다.
- 모바일 가로 화면에서 정보가 넘치면 기본 능력치와 전투 수치를 두 줄로 나누며 신규 상세 화면은 만들지 않는다.

### 21.8 저장 호환성

- v0.1.0 저장 데이터는 메인 캐릭터 설정과 누적 골드·경험치만 저장하고 파티 능력치는 퀘스트 시작 시 재생성한다.
- 따라서 직업 기본 능력치 적용만으로는 save version을 변경하지 않는다.
- 향후 성장된 개별 능력치를 저장할 때 save version을 올리고 마이그레이션을 설계한다.

### 21.9 자동 테스트

- 모든 직업 기본 능력치 합계가 36인지 확인한다.
- 모든 초기 능력치가 1~10 정수인지 확인한다.
- 6개 직업의 파생 HP·ATK·DEF·AGI가 v0.1.0 값과 정확히 일치하는지 확인한다.
- CON 1 증가가 HP를 2 이상 증가시키는지 확인한다.
- STR·DEX·CON 변화가 공식에 따라 DEF에 반영되는지 확인한다.
- 직업별 attackBasis만 ATK 기본값에 영향을 주는지 확인한다.
- ATK·DEF·전투 AGI가 최소 1 미만으로 내려가지 않는지 확인한다.
- LUCK 값만 변경했을 때 현재 파생 수치가 바뀌지 않는지 확인한다.
- 동일 직업과 기본 능력치에서 동일 Actor 수치가 생성되는지 확인한다.

### 21.10 완료 기준

- 파생 공식이 순수 TypeScript에 한 번만 구현되어 있다.
- 기존 전체 자동 테스트가 유지되고 신규 능력치 테스트가 통과한다.
- `npm run typecheck`, `npm run test`, `npm run build`가 성공한다.
- 기존 6개 직업의 HP·ATK·DEF·AGI가 변경되지 않는다.
- 준비 화면에서 6개 기본 능력치와 파생 수치를 구분해 확인할 수 있다.
- LUCK이 현재 게임 판정에 영향을 주지 않는다.
- 기존 v0.1.0 저장 데이터를 초기화하지 않고 사용할 수 있다.

### 21.11 금지 범위

- 본 작업과 함께 레벨업, 장비, 크리티컬, 명중, 회피, WIS 또는 마법 방어를 구현하지 않는다.
- 파생 공식을 React 컴포넌트나 Phaser Scene에 중복 구현하지 않는다.
- 현재 수치 재현을 벗어나는 밸런스 변경을 하지 않는다.

## 22. 종족 기본 능력치 + 직업 보정값 적용 사양

### 22.1 우선순위와 목표

- 이 절은 21절의 직업 기본 능력치 소유 구조, 합계 36 직업 템플릿, v0.1.0 수치 정확 재현, `LUCK (현재 효과 없음)` 표시 요구를 대체한다.
- 최종 능력치는 종족 기본 능력치와 직업 능력치 보정의 항목별 합으로 생성한다.
- UI 표기는 `STR/DEX/INT/CON/AGI/LUK`로 통일하고 LUK 뒤의 `(현재 효과 없음)` 문구를 삭제한다.
- HP·ATK·DEF·전투 AGI 파생 공식과 순수 TypeScript 엔진 책임은 유지한다.

### 22.2 대상 파일과 변경 범위

| 파일 | 변경 사양 |
|---|---|
| `src/game/types.ts` | 능력치 타입을 유지하고 `Gender`, `AssetGender`를 남성·여성 2값으로 제한 |
| `src/game/content.ts` | 하플링·도적·마법사 수치 갱신, 한글 성별을 male/female 에셋 토큰으로만 변환 |
| `src/ui/SetupScreen.tsx` | 선택 종족을 파티 미리보기 계산에 전달, 최종 능력치 표시, `LUK` 표기와 안내 문구 삭제 |
| `src/app/gameStore.ts` | 성별 저장값을 남성·여성으로 제한하고 기존 `기타` 저장을 남성으로 정규화 |
| `src/tests/attributes.test.ts` | 직업 단독 템플릿·v0.1.0 정확 재현 테스트를 종족+직업 결합 테스트로 교체 |
| `src/tests/combat.test.ts`, `src/tests/gameStore.test.ts` | 기존 생성 기대값이 영향을 받는 경우 신규 최종 능력치 기준으로 조정 |
| `README.md` | 종족은 능력치에 영향을 주고 성별은 영향을 주지 않는 현재 규칙으로 안내 수정 |

- Phaser Scene, 에셋 registry, 탐사 규칙, 전투 피해식, 저장 형식은 변경하지 않는다.
- `raw_data_table.md` 5~6절은 본 사양과 같은 값으로 동기화되어 있으며 함께 기준으로 사용한다.

### 22.3 타입과 데이터 계약

```text
BaseAttributes
├─ str: number
├─ dex: number
├─ int: number
├─ con: number
├─ agi: number
└─ luck: number

AttributeModifiers
├─ str: number
├─ dex: number
├─ int: number
├─ con: number
├─ agi: number
└─ luck: number

RaceData
├─ name: string
└─ baseAttributes: BaseAttributes

ClassData
├─ name: string
├─ attributeModifiers: AttributeModifiers
├─ derivation: ClassDerivation
└─ skillId: string
```

- `BaseAttributes`는 종족 원본 또는 합산된 최종 능력치에 사용하며 모든 값은 1 이상의 유한한 정수다.
- `AttributeModifiers`는 음수·0·양수의 유한한 정수를 허용한다.
- UI 표시는 `LUK`지만 내부 필드는 기존 코드와의 호환성을 위해 `luck`으로 유지한다.
- Actor의 `attributes`에는 종족 원본이 아니라 직업 보정까지 적용한 최종 능력치를 저장한다.

### 22.4 확정 종족 기본값

| race_id | STR | DEX | INT | CON | AGI | LUK | 합계 |
|---|---:|---:|---:|---:|---:|---:|---:|
| `human` | 5 | 5 | 5 | 5 | 6 | 5 | 31 |
| `elf` | 3 | 7 | 6 | 4 | 7 | 4 | 31 |
| `dwarf` | 7 | 6 | 3 | 6 | 4 | 5 | 31 |
| `halfling` | 2 | 5 | 5 | 3 | 8 | 8 | 31 |

### 22.5 확정 직업 보정값

| class_id | STR | DEX | INT | CON | AGI | LUK | 보정 합계 |
|---|---:|---:|---:|---:|---:|---:|---:|
| `warrior` | +4 | -1 | 0 | +3 | 0 | 0 | +6 |
| `paladin` | +2 | 0 | +2 | +2 | 0 | 0 | +6 |
| `rogue` | -1 | +4 | 0 | 0 | +2 | +1 | +6 |
| `archer` | 0 | +3 | 0 | 0 | +3 | 0 | +6 |
| `priest` | 0 | +2 | +4 | 0 | 0 | 0 | +6 |
| `mage` | -1 | 0 | +5 | 0 | +1 | +1 | +6 |

- `ClassDerivation`의 `attackBasis`, `attackModifier`, `defenseModifier` 값은 21.5절의 기존 값을 유지한다.
- 여섯 직업의 보정 합계는 모두 +6이고 모든 종족×직업 최종 합계는 37이다.

### 22.6 합산 함수 계약

```text
combineAttributes(
  raceBase: BaseAttributes,
  classModifiers: AttributeModifiers
) -> BaseAttributes
```

처리 순서:

1. 종족 기본값 6개가 1 이상의 유한한 정수인지 검증한다.
2. 직업 보정값 6개가 유한한 정수인지 검증한다.
3. 각 키를 `raceBase[key] + classModifiers[key]`로 합산한다.
4. 최종 6개 값이 모두 1 이상인지 검증한다.
5. 입력 객체를 변경하지 않고 새 객체를 반환한다.

- 잘못된 데이터는 1로 조용히 보정하지 않고 오류를 발생시켜 콘텐츠 결함을 노출한다.
- 확정된 24개 조합의 최종 합계는 모두 37, 개별 범위는 1~11이다.

### 22.7 생성·미리보기·전투 흐름

```text
raceId → RaceData.baseAttributes ─┐
                                  ├─ combineAttributes → Actor.attributes
classId → ClassData.modifiers ────┘                         │
                                                            ▼
                                      deriveCombatStats(attributes, derivation)
                                                            │
                                                            ▼
                                         maxHp/currentHp/atk/def/전투 agi
```

1. 메인 캐릭터는 사용자가 선택한 `raceId`와 `classId`를 사용한다.
2. 고정 동료는 `COMPANION_DATA`의 브람 `dwarf`, 세라 `human`, 로웬 `elf`를 사용하며 상세 계약은 28절을 따른다.
3. `makePartyActor`는 종족 기본값과 직업 보정값을 합산한 후 파생 전투 수치를 계산한다.
4. 준비 화면도 같은 `combineAttributes`와 `deriveCombatStats`를 호출하며 계산식을 React에 복제하지 않는다.
5. 퀘스트 시작과 준비 화면 미리보기는 동일 입력에서 동일 값을 생성해야 한다.

### 22.8 UI 표시 사양

- 메인 캐릭터 행은 현재 선택된 종족과 직업의 최종 능력치를 즉시 반영한다.
- 고정 동료 3명은 각자의 `dwarf/human/elf` 종족 기본값, 직업 보정, 시작 장비를 포함한 최종값을 표시한다.
- 기본 능력치 행은 `STR … · DEX … · INT … · CON … · AGI … · LUK …` 형식으로 표시한다.
- `LUCK` 문자열과 `(현재 효과 없음)` 문구를 제거한다.
- 파생 수치 행의 `HP/ATK/DEF/전투 AGI` 표시는 유지한다.
- LUK은 설명 문구가 없어도 현재 게임 판정에서 읽지 않는다.
- 성별 선택지는 `남성`, `여성`만 표시하고 `기타` option을 제거한다.

### 22.9 저장과 호환성

- 저장 데이터의 `mainCharacterConfig.raceId`와 `classId`로 최종 능력치를 재생성하므로 save version을 변경하지 않는다.
- 기존 저장을 불러오면 동일한 종족·직업 설정을 유지하되 신규 표에 따라 전투 수치가 달라진다. 이는 승인된 밸런스 변경이다.
- 내부 `luck` 키를 유지하므로 저장 마이그레이션이나 전면 타입 이름 변경을 추가하지 않는다.
- `MainCharacterConfig.gender`는 `Gender = '남성' | '여성'`으로 제한한다.
- save version 1의 기존 `gender: '기타'`는 읽기 단계에서 `남성`으로 정규화하고 나머지 프로필 값은 유지한다. 다른 임의 문자열은 유효하지 않은 저장으로 처리한다.
- save version과 저장 키는 변경하지 않는다.
- Actor와 에셋 로더에는 `male | female`만 전달한다. 기존 `neutral` 에셋 파일은 삭제하지 않지만 신규 런타임 경로에서는 사용하지 않는다.
- 신규 profile에는 28절의 동료 종족을 적용하고 기존 profile에 저장된 동료 race는 자동 변환하지 않는다.

### 22.10 자동 테스트

- 네 종족 기본 능력치가 각각 합계 31이고 모두 1 이상의 정수인지 확인한다.
- 인간의 STR·DEX·INT·CON이 모두 동일한지 확인한다.
- 엘프·드워프·하플링의 상대적 능력치 성향이 22.4절 값과 일치하는지 확인한다.
- 여섯 직업 보정값이 22.5절과 정확히 일치하고 음수 보정을 허용하는지 확인한다.
- 24개 종족×직업 조합의 최종값이 모두 1 이상의 정수이며 합계 37인지 확인한다.
- 인간 6개 직업의 최종 능력치가 `architecture.md` 13.5절 표와 일치하는지 확인한다.
- 종족만 변경했을 때 같은 직업의 최종 능력치와 필요한 파생 수치가 변경되는지 확인한다.
- LUK만 변경했을 때 HP·ATK·DEF·전투 AGI가 바뀌지 않는 기존 테스트를 유지한다.
- 합산 함수가 입력 객체를 변경하지 않고 잘못된 기본값·보정값·최종값을 거부하는지 확인한다.
- 기존 전투·탐사·store 테스트가 모두 통과하는지 확인한다.
- 성별 타입·UI·저장 검증에서 남성·여성만 허용하는지 확인한다.
- 기존 `기타` 저장을 남성으로 정규화하면서 이름·종족·직업·누적 보상을 보존하는지 확인한다.
- 신규 profile의 브람·세라·로웬 race가 각각 `dwarf/human/elf`인지, 기존 profile의 저장 race는 유지되는지 확인한다.

### 22.11 구현 단계

1. 타입과 종족·직업 데이터 구조를 추가한다.
2. 순수 `combineAttributes`와 검증을 구현한다.
3. Actor 생성에 종족 기본값과 직업 보정값을 연결한다.
4. 준비 화면 미리보기에 메인 종족과 고정 동료 종족을 전달한다.
5. `LUK` 표기와 안내 문구 삭제를 적용한다.
6. 기존 능력치 테스트를 신규 24조합 기준으로 교체하고 전체 회귀 검증을 수행한다.
7. 성별 타입·UI·저장 정규화와 관련 테스트를 남성·여성 2값 기준으로 갱신한다.

### 22.12 완료 기준과 금지 범위

- 종족 선택이 최종 능력치와 파생 전투 수치에 실제 반영된다.
- 직업은 기본값이 아니라 6개 능력치 보정값으로만 결합된다.
- 준비 화면과 실제 Actor의 최종 능력치가 일치한다.
- UI에 `LUK`가 표시되고 `LUCK`, `(현재 효과 없음)`은 표시되지 않는다.
- `npm run typecheck`, `npm run test`, `npm run build`가 성공한다.
- 성장·장비·크리티컬·LUK 판정·성별 보정은 추가하지 않는다.
- React 또는 Phaser에 합산·파생 공식을 중복 구현하지 않는다.
- UI와 신규 Actor에서 `기타`·`neutral`을 생성하지 않는다. 기존 neutral 에셋과 역사 문서는 삭제·개작하지 않는다.

## 23. v0.2.0 전체 확장 구현 사양

### 23.1 우선순위와 적용 관계

- 이 절은 복수 퀘스트·레벨업·상점·장비·인벤토리·보스·상태 효과를 제외한 기존 MVP 비목표를 v0.2.0 범위에서 대체한다.
- 22절의 성별·종족·직업 능력치 사양을 먼저 구현한 뒤 이 절을 적용한다.
- 세부 콘텐츠 수치는 `raw_data_table.md` 22절을 동일 우선순위의 승인 데이터로 사용한다.
- 구현은 단계마다 시작부터 결과까지 플레이 가능한 상태를 유지한다.

### 23.2 대상 파일

| 파일 | 책임 |
|---|---|
| `src/game/types.ts` | v2 프로필·세션·콘텐츠·명령·이벤트 discriminated union |
| `src/game/gameEngine.ts` | 최상위 순수 command reducer와 화면·정산 전이 |
| `src/game/content.ts` | 종족·직업·스킬·장비·아이템·적·조우·맵·퀘스트 정의 |
| `src/game/characters.ts` | 성장, 최종 능력치, Actor 스냅샷, 슬롯 해금 |
| `src/game/inventory.ts` | 창고 용량, stack, instance 이동·장착·회수 |
| `src/game/shop.ts` | 등급 해금, 구매·판매, 스킬 offer 생성 |
| `src/game/rewards.ts` | 성공·실패 보상, overflow 계산·선택·포기 |
| `src/game/combat.ts` | 쿨다운·상태·자원·대상·스킬·아이템 resolver |
| `src/game/exploration.ts` | quest map 이동, 조우 순서, 함정·비밀문, 완료 판정 |
| `src/app/gameStore.ts` | dispatch·subscribe와 save adapter만 유지 |
| `src/app/saveV2.ts` | v2 envelope 읽기·검증·쓰기·초기화 |
| `src/ui/HubScreen.tsx` | 거점 탭 shell |
| `src/ui/QuestPanel.tsx` | 퀘스트 해금·선택·경고 |
| `src/ui/StoragePanel.tsx` | 통합 창고 필터·판매·이동 |
| `src/ui/CharacterPanel.tsx` | 장비·개인 인벤토리·스킬 슬롯 |
| `src/ui/ShopPanel.tsx` | 장비·아이템·스킬 구매 |
| `src/ui/ResultScreen.tsx` | 성장·해금·overflow 보상 선택 |
| `src/phaser/ExplorationScene.ts` | map/marker/trap/secret 이벤트 표현 |
| `src/phaser/BattleScene.ts` | 신규 enemy asset와 상태·전체대상 연출 |
| `src/tests/` | 각 단계 순수 규칙·store 통합 회귀 |

- 각 파일이 과도하게 커질 때만 `content.ts`를 콘텐츠 종류별 파일로 분리한다.
- 신규 상태 관리·라우팅·schema 라이브러리를 추가하지 않는다.

### 23.3 핵심 타입 계약

```text
ProfileV2
├─ profileId, createdAt, gold
├─ characters: PersistentCharacter[4]
├─ storage: SharedStorage
├─ questProgress: QuestProgress
├─ shop: ShopState
├─ random: ProfileRandomState
└─ pendingReward: PendingRewardClaim | null

PersistentCharacter
├─ characterId, name, raceId, classId, gender, row
├─ level: 1..10, experience, growth
├─ equipment { weapon, offhand, head, body }
├─ inventorySlots
└─ customSkillSlots[3]

ExpeditionSession
├─ expeditionId, questId, seed, rngState
├─ party, exploration, combat
├─ completedEncounterIds
├─ discoveredSecretIds, triggeredTrapIds
├─ pendingLoot
└─ logs
```

- `currentHp`, 전투 상태·쿨다운, 탐사 위치는 session에만 둔다.
- `growth`는 레벨업 시 적용된 누적 6능력치 증가값이다.
- Actor 생성은 profile character를 입력받아 장비·성장까지 반영한 새 스냅샷을 반환한다.

### 23.4 저장 계약

```text
key: party_night_profile_v2
envelope: { version: 2, profile: ProfileV2 }
```

- v1 키는 읽거나 삭제·변환하지 않는다.
- v2가 없으면 새 프로필 생성 화면을 표시한다.
- 저장 시점은 프로필 생성, 소비 아이템 사용, 창고 이동, 장착, 구매·판매, 성공 정산, overflow 확정, 실패 확정이다.
- 거부된 명령과 세션 내 HP·탐사·전투 변화는 저장하지 않는다.
- `pendingReward`는 성공 보상 지급 이후 정산을 보장하기 위해 저장한다.

필수 저장 불변식:

- 캐릭터 정확히 4명, 모든 ID 유일
- level 1~10, EXP 0~1000
- storage capacity 100, item quantity 1~10
- instance/stack ID 전역 중복 없음
- 한 instance가 창고와 캐릭터에 동시에 없음
- 장비 직업·손 점유 호환
- 캐릭터 custom slot 3개와 레벨별 잠금 일치
- 같은 캐릭터의 동일 skill ID 중복 장착 없음
- quest 완료·해금, rarity 해금 순서 일치

### 23.5 최종 능력치와 성장

```text
finalAttributes = raceBase + classModifiers + growth + equipmentModifiers
combatStats = deriveCombatStats(finalAttributes, classDerivation)
```

- 장비·성장 변경 시 최종 능력치와 파생 수치를 즉시 다시 계산한다.
- maxHP가 감소하면 currentHP를 새 maxHP 이하로 제한한다. 거점에서는 항상 full heal 표시를 사용한다.
- 레벨별 EXP 기준: `0,100,200,300,400,500,600,700,800,1000`.
- 성공 퀘스트당 파티 EXP 400, 캐릭터당 100.
- 레벨업은 성공 결과 정산에서만 처리한다.
- 직업별 성장표는 `raw_data_table.md` 22.3절을 정확히 적용한다.

```text
inventorySlots = 10 + min(3, floor(finalSTR / 5))
```

### 23.6 창고·개인 인벤토리

```text
usedStorageSlots = equipmentInstances.length
                 + skillInstances.length
                 + itemStacks.length
```

- item stack은 같은 item ID 최대 10개다.
- item 추가는 기존 미완성 stack을 먼저 채운 뒤 새 stack을 만든다.
- 장비·스킬 instance는 1개당 한 칸이다.
- 모든 구매 결과와 성공 실물 보상은 창고가 목적지다.
- 거점에서만 장비·아이템·스킬 이동 명령을 허용한다.
- 이동은 결과 상태를 가상 계산해 모든 검증을 통과한 후 원자적으로 적용한다.
- 반환 공간 부족, 개인 용량 초과, 직업 제한, 손 점유 충돌, 스킬 슬롯 잠금이면 전체 명령을 거부한다.
- 양손 장비 장착은 weapon/offhand 기존 장비를 모두 창고로 반환하고 offhand를 비운다.
- 창고 100칸이면 모든 구매를 차단한다.

### 23.7 상점

- 장비·소비 아이템은 해금된 등급까지 고정 무제한 재고다.
- 소비 아이템만 수량 구매를 허용한다.
- 장비·아이템·스킬 구매는 창고로 들어가며 자동 장착하지 않는다.
- 판매는 창고 항목만 가능하고 `floor(price × 0.5)`를 지급한다.
- 현재 파티가 장착할 수 없는 장비는 표시하되 경고한다.
- 스킬 offer는 custom slot이 최초 열린 뒤 활성화하며 퀘스트 성공마다 3종을 갱신한다.
- 한 offer 안의 skill ID는 중복되지 않으며 과거 보유 스킬을 제외하지 않는다.
- offer는 저장하고 reload 시 재생성하지 않는다.

등급 해금:

| 조건 | 등급 |
|---|---|
| 신규 프로필 | `common` |
| 훈련 폐허 성공 | `uncommon` |
| 유적지 성공 | `rare` |
| 지하 던전 성공 | `heroic` |
| 옛 고성 성공 | `legendary` |

### 23.8 장비와 소비 아이템

- 장비 family와 45개 등급별 항목은 `raw_data_table.md` 22.5절을 사용한다.
- 장비 보정 필드는 STR/DEX/INT/CON/AGI/LUK 여섯 개만 허용한다.
- 전사는 전 무기·방패, 도적은 단검·한손검, 성기사는 한손검·둔기·방패, 궁수는 활, 사제는 지팡이, 마법사는 지팡이·로드를 장착한다.
- 시작 장비는 전사/성기사 한손검, 도적 단검, 궁수 활, 사제 지팡이, 마법사 로드다.
- 회복·치료·피해 아이템은 해당 캐릭터 행동을 끝낸다.
- 무료 버프는 행동 전에 여러 종류 사용 가능하고 동명 버프 중 재사용은 거부하며 소모하지 않는다.
- 원정 중 사용 수량은 즉시 profile stack에서 차감한다.

### 23.9 스킬·상태 엔진

- 직업 스킬 18개와 커스텀 스킬 13개는 `raw_data_table.md` 22.6절을 사용한다.
- 공통 메타데이터는 `SkillDefinition`, 소유는 `SkillInstance`로 분리한다.
- 효과는 현재 목록에 필요한 제한된 `SkillEffect` union과 명시적 resolver만 사용한다.
- 특수 resolver 대상: `arcane_bolt`, `ability_reinforcement`, `wound_break`, `sacred_rage`, `sacrifice`, `neurotoxin`.
- 패시브는 상태로 복제하지 않고 피해·방어·탐사 계산 시 장착 목록에서 조회한다.

상태 처리:

| 상태 | 규칙 |
|---|---|
| bleed | 턴 시작 중첩 피해, 최대5, 치료 전 지속 |
| stun/paralysis | 다음 행동 기회 건너뛰고 횟수 감소 |
| taunt | 모든 적에 항상 적용, 각 적의 다음 공격 시 50%로 시전자 대상 전환 후 소비 |
| exposed | 대상 다음 행동 종료까지 받는 직접 피해 증가 |
| sleep | 직접 공격 피해 후 해제, 출혈로 유지 |
| attribute change | 명시 행동 횟수, 동일 효과 중첩 불가 |
| neurotoxin | AGI 50% 감소 비중첩 + bleed 중첩 |

- 쿨다운은 사용 즉시 명시값을 기록하고 사용 라운드 종료부터 감소한다. `cooldown_2`는 사용 라운드 종료에 1, 다음 라운드 종료에 0이 되어 그다음 actor turn에 재사용할 수 있다.
- 상태·쿨다운·성력·마력은 전투 종료 시 초기화한다.
- 상태 적용의 명시 확률은 보스에게 절반이며 시드 RNG만 사용한다. `taunt`는 적용 성공 판정이 없고 일반·boss 모두 다음 공격 대상 전환을 50%로 판정하므로 이 보스 저항 규칙에서 제외한다.
- 전체 대상 스킬은 다이스를 한 번 굴리고 고정된 actor 순서로 적용한다.

### 23.10 탐사·함정·비밀문

- map cell과 별도로 trap/secret placement ID를 데이터로 둔다.
- 살아 있는 파티원 중 `seek_trap` 보유자가 있으면 자동 발견한다.
- 발견한 trap은 발동하지 않고, 발견한 secret door는 통과 가능한 벽으로 표시한다.
- 미발견 trap 진입 시 전원 2 피해 후 전멸을 판정한다.
- 미발견 secret door는 벽으로 유지한다.
- secret room reward는 해당 퀘스트 해금 등급 이하 소비 아이템 또는 장비 1개를 시드 기반으로 생성해 pending loot에 넣는다.

### 23.11 퀘스트·맵·조우

- `QuestDefinition → MapDefinition → EncounterDefinition → EnemyDefinition` 참조 방향을 사용한다.
- `START_QUEST` 하드코딩을 `REQUEST_QUEST_ENTRY { questId }`로 대체한다.
- 필수 조우는 정의된 순서대로 활성화한다.
- 훈련 폐허는 3번째 조우, 나머지는 boss encounter 승리 즉시 완료한다.
- 순차 5개는 완료 후 재입장할 수 없다.
- 옛 고성 완료 후 화산 동굴·깊은 숲 폐허를 무제한 해금한다.
- 전체 ID·조우 파티·적 수치·asset ID는 `raw_data_table.md` 22.7~22.10절을 사용한다.

### 23.12 결정론적 랜덤과 ID

```text
ProfileRandomState
├─ rootSeed
├─ nextExpeditionSequence
├─ nextInstanceSequence
└─ shopRevision
```

- 원정 seed는 rootSeed+questId+sequence, shop seed는 rootSeed+revision으로 파생한다.
- 장비·스킬·stack·원정 ID는 증가 sequence로 생성한다.
- 보상 목록과 상점 목록은 별도 seed namespace를 사용한다.
- 테스트에서 명시적 root seed를 주입할 수 있어야 한다.

### 23.13 명령 계약

```text
CREATE_PROFILE / LOAD_PROFILE / RESET_PROFILE
REQUEST_QUEST_ENTRY / CONTINUE_QUEST_ENTRY / RETURN_TO_STORAGE
TURN_LEFT / TURN_RIGHT / MOVE_FORWARD / MOVE_BACKWARD
SELECT_SKILL / SELECT_TARGET / REROLL_DIE / SKIP_REROLL / USE_ITEM
EQUIP_ITEM / UNEQUIP_ITEM
MOVE_ITEM_TO_CHARACTER / RETURN_ITEM_TO_STORAGE
EQUIP_CUSTOM_SKILL / UNEQUIP_CUSTOM_SKILL
BUY_EQUIPMENT / BUY_ITEM / BUY_SKILL
SELL_EQUIPMENT / SELL_ITEM / SELL_SKILL
SET_REWARD_SELECTION / CONFIRM_REWARD_SELECTION / RETURN_TO_HUB
```

- 거점 전용 명령은 session이 없을 때만 허용한다.
- 대상·비용·공간·호환성 검증 실패는 상태·RNG·저장을 변경하지 않는다.
- `CONTINUE_QUEST_ENTRY`의 quest ID는 현재 warning dialog ID와 일치해야 한다.

### 23.14 이벤트 계약

- 이벤트는 type, 관련 ID, 수치 payload, log message를 가진 union으로 작성한다.
- 최소 이벤트군: profile/screen, quest/exploration, combat/status, growth/unlock, storage/equipment/skill, shop, reward/overflow.
- React와 Phaser는 message를 파싱하지 않고 payload를 사용한다.
- 애니메이션 실패·생략이 상태에 영향을 주지 않는다.

### 23.15 성공·실패·overflow 정산

성공 순서:

1. 완료 조건 검증
2. 골드 지급
3. 캐릭터당 EXP 지급·레벨업·성장 적용
4. 퀘스트·등급·반복 횟수 갱신
5. 다음 스킬 offer 생성
6. 실물·스킬 보상 생성
7. 창고 필요 칸 계산
8. 전부 수용하면 자동 저장
9. 초과하면 `pendingReward` 저장 후 사용자 선택

- item reward는 기존 partial stack을 먼저 채운 것으로 계산한다.
- 선택 필요 칸이 현재 빈칸 이하일 때만 확정한다.
- 선택하지 않은 보상은 확인 후 영구 폐기한다.
- pending reward 중 새 퀘스트·상점·배분 명령을 거부한다.

실패 순서:

- pending loot·골드·EXP·조우 진행 폐기
- 이미 사용한 소비 아이템 유지
- session 제거
- 거점 복귀 시 full heal Actor 재생성

### 23.16 UI 사양

- 화면은 `start/profile_create/hub/exploration/battle/result`로 구성한다.
- hub는 `quest/storage/characters/shop` 탭을 가진다.
- 상단에는 gold, storage 사용/100, 다음 quest, 파티 평균 level을 표시한다.
- 창고는 장비·아이템·스킬 필터와 이동·판매 대상 선택을 제공한다.
- 캐릭터 탭은 최종 능력치·파생 수치·장비·개인 inventory·skill slots를 표시한다.
- 빈칸 2 이하 퀘스트는 계속/창고 복귀 dialog를 표시한다.
- 결과는 성공/실패→EXP/레벨→성장→스킬/슬롯→퀘스트/등급→보상 선택 순서다.

### 23.17 단계별 구현 계획

| 단계 | 플레이 가능한 완료 단위 |
|---:|---|
| 0 | 22절 성별·능력치 코드 기준선 정합화 |
| 1 | v2 Profile, saveV2, 순수 gameEngine, hub shell |
| 2 | 통합 창고·장착·상점 common·개인 inventory |
| 3 | 훈련 폐허 3조우, Lv2, 고급 해금, 보상/overflow |
| 4 | 고블린 소굴, 보스 완료, Lv3 슬롯, 함정·비밀문 |
| 5 | 유적지, 소비 아이템 전 종류, 희귀 해금 |
| 6 | 지하 던전, 중간보스, 상태·쿨다운·보스 확률, 영웅 해금 |
| 7 | 옛 고성, Lv6, 전설 해금, 반복 퀘스트 해금 |
| 8 | 화산 동굴, 반복 횟수, Lv7~9 진행 |
| 9 | 깊은 숲 폐허, Lv10, 세 번째 custom slot |
| 10 | 전체 모바일·저장·overflow·장시간 반복 회귀 |

- 각 단계는 이전 단계 전체 테스트를 유지하며 별도 커밋 가능한 단위로 완성한다.
- 신규 적·배경은 ID/fallback부터 연결하고 최종 에셋은 단계 종료 후 교체할 수 있다.

### 23.18 자동 테스트 필수 범위

- v2 round-trip, v1 무시, 손상·불변식 위반 저장 거부
- 100칸·stack10·instance 위치 유일성·원자 이동
- 양손/offhand, 직업 제한, 개인 STR 용량
- 순차 5회 Lv6, 반복 5회 Lv10, 전투불능 동일 EXP
- Lv1/2/5 직업 스킬과 Lv3/7/10 custom slots
- 쿨다운 사용 라운드 감소, bleed max5, 수면·출혈, 상태 해제
- 일반/보스 상태 적용 확률 절반, taunt 다음 공격 대상 50%와 동일 seed 재현
- 직업·커스텀 스킬별 resolver 결과
- seek_trap 자동 발견, trap 전원2 피해·전멸, secret room loot
- 퀘스트 순서·재입장 금지·반복 해금·보스 즉시 완료
- 상점 등급, 판매50%, offer 3종 중복 없음·재등장 가능
- overflow item partial stack·사용자 선택·pending reward reload
- 실패 보상 폐기·사용 아이템 미복구·full heal
- 기존 RNG·리롤·AGI·최소피해·승패·벽 충돌 회귀

### 23.19 단계별 완료 기준

각 단계에서 다음을 모두 만족한다.

- 시작부터 해당 단계 결과·거점 복귀까지 실제 플레이 가능
- 순수 game 모듈에 React·Phaser import 없음
- UI·Phaser가 성장·보상·장착·확률을 계산하지 않음
- 모든 판정이 명시 seed 사용
- 저장 reload 후 프로필 불변식 유지
- 성공·실패·거부 경로 자동 테스트 포함
- 관련 content ID와 asset fallback 존재
- `npm run typecheck`, `npm run test`, `npm run build` 성공
- Android Chrome과 iOS Safari 가로 화면에서 해당 신규 UI 수동 확인

### 23.20 금지 범위

- 서버, 계정, 온라인 동기화, WebSocket, PWA를 추가하지 않는다.
- 범용 효과 DSL, 콘텐츠 에디터, 관리자 도구를 만들지 않는다.
- 장비 강화·내구도·무작위 옵션·세트 효과를 추가하지 않는다.
- 퀘스트 분기·자동 이동·자동 지도·영구 사망을 추가하지 않는다.
- 최종 에셋이 없다는 이유로 기능 단계를 막지 않고 도형·tint fallback을 사용한다.

## 24. 전투 UI·스킬 의미 정합화 구현 사양

### 24.1 목표와 적용 범위

- 전투 로그 200건 접근, 대상 선택 취소, 모든 굴림의 1초 다이스 결과 연출, 사용자 UI의 전체 콘텐츠 대표명, 패시브 명령 제거와 `protection_pledge` 적용, `taunt` 전체 대상 상태 효과, 승인된 `cooldown_x` 재사용을 하나의 회귀 수정 단위로 구현한다.
- 이 작업은 단계 4까지 구현된 퀘스트·성장·저장·창고 상태를 보존한다.
- 전체 상태 DSL이나 단계 6의 다른 상태를 앞당기지 않는다. 현재 데이터의 `cooldown_x`와 `taunt`에 필요한 제한 상태만 명시적으로 추가한다.

### 24.2 대상 파일

| 파일 | 변경 책임 |
|---|---|
| `src/game/types.ts` | skill activation/target/resolution/use limit, 취소 command, cooldown·taunt 상태, 구조화 굴림·상태 이벤트 |
| `src/game/content.ts` | 직업 스킬 의미·cooldown metadata와 콘텐츠 정의 |
| `src/game/displayNames.ts` | skill·equipment·item·quest·enemy·slot·direction·reward 표시 이름 selector |
| `src/game/combat.ts` | 취소, active 검증, cooldown, 무대상/전체대상 dispatch, passive 피해 보정, taunt 상태·AI, roll payload |
| `src/game/gameEngine.ts` | 신규 전투 command 전달과 이벤트·세션 반영 |
| `src/ui/BattleCommands.tsx` | active 필터, 대상 취소, targetMode별 화면 |
| `src/ui/GameHud.tsx` | 전체 로그 렌더링과 수동 스크롤·조건부 auto-follow |
| `src/ui/ResultScreen.tsx` | unlock·quest·reward ID의 표시 이름 변환 |
| `src/ui/StoragePanel.tsx`, `CharacterPanel.tsx`, `ShopPanel.tsx`, `HubScreen.tsx` | 분산 ID fallback 제거와 공통 대표명 적용 |
| `src/phaser/BattleScene.ts` | 상태와 독립된 1초 다이스 overlay queue와 상태 연출 |
| `src/styles.css` | 로그·명령·다이스 표시의 모바일 스크롤·버튼 스타일 |
| `src/tests/combat.test.ts` | 취소·패시브·taunt·cooldown·굴림 이벤트 회귀 |
| `src/tests/gameEngine.test.ts` | command/store 경계와 상태 반영 통합 검증 |
| `src/tests/characters.test.ts` | 해금 ID와 표시 이름 selector 검증 |

### 24.3 타입과 콘텐츠 계약

`Skill`을 다음 의미로 확장한다.

```text
activation: active | passive
targetMode: single_enemy | all_enemies | single_ally | self
resolution: damage | heal | taunt | passive_seek_trap | passive_protection
useLimit: { type: cooldown, rounds: number } | { type: once_per_battle } | { type: unlimited }
```

- 기존 `target: enemy|ally`, `effect: damage|heal`은 위 필드로 교체한다.
- `basic_attack`, `power_strike`, `quick_stab`, `aimed_shot`, `holy_strike`, `smite`, `arcane_bolt`, `lightning_bolt`, `commanding_strike`는 active/single_enemy/damage다.
- `heal`은 active/single_ally/heal이다.
- `taunt`는 active/all_enemies/taunt이며 diceCount 0이다.
- `seek_trap`은 passive/self/passive_seek_trap이다.
- `protection_pledge`는 passive/self/passive_protection이다.
- 아직 resolver가 승인되지 않은 active skill은 기존 단계 범위대로 노출 여부를 별도 제한하며 가짜 damage/heal로 대체하지 않는다.
- `power_strike`, `quick_stab`, `aimed_shot`, `holy_strike`, `arcane_bolt`, `taunt`, `find_leak`, `smite`, `lightning_bolt`의 기존 `oncePerBattle: true`를 승인 데이터의 `cooldown_2`에 해당하는 `{ type: 'cooldown', rounds: 2 }`로 교체한다.
- 실제 승인 데이터가 전투당 1회를 명시하는 스킬에만 `once_per_battle`을 사용한다. boolean 하나로 cooldown과 전투당 1회를 합치지 않는다.

공통 표시 함수:

```ts
getSkillDisplayName(skillId: string): string
getEquipmentDisplayName(equipmentId: string): string
getItemDisplayName(itemId: string): string
getQuestDisplayName(questId: string): string
getEnemyDisplayName(enemyId: string): string
getRewardDisplayName(reward: RewardEntry): string
```

- 직업 스킬은 `SKILLS`, 커스텀 스킬은 `CUSTOM_SKILL_DATA`에서 이름을 찾는다.
- slot·direction·class·race도 같은 모듈의 명시적인 dictionary/selector를 사용한다.
- 사용자 UI의 알 수 없는 값은 타입별 `알 수 없는 ...` 문구를 반환하고 원본 ID는 개발 console에서만 진단한다.
- 내부 state, command, event payload, React key와 테스트 fixture는 ID를 유지한다.

### 24.4 대상 선택 취소 command

`GameCommand`에 다음을 추가한다.

```ts
{ type: 'CANCEL_SKILL_SELECTION' }
```

처리 조건과 결과:

1. battle 화면과 `awaiting_target`에서만 허용한다.
2. 현재 actor가 살아 있는 party actor여야 한다.
3. `selectedSkillId`를 `null`, phase를 `awaiting_action`으로 되돌린다.
4. participant, turnIndex, round, pendingRoll, used skill, RNG를 변경하지 않는다.
5. 저장 요청을 만들지 않는다.
6. UI는 대상 목록 아래에 최소 터치 크기의 `스킬 선택으로` 버튼을 표시한다.

`awaiting_reroll`은 이미 굴림이 발생해 RNG가 소비된 상태이므로 이 command로 취소하지 않는다.

### 24.5 active/passive 명령 경계

- `BattleCommands`는 actor의 skill ID 중 `activation === 'active'`인 항목만 버튼으로 표시한다.
- `combat.selectSkill`도 passive ID를 직접 전달받으면 `COMMAND_REJECTED`로 방어한다.
- `seek_trap`, `protection_pledge`는 전투 command 버튼·대상 단계·다이스 이벤트를 만들지 않는다.
- `seek_trap`은 기존 탐사 판정에서 살아 있는 보유자를 조회한다.
- `protection_pledge`는 직접 공격 피해 계산 후 살아 있는 party 보유자가 한 명 이상이면 한 번만 `-1`을 적용한다. 복수 성기사가 있어도 중첩하지 않는다.

```text
baseDamage = max(1, rollTotal + actorATK - targetDEF)
finalDamage = protection_pledge 적용 시 max(1, baseDamage - 1)
```

- trap, 향후 bleed 등 직접 공격 외 피해에는 적용하지 않는다.

### 24.6 `taunt` 처리 순서

`SELECT_SKILL { skillId: 'taunt' }` 처리:

1. actor·active·사용 가능 여부를 검증한다.
2. `targetMode === all_enemies`이므로 `awaiting_target`으로 전환하지 않는다.
3. 살아 있는 적을 고정 participant 순서로 순회한다.
4. 적용 RNG를 소비하지 않고 각 enemy ID에 `{ sourceActorId, remainingAttacks: 1 }`을 항상 기록한다.
5. 피해·회복·다이스 굴림을 만들지 않는다.
6. 각 대상의 `STATUS_APPLIED` 이벤트를 만들고 현재 actor의 턴을 종료한 뒤 정상 turn 진행을 수행한다.

enemy AI 대상 선택:

- 현재 enemy에 유효한 taunt가 있고 source actor가 살아 있으면 실제 공격 직전에 시드 RNG로 50%를 판정한다.
- 성공하면 source actor, 실패하면 기존 AI 규칙의 생존 대상을 선택한다. 일반 적과 boss에 같은 50%를 적용한다.
- 공격이 실행되면 판정 결과와 관계없이 `remainingAttacks`를 감소시키고 0이면 제거한다. 공격하지 못하고 행동이 끝난 경우에는 소비하지 않는다.
- source actor가 쓰러졌거나 존재하지 않으면 taunt를 제거하고 별도 taunt RNG 없이 기존 AI 대상 선택을 수행한다.
- 사용 시 `STATUS_APPLIED`, 다음 공격의 전환 성공·실패는 `TAUNT_TARGET_RESOLVED { enemyId, sourceActorId, redirected }` 이벤트로 표현한다. 적용 저항을 뜻하는 `STATUS_RESISTED`는 taunt에서 만들지 않는다.

상태 저장 위치는 `CombatState` 내부의 제한된 명시 map으로 두고 profile·expedition 영속 상태에는 저장하지 않는다.

### 24.7 구조화 굴림 완료 이벤트

`GameEventType`에 `ROLL_RESOLVED`, `STATUS_APPLIED`, `TAUNT_TARGET_RESOLVED`, `COOLDOWN_STARTED`, `COOLDOWN_TICKED`, `SKILL_SELECTION_CANCELLED`를 추가한다. 다른 상태 resolver가 필요로 하는 `STATUS_RESISTED`와 taunt 이벤트를 혼용하지 않는다.

`ROLL_RESOLVED` payload:

```text
actorId
targetId
skillId
originalDice: number[]
finalDice: number[]
fixedModifier
rollTotal
resultKind: damage | heal
resultValue
```

- 리롤 여부와 관계없이 피해·회복 확정 직전에 정확히 한 번 생성한다.
- 기존 `DICE_ROLLED`, `DIE_REROLLED`, 피해·회복 이벤트는 로그와 입력 단계에 필요하므로 유지할 수 있다.
- Phaser와 React는 message 문자열을 파싱하지 않고 payload를 사용한다.

### 24.8 Phaser 다이스 overlay

- `BattleScene`에 actor layer와 분리된 transient dice overlay container를 둔다.
- `animateEvents`가 받은 `ROLL_RESOLVED`를 순서대로 내부 queue에 추가한다.
- overlay는 finalDice를 리롤 UI와 같은 상자 형태로 표시하고 필요하면 합계와 보정값을 함께 표시한다.
- 각 굴림은 1000ms 표시한 뒤 다음 queue 항목으로 넘어간다.
- 복수 enemy 행동이 한 dispatch에 포함되어도 이벤트 순서대로 누락 없이 표시한다.
- Scene shutdown/destroy 시 timer와 queue를 폐기한다.
- overlay 진행 여부는 engine state, 다음 command 가능 여부와 애니메이션 완료에 영향을 주지 않는다.
- `renderActors().removeAll(true)` 대상 container와 overlay container를 분리한다.

### 24.9 전투 로그 UI

- `session.logs` 전체를 오래된 항목부터 최신 항목 순서로 렌더링한다. engine의 200건 상한은 유지한다.
- `.log-box`는 header와 scroll viewport를 분리하고 viewport에 `overflow-y: auto`, `min-height: 0`, `overscroll-behavior: contain`, 모바일 관성 스크롤을 적용한다.
- 컴포넌트는 로그 갱신 직전 사용자가 bottom 16px 이내였는지 확인한다.
- bottom 근처였으면 갱신 후 최신 로그로 이동하고, 과거 로그를 읽고 있으면 현재 scrollTop을 유지한다.
- 전투 command 영역이 늘어나도 log viewport가 0보다 작은 높이가 되지 않도록 HUD flex item 경계를 유지한다.

### 24.10 전체 사용자 화면 표시 이름

- `QuestSettlementSummary.characterResults[].unlockedClassSkillIds`는 저장·테스트 계약대로 ID를 유지한다.
- `ResultScreen`은 각 ID를 `getSkillDisplayName`으로 변환해 표시한다.
- 예: `seek_trap → 함정간파`, `protection_pledge → 보호 서약`, `taunt → 도발`.
- 로그·캐릭터·창고·상점·퀘스트·결과에서 skill/equipment/item/quest/enemy ID를 표시하는 모든 위치가 공통 selector를 사용한다.
- `unlockedQuestIds`, 자동 보관 reward, direction, equipment slot, command 거부 메시지의 ID·command type을 각각 대표명 또는 사용자 문장으로 변환한다.
- `skillInstanceId`는 같은 스킬 사본 구분이 실제로 필요한 관리 화면에서만 보조 텍스트로 허용한다. reward ID·stack ID·content ID는 주 라벨로 표시하지 않는다.
- 표시 selector마다 현재 콘텐츠 ID가 안전한 대표명으로 변환되는지 exhaustive 콘텐츠 테스트를 둔다.

### 24.11 cooldown 처리

`CombatState`에 actor·skill별 남은 라운드를 둔다.

```ts
cooldownsByActor: Record<ActorId, Record<SkillId, number>>
```

사용과 감소 순서:

1. `selectSkill`은 현재 actor의 해당 skill remaining이 1 이상이면 거부한다.
2. 스킬 효과가 확정되면 `useLimit.rounds`를 remaining에 기록하고 `COOLDOWN_STARTED`를 생성한다.
3. turn order가 마지막 index에서 처음으로 wrap되어 새 round가 시작될 때만 모든 양수 remaining을 1 감소시킨다.
4. 0이 된 항목은 map에서 제거하고 `COOLDOWN_TICKED` payload에 사용 가능 상태를 포함한다.
5. 스킬 사용 라운드의 wrap에도 방금 기록한 cooldown을 감소시킨다.
6. 죽은 actor skip·enemy AI 연속 처리·전투 종료 경로는 동일 round에서 두 번 감소시키지 않는다.
7. 전투 종료와 새 combat 생성 시 map은 비어 있다.

예시:

```text
round 1 사용: 2
round 2 시작 직전 wrap: 1
round 3 시작 직전 wrap: 0
round 3 해당 actor turn: 사용 가능
```

- `BattleCommands`는 엔진 selector `getSkillAvailability(actorId, skillId)`를 사용해 disabled 여부와 `쿨다운 N`을 표시한다. UI에서 round를 별도 계산하지 않는다.
- 기존 `usedSkillIdsByActor`는 실제 `once_per_battle` 전용으로 이름과 의미를 제한하거나 해당 스킬이 없으면 제거한다.
- 저장 profile에는 전투 cooldown을 기록하지 않는다.

### 24.12 자동 테스트

`combat.test.ts`:

- 대상 선택 취소 후 phase·selectedSkill만 복원되고 RNG·turn·participants가 동일한지 확인한다.
- `seek_trap`, `protection_pledge` 직접 선택을 거부하는지 확인한다.
- active skill selector에 두 passive가 포함되지 않는지 확인한다.
- 살아 있는 `protection_pledge` 보유자가 직접 피해를 정확히 1 감소시키고 최소 피해 1을 유지하는지 확인한다.
- 보유자가 전투불능이면 감소가 없는지 확인한다.
- `taunt` 선택 시 대상 단계 없이 모든 적을 판정하고 HP가 바뀌지 않는지 확인한다.
- taunt 사용 시 모든 살아 있는 적에 RNG 소비 없이 상태가 적용되고 HP가 바뀌지 않는지 확인한다.
- 동일 seed에서 각 적의 다음 공격 대상 전환 50% 성공·실패가 재현되고 일반과 boss가 같은 경계를 사용하는지 확인한다.
- 전환 성공·실패 모두 실제 공격 후 상태를 소비하고, source 전투불능 시 정상 대상 선택으로 돌아가는지 확인한다.
- `cooldown_2`를 round 1에 사용하면 round 2에는 거부되고 round 3 해당 actor turn에 허용되는지 확인한다.
- wrap 한 번당 cooldown이 정확히 1만 감소하며 죽은 actor skip과 enemy AI 연속 처리에서 중복 감소하지 않는지 확인한다.
- 전투 종료 후 cooldown이 남지 않고, 실제 once-per-battle과 cooldown이 서로 다른 제한으로 동작하는지 확인한다.
- 일반 공격·heal·리롤 공격 각각 정확한 `ROLL_RESOLVED` payload를 생성하는지 확인한다.

`gameEngine.test.ts`:

- `CANCEL_SKILL_SELECTION`이 engine/store 경계에서 저장 요청 없이 반영되는지 확인한다.
- taunt 사용 후 다음 turn·상태 이벤트·enemy AI 대상과 전투 종료 회귀를 확인한다.

`characters.test.ts` 또는 콘텐츠 테스트:

- Lv2 해금 결과 ID를 표시 이름으로 변환했을 때 승인 한글 이름과 일치하는지 확인한다.
- active/passive/targetMode metadata가 `seek_trap`, `protection_pledge`, `taunt` 승인값과 일치하는지 확인한다.
- 전체 skill/equipment/item/quest/enemy ID와 slot/direction이 사용자용 대표명으로 변환되고 unknown 값이 원본 ID를 반환하지 않는지 확인한다.

### 24.13 수동 검증

1. 전투 로그가 8건 이상 쌓인 뒤 터치·휠로 첫 항목까지 이동할 수 있다.
2. 과거 로그를 읽는 동안 새 로그가 추가되어도 강제로 최신 위치로 이동하지 않는다.
3. 단일 대상 스킬 선택 후 `스킬 선택으로`를 눌러 다른 스킬을 고를 수 있다.
4. 기본 공격·적 공격의 최종 다이스가 1초간 표시된다.
5. 조준 사격 리롤 후 최종 다이스가 1초간 표시된다.
6. Lv2 결과, 퀘스트 해금, 보상, 창고, 캐릭터, 상점에 영문 content/reward/command ID가 아니라 대표명이 나온다.
7. 도적·성기사 turn에 passive 버튼이 나타나지 않는다.
8. 도발은 대상 선택 화면을 열지 않고 모든 적에 항상 적용되며 HP를 변경하지 않는다.
9. 도발된 일반 적과 boss의 다음 공격은 각각 50%로 전사를 선택하고, 실패하면 정상 AI 대상을 사용하며 이후 상태가 사라진다.
10. `cooldown_2` 스킬은 사용 다음 라운드에 `쿨다운 1`로 비활성화되고 그다음 라운드 해당 캐릭터 턴에 다시 활성화된다.

### 24.14 완료 기준과 금지 범위

- 관련 자동 테스트와 기존 RNG·전투·성장·퀘스트 회귀가 성공한다.
- `npm run typecheck`, `npm run test`, `npm run build`가 성공한다.
- Android Chrome과 iOS Safari 가로 화면에서 로그 스크롤·취소·1초 overlay를 확인한다.
- 로그를 7개로 잘라 접근성을 잃게 만들지 않는다.
- 이벤트 message를 파싱해 다이스·스킬 이름·상태를 복원하지 않는다.
- passive를 disabled active 버튼으로 남기지 말고 명령 목록에서 제외한다.
- taunt를 0d6 피해나 단일 대상 스킬로 처리하지 않는다.
- taunt에 적용 성공/보스 저항 판정을 추가하거나 다음 공격 대상을 무조건 강제하지 않는다.
- cooldown을 once-per-battle 배열로 대체하거나 UI에서 별도 감소시키지 않는다.
- 사용자 화면의 unknown fallback으로 원본 content/reward/command ID를 표시하지 않는다.
- 애니메이션 완료를 기다려 피해·턴·승패를 확정하지 않는다.
- 이 작업에서 범용 상태 DSL이나 단계 6의 bleed·stun·paralysis·sleep·attribute change를 구현하지 않는다.

## 25. `seek_trap` 발견·함정 발동 로그 구현 사양

### 25.1 목표와 범위

- 원정 시작 시 `seek_trap`이 자동 발견한 함정과 비밀방을 게임 로그에서 확인할 수 있게 한다.
- 패시브가 없는 파티가 미발견 함정을 밟았을 때 함정 발동을 명시적인 탐사 이벤트로 기록한다.
- 비밀방 발견과 비밀방 보상 획득을 서로 다른 로그로 구분한다.
- 기존 자동 발견, 함정 무효화, 비밀문 통과, 전원 2피해, 결정론적 비밀방 보상 규칙은 변경하지 않는다.

### 25.2 대상 파일

| 파일 | 변경 책임 |
|---|---|
| `src/game/types.ts` | 탐사 발견·발동 `GameEventType`과 placement payload |
| `src/game/gameEngine.ts` | 원정 시작 discovery event 생성, 함정 발동·비밀방 보상 로그 |
| `src/game/displayNames.ts` | 비밀방 보상 아이템 대표명 사용 |
| `src/phaser/ExplorationScene.ts` | 필요하면 `TRAP_TRIGGERED` 피해 연출 연결; 판정 변경 금지 |
| `src/tests/gameEngine.test.ts` | 패시브 발견 로그, 무패시브 발동 로그, 중복 방지 회귀 |

### 25.3 이벤트 계약

`GameEventType`에 다음을 추가한다.

```text
TRAP_DISCOVERED
SECRET_ROOM_DISCOVERED
TRAP_TRIGGERED
```

공통·개별 payload:

```text
sourceActorId?: string
placementId: string
skillId?: 'seek_trap'
damage?: number
```

- `TRAP_DISCOVERED`: `sourceActorId`, `trapId`에 해당하는 `placementId`, `skillId`를 가진다.
- `SECRET_ROOM_DISCOVERED`: `sourceActorId`, `secretId`에 해당하는 `placementId`, `skillId`를 가진다.
- `TRAP_TRIGGERED`: `trapId`와 damage를 가지며 passive source와 skill ID는 없다.
- 이벤트 소비자는 message를 파싱하지 않고 type과 payload로 발견·발동·연출을 구분한다.

### 25.4 원정 시작 처리

1. `createPartyFromCharacters`로 생성한 party에서 `currentHp > 0 && skillIds.includes('seek_trap')`인 첫 actor를 찾는다.
2. 보유자가 없으면 discovered 배열과 discovery event를 모두 빈 상태로 둔다.
3. 보유자가 있으면 기존처럼 map의 모든 trap/secret ID를 discovered 배열에 기록한다.
4. map.traps 순서대로 `TRAP_DISCOVERED`, 이어서 map.secrets 순서대로 `SECRET_ROOM_DISCOVERED`를 생성한다.
5. event 순서는 `SESSION_STARTED → TRAP_DISCOVERED* → SECRET_ROOM_DISCOVERED*`로 한다.
6. `session.logs`는 동일 event 목록을 공통 `appendEvents` 경로로 한 번만 반영한다.

메시지:

```text
{actor.name}의 함정간파: 함정을 발견했다.
{actor.name}의 함정간파: 비밀방을 발견했다.
```

- 맵에 해당 placement가 없으면 그 종류의 이벤트는 생성하지 않는다.
- 복수 보유자에 의한 중복 이벤트를 만들지 않는다.

### 25.5 탐사 이동 처리

- 이동한 칸에 미발견·미발동 trap이 있으면 기존 피해 적용 전에 `TRAP_TRIGGERED`를 생성한다.
- 메시지는 `함정 발동: 파티 전원 {damage} 피해`를 사용한다.
- 피해, 전투불능과 전멸 판정 순서는 기존과 동일하게 유지한다.
- 발견된 trap은 `TRAP_TRIGGERED`, `DAMAGE_APPLIED`, HP 변경을 만들지 않는다.
- 비밀방 reward cell에 처음 진입하면 기존 `REWARD_GRANTED`를 유지하되 `getRewardDisplayName` 또는 item selector로 다음 메시지를 사용한다.

```text
비밀방에서 {itemName}을 발견했다.
```

- `SECRET_ROOM_DISCOVERED`는 원정 시작 시 1회, `REWARD_GRANTED`는 실제 보상 칸 진입 시 1회다.

### 25.6 자동 테스트

`gameEngine.test.ts`에 다음을 검증한다.

1. 살아 있는 도적이 있는 고블린 소굴 시작 시 함정·비밀방 discovered ID와 각 발견 이벤트·로그가 정확히 한 번 생성된다.
2. 이벤트 순서가 원정 시작, 함정 발견, 비밀방 발견 순서다.
3. 복수 `seek_trap` 보유자에서도 placement당 로그가 한 번이며 첫 party actor ID가 source다.
4. `seek_trap` 보유자가 전투불능이면 발견 ID와 발견 로그가 생성되지 않는다.
5. 패시브 없는 파티가 함정에 진입하면 `TRAP_TRIGGERED`와 전원 2피해가 한 번 발생하고 재진입해도 중복 발동하지 않는다.
6. 발견된 함정 진입은 발동 이벤트·피해를 만들지 않는다.
7. 비밀방 진입 시 보상 대표명이 포함되고 secret/reward ID가 로그에 노출되지 않는다.
8. 훈련 폐허처럼 placement가 없는 맵에서는 발견 로그를 만들지 않는다.

### 25.7 완료 기준과 금지 범위

- `npm run typecheck`와 관련 gameEngine·exploration 테스트가 성공한다.
- 브라우저에서 도적 파티의 고블린 소굴 입장 직후 함정 발견·비밀방 발견 로그를 확인할 수 있다.
- 도적이 없는 파티에서는 함정 진입 시 발동·전원 피해 로그를 확인할 수 있다.
- 동일 placement의 발견·발동·보상 로그가 중복되지 않는다.
- 패시브를 active command로 되돌리거나 발견을 확률 판정으로 변경하지 않는다.
- 탐사 위치 접근 기반 탐지 범위, 수동 탐색 command, 범용 탐지 시스템을 추가하지 않는다.
- profile version, map placement와 보상 수치를 변경하지 않는다.

## 26. 수동 밸런스 데이터 동기화 구현 사양

### 26.1 목표와 우선순위

- 사용자가 직접 수정한 `raw_data_table.md`의 출혈 확률, 신경독 전투 AGI, 약점 노출 수명, 퀘스트 골드와 후반 보스 수치를 현재 단계 9 코드에 동기화한다.
- 이 절은 `23.9`의 `exposed` 수명, 기존 단계별 골드 literal, 미노타우르스·사이클롭스·스켈레톤 킹의 기존 수치를 대체한다.
- ID, profile version 2, 퀘스트 순서, EXP, 성장, 장비 가격, 상태 제거 우선순위와 boss 공통 확률 절반 규칙은 유지한다.

### 26.2 대상 파일

| 파일 | 변경 책임 |
|---|---|
| `src/game/types.ts` | source 기준 `exposedByActor` 상태 계약과 필요 시 turn-order 갱신 표지 |
| `src/game/content.ts` | 7개 퀘스트 골드, 후반 보스 능력치, 보스 스킬 dice metadata |
| `src/game/combat.ts` | 출혈 확률, 신경독 AGI·행동 순서, 약점 노출 만료, 보스 기절 확률 |
| `src/game/rewards.ts` | quest definition 기반 실제 골드 지급·summary 생성 |
| `src/game/gameEngine.ts` | 동일 quest gold가 결과와 이벤트에 전달되는지 확인; 별도 계산 금지 |
| `src/tests/combat.test.ts` | 100% bleed, AGI 순서, source 기준 exposed 단위 테스트 |
| `src/tests/stage6.test.ts` | 미노타우르스·도적 스킬·지하 던전 골드 회귀 |
| `src/tests/stage7.test.ts` | 옛 고성 신규 골드와 리치 불변 회귀 |
| `src/tests/stage89.test.ts` | 사이클롭스·스켈레톤 킹·반복 골드 회귀 |
| `src/tests/rewards.test.ts`, `src/tests/gameEngine.test.ts` | 7개 퀘스트 실제 지급액·결과 payload·저장 골드 |

### 26.3 스킬 확률

`chanceBySkill`의 일반 확률:

| skillId | 일반 | boss | 상태 |
|---|---:|---:|---|
| `quick_stab` | 100 | 50 | bleed +1 |
| `neurotoxin` | 100 | 50 | neurotoxin 최초 적용 + bleed +1 |

- boss 값은 별도 하드코딩하지 않고 기존 `normalChance / 2` 규칙으로 산출한다.
- 확률 판정은 기존 시드 RNG를 사용한다. 일반 대상에서도 판정용 RNG를 계속 소비할지 여부는 기존 공통 resolver 흐름을 유지해 명령 시퀀스 재현성을 보존한다.
- `quick_stab` 성공은 현재 stack에 1을 더하고 최대 5를 유지한다.
- `neurotoxin` 재적용 성공은 AGI를 다시 감소시키지 않고 bleed만 1 추가한다.
- boss 판정 실패 시 피해만 적용하고 bleed·neurotoxin·AGI를 모두 변경하지 않는다.

### 26.4 신경독과 행동 순서

최초 적용:

```text
originalAgi = target.agi
target.agi = max(1, floor(target.agi * 0.5))
neurotoxinsByActor[targetId] = { originalAgi }
```

행동 순서 갱신:

1. 신경독이 현재 actor의 공격 결과로 적용되면 현재 `turnIndex`까지의 ID는 고정한다.
2. 아직 행동하지 않은 suffix를 participant의 현재 `agi` 내림차순으로 안정 정렬한다.
3. AGI 동률은 기존 `turnOrder`에서 앞선 actor를 먼저 둔다.
4. 라운드가 끝나면 전체 turn order를 같은 기준으로 안정 정렬한다.
5. 현재 actor의 다음 index는 재정렬된 suffix의 첫 항목을 가리켜야 하며 actor를 중복 실행하거나 누락하지 않는다.
6. 신경독 제거 시 `originalAgi`를 복원하고 동일한 재정렬 절차를 사용한다.

- 추가 RNG를 굴리지 않는다. 전투 시작 때 정해진 seed 기반 tie 순서를 보존한다.
- 죽은 actor는 기존처럼 turn order에 남아 skip될 수 있으며 승패 처리 순서는 변경하지 않는다.
- `haste_tonic`, `ability_reinforcement`, `bless` 등 다른 AGI 변화가 turn order를 재정렬하지 않는 기존 승인 결정은 유지한다.
- 신경독 상태와 cooldown은 전투 종료 시 기존과 같이 제거된다.

### 26.5 약점 노출 상태 계약

`CombatState.exposedByActor[targetId]`:

```ts
{
  bonusDamage: number
  sourceActorId: string
  sourceActionsRemaining: number
  appliedRound: number
}
```

적용과 만료:

1. `find_leak` 성공 시 `bonusDamage = max(1, rollTotal)`, source는 시전자 궁수, `sourceActionsRemaining = 2`, `appliedRound = combat.round`로 저장한다.
2. 스킬을 사용한 현재 궁수 행동 종료에서 remaining을 1로 감소시킨다.
3. 같은 궁수의 다음 행동 기회 종료에서 0으로 감소시키고 상태를 제거한다.
4. 다음 행동 기회가 기절·마비·수면으로 skip돼도 차례 종료로 간주해 제거한다.
5. source가 다음 행동 전 HP 0이 되면 source action count로 제거하지 않는다. 사망한 현재 round의 나머지 행동 동안 유지하고 round wrap에서 제거한다.
6. source가 출혈 tick으로 자기 차례 시작에 쓰러져도 같은 사망 round 종료 규칙을 적용한다.
7. source가 살아 있으면 target 행동·target skip·target AGI와 관계없이 만료하지 않는다.
8. 같은 target 재적용은 중첩하지 않고 최신 상태로 교체한다.

- `directDamageFor`의 보너스 적용과 `head_shot` 선행 조건은 state 존재 여부를 계속 사용한다.
- 상태 제거와 라운드 만료는 구조화 event를 사용하며 message 파싱으로 판단하지 않는다.
- 전투 종료 시 상태를 영속 profile에 저장하지 않는다.

### 26.6 퀘스트 골드

| questId | 신규 골드 |
|---|---:|
| `training_ruins_quest` | 1100 |
| `goblin_den_quest` | 1100 |
| `ancient_site_quest` | 1800 |
| `underground_dungeon_quest` | 2700 |
| `old_castle_quest` | 4000 |
| `volcanic_cave_quest` | 4000 |
| `deep_forest_ruins_quest` | 4000 |

- `QUEST_DATA[questId].goldReward`를 런타임 단일 원본으로 사용한다.
- 각 settlement는 quest ID로 definition을 조회하고 다음 항목에 같은 값을 사용한다.
  - `profile.gold` 증가
  - `QuestSettlementSummary.goldGranted`
  - `GameResult.gold`
  - `REWARD_GRANTED` event message
- 반복 퀘스트도 settlement 함수 parameter의 별도 literal을 제거하고 quest definition을 사용한다.
- 기존 profile의 gold를 보정·차감·소급 지급하지 않는다.
- 실패 골드 0, overflow와 무관한 골드 선지급, 정수 안전성 규칙은 유지한다.

### 26.7 후반 보스 데이터

| contentId | HP | ATK | DEF | AGI | 스킬 |
|---|---:|---:|---:|---:|---|
| `minotaur_boss` | 120 | 8 | 6 | 4 | `minotaur_gore`: 3d6+2, stun 40% |
| `lich_boss` | 125 | 10 | 7 | 6 | `death_bolt`: 3d6+4, 변경 없음 |
| `cyclops_boss` | 150 | 10 | 7 | 2 | `crushing_blow`: 3d6+4, stun 40% |
| `skeleton_king_boss` | 145 | 9 | 7 | 5 | `royal_cleave`: 모든 생존 아군 공통 2d6 |

- `minotaur_gore`와 `crushing_blow`의 40%는 enemy가 party를 공격할 때 적용되는 명시 확률이다. party actor는 boss가 아니므로 별도 절반 변환 없이 40%다.
- 기존 `minotaur_gore`의 확률 예외는 더 이상 수치 50을 전제로 설명하지 않고, enemy skill 자체의 승인 확률 40을 그대로 사용하도록 정리한다.
- `royal_cleave`는 dice count만 2로 바꾸고 공통 한 번 굴림, 전체 생존 party 적용, 보호 서약, 처치 event와 전멸 판정을 유지한다.
- 적 asset ID, boss/undead flag, 조우 구성과 map은 변경하지 않는다.

### 26.8 구현 순서

1. `types.ts`의 exposed 상태를 source 기준 계약으로 변경한다.
2. `content.ts`의 quest·boss·skill 승인 데이터를 갱신한다.
3. `combat.ts`의 확률과 exposed 수명부터 수정하고 단위 테스트한다.
4. 신경독 적용·제거 시 현재 round suffix와 다음 round 전체 순서를 재정렬한다.
5. `rewards.ts`의 골드 literal을 quest definition 단일 원본으로 교체한다.
6. stage 6~9·reward·engine assertion을 신규 값으로 갱신한다.
7. 전체 관련 테스트 후 typecheck·전체 test·build와 모바일 후반 보스 플레이를 검증한다.

### 26.9 자동 테스트

전투 상태:

- 일반 대상 `quick_stab`과 `neurotoxin`은 여러 seed 모두 100% 상태를 적용한다.
- boss 대상은 충분한 고정 seed 표본에서 성공·실패가 모두 나오고 동일 seed 결과가 재현된다.
- bleed는 최대 5를 넘지 않으며 neurotoxin 재적용은 AGI를 추가 감소시키지 않는다.
- 신경독 대상이 현재 라운드에 아직 행동하지 않았으면 suffix에서 낮아진 AGI 위치로 이동한다.
- 이미 행동한 대상은 현재 라운드에 다시 행동하지 않고 다음 라운드부터 낮아진 AGI 순서를 사용한다.
- 동률 actor 상대 순서, 명령별 RNG 상태와 행동 횟수가 재현된다.

약점 노출:

- target이 먼저 행동해도 상태가 유지된다.
- source 궁수의 적용 행동 직후 유지되고 다음 정상 행동 종료 후 제거된다.
- source의 다음 행동이 stun/paralysis/sleep skip이어도 제거된다.
- source가 다음 차례 전에 사망하면 사망 round의 다른 actor 행동 동안 유지되고 round wrap에서 제거된다.
- source가 출혈로 다음 차례 시작에 사망하는 경로도 round wrap까지 유지된다.
- 상태가 유지되는 동안 `head_shot`을 사용할 수 있고 제거 후에는 거부된다.

경제·보스:

- 7개 quest definition, 실제 profile gold 증가, summary와 game result가 각각 승인 골드와 같다.
- 반복 퀘스트 N회 후 gold는 `initial + 4000 × N`이며 EXP1000 cap과 repeat count는 기존대로다.
- minotaur/cyclops/skeleton king의 신규 능력치와 dice metadata를 정확히 검증한다.
- minotaur와 cyclops stun 40%가 동일 seed에서 재현되고, skeleton king은 2d6 한 번으로 모든 생존 party를 공격한다.
- 리치와 unrelated 일반 적·중간보스 수치, EXP·해금·보상·overflow는 회귀한다.

### 26.10 완료 기준과 금지 범위

- `npm run typecheck`, 전체 `npm run test`, `npm run build`가 성공한다.
- Android Chrome·iOS Safari 가로 화면에서 도적 상태 표시, 궁수 약점 노출·헤드 샷, 신규 골드 결과와 후반 보스 3종을 확인한다.
- 상태·행동 순서·골드·보스 피해를 React 또는 Phaser에서 계산하지 않는다.
- profile version을 올리거나 기존 profile gold를 소급 조정하지 않는다.
- 신경독 외 AGI buff까지 turn-order 재정렬 대상으로 확대하지 않는다.
- 약점 노출을 target 행동 기준으로 남기거나 source 사망 즉시 제거하지 않는다.
- 신규 골드와 보스 수치를 별도 UI literal 또는 settlement별 중복 상수로 다시 분산하지 않는다.
- 범용 상태 DSL, 범용 경제 설정 시스템과 신규 AI를 추가하지 않는다.

## 27. 아이템·장비·스킬 대표 아이콘과 등급 색상 구현 사양

### 27.1 목표와 범위

- 소비 아이템 1종, 장비 8종, 스킬 2종의 대표 픽셀 아이콘을 만들어 상점·창고·캐릭터·탐사·전투·결과 UI에 일관되게 적용한다.
- 기존 장비 rarity를 흰색/녹색/파랑색/보라색/노랑색으로 표현하고 한글 등급명을 함께 표시한다.
- 아이콘·색상은 React 표시 계층에만 추가한다. 구매·장착·사용·전투·보상 규칙, profile version 2와 저장 구조는 변경하지 않는다.
- 이 절은 `architecture.md` 19절을 구현 기준으로 사용하며 `implements.md` 26절의 밸런스 구현 범위와 독립적으로 적용할 수 있다.

### 27.2 변경·생성 대상

| 파일 | 책임 |
|---|---|
| `assets-source/icons/equipment_shield.asset.json` | 실제 방패 에셋 작업에 전달할 비런타임 규격 틀 |
| `assets-source/icons/generate_content_icons.mjs` | 외부 패키지 없이 11개 24×24 PNG를 결정적으로 생성 |
| `src/assets/icons/*.png` | 대표 아이콘 런타임 파일 11개 |
| `src/ui/contentPresentation.ts` | 콘텐츠 ID에서 icon key·rarity·표시명을 파생하는 순수 selector |
| `src/ui/ContentIcon.tsx` | DOM 이미지 manifest, 크기·대체 배지·접근성 처리 |
| `src/ui/ShopPanel.tsx` | 상품 세 종류 아이콘과 장비 등급 표시 |
| `src/ui/StoragePanel.tsx` | 보관 장비·아이템·스킬 표시 |
| `src/ui/CharacterPanel.tsx` | 직업/커스텀 스킬·장착 장비·개인 아이템 표시 |
| `src/ui/ExplorationItems.tsx` | 탐사 아이템 대표 아이콘 표시 |
| `src/ui/BattleCommands.tsx` | 액티브 스킬·전투 아이템 버튼 표시 |
| `src/ui/ResultScreen.tsx` | 신규 스킬·등급 해금·자동/초과 보상 표시 |
| `src/styles.css` | 아이콘 레이아웃, pixelated 처리, rarity token과 badge |
| `src/tests/assets.test.ts` | 아이콘 파일·mapping·fallback·rarity 계약 검증 |
| `asset-catalog.md`, `asset-plan.md`, `changelog-assets.md` | 실제 에셋 생성·적용 후 상태·재현법·검증 결과 기록 |

다음 파일은 수정하지 않는다.

- `src/game/types.ts`: 영속 instance와 `Rarity` 계약 유지
- `src/game/content.ts`: 현재 장비 rarity, 아이템, 스킬 데이터 유지
- `src/app/saveV2.ts`: profile version·validator 유지
- `src/phaser/**`: React UI 아이콘을 Phaser texture로 중복 등록하지 않음
- `raw_data_table.md`: 콘텐츠 수치와 승인 원본 유지

### 27.3 대표 아이콘 파일 계약

| icon key | 런타임 파일 | 기본 fallback 글자 |
|---|---|---|
| `item_potion` | `src/assets/icons/item_potion.png` | `아` |
| `equipment_sword` | `src/assets/icons/equipment_sword.png` | `장` |
| `equipment_club` | `src/assets/icons/equipment_club.png` | `장` |
| `equipment_dagger` | `src/assets/icons/equipment_dagger.png` | `장` |
| `equipment_bow` | `src/assets/icons/equipment_bow.png` | `장` |
| `equipment_staff` | `src/assets/icons/equipment_staff.png` | `장` |
| `equipment_shield` | `src/assets/icons/equipment_shield.png` | `장` |
| `equipment_helmet` | `src/assets/icons/equipment_helmet.png` | `장` |
| `equipment_armor` | `src/assets/icons/equipment_armor.png` | `장` |
| `skill_active` | `src/assets/icons/skill_active.png` | `액` |
| `skill_passive` | `src/assets/icons/skill_passive.png` | `패` |

공통 이미지 규격:

- 24×24px, RGBA 투명 배경, 단일 정적 frame
- 1px 어두운 외곽선과 최소 2단계 내부 명암
- 이미지 내부에 글자·등급색·수치 없음
- nearest-neighbor 표시를 전제로 픽셀 경계를 정수 좌표로 작성
- 생성기는 동일 입력에서 동일 PNG byte를 만들고 외부 이미지·폰트·npm package를 사용하지 않음

도상 기준:

1. `item_potion`: 마개·목·둥근 병과 밝은 액체면
2. `equipment_sword`: 좌하단 손잡이에서 우상단 칼끝으로 향하는 직선 검
3. `equipment_club`: 두꺼운 타격부와 짧은 손잡이의 범용 둔기
4. `equipment_dagger`: 검보다 짧고 넓은 날과 작은 가드
5. `equipment_bow`: 곡선 활대·시위·중앙 손잡이
6. `equipment_staff`: 긴 목재 실루엣과 상단 장식
7. `equipment_shield`: 캔버스 대부분을 채우는 정면 heater/kite 방패, 테두리·중앙 boss·하단 끝점
8. `equipment_helmet`: 정면 투구, 눈 틈과 측면 보호대
9. `equipment_armor`: 정면 흉갑과 어깨 보호대
10. `skill_active`: 중앙 코어에서 바깥으로 뻗는 발동·폭발 표식
11. `skill_passive`: 장비 방패보다 작은 방패를 분리된 원형 지속 오라가 감싸는 표식

#### `equipment_shield` 후속 에셋 작업 틀

실제 PNG 작업 전에 `assets-source/icons/equipment_shield.asset.json`을 다음 정보 계약으로 생성한다. 이 파일은 제작 handoff이며 런타임 bundle에서 import하지 않는다.

```json
{
  "id": "equipment_shield",
  "kind": "equipment",
  "sourceFamily": "shield",
  "status": "spec",
  "runtimePath": "src/assets/icons/equipment_shield.png",
  "canvas": { "width": 24, "height": 24, "background": "transparent" },
  "safeBounds": { "xMin": 4, "xMax": 19, "yMin": 2, "yMax": 21 },
  "anchor": { "x": 0.5, "y": 0.5 },
  "symmetryAxisX": 11.5,
  "paletteRoles": {
    "outline": "#17131f",
    "base": "#a8adb7",
    "shadow": "#626976",
    "highlight": "#d9dde5",
    "trim": "#8f7444",
    "rivet": "#c0a26c"
  },
  "fallbackText": "장"
}
```

형태 계약:

- 비투명 실루엣은 safe bounds 안에만 두고 1px 외곽 투명 여백을 보존한다.
- 상단은 좌우가 넓은 완만한 곡선·어깨, 중단은 거의 수직인 측면, 하단은 중심 `(12,21)`으로 모이는 끝점을 사용한다.
- 외곽 1px은 `outline`, 안쪽 1px rim은 `trim`, 면 중앙은 `base`, 우하단은 `shadow`, 좌상단은 `highlight` 역할을 사용한다.
- 중앙 boss는 3×3px 이하로 두고 rivet 역할을 사용한다. 문장·문자·문장형 문양은 넣지 않는다.
- 금속의 구체적 색은 대표 icon의 중립 팔레트이며 common~legendary rarity를 표현하지 않는다. 등급은 CSS frame이 담당한다.
- `skill_passive`와 혼동되지 않도록 glow·원형 aura·외부 particle을 금지하고 전체 비투명 픽셀 중 방패 본체가 70% 이상을 차지하게 한다.
- 실제 에셋 작업자는 위 JSON의 ID·경로·크기·bounds·역할명은 유지하고 역할별 색상 미세 조정과 내부 pixel pattern만 변경할 수 있다.
- PNG 완성 후 상태는 JSON이 아니라 `asset-catalog.md`에서 `draft`와 배선 상태로 기록한다. JSON은 제작 기준값으로 보존한다.

### 27.4 presentation 타입과 selector

`src/ui/contentPresentation.ts`에 게임 판정과 독립적인 표시 타입을 둔다.

```ts
export type ContentIconKey =
  | 'item_potion'
  | 'equipment_sword'
  | 'equipment_club'
  | 'equipment_dagger'
  | 'equipment_bow'
  | 'equipment_staff'
  | 'equipment_shield'
  | 'equipment_helmet'
  | 'equipment_armor'
  | 'skill_active'
  | 'skill_passive'

export type PresentationRarity = Rarity | 'neutral'

export interface ContentPresentation {
  label: string
  iconKey: ContentIconKey | null
  fallbackText: '아' | '장' | '액' | '패'
  rarity: PresentationRarity
  rarityLabel: string | null
}
```

노출 함수:

```ts
getEquipmentPresentation(equipmentId: string): ContentPresentation
getItemPresentation(itemId: string): ContentPresentation
getSkillPresentation(skillId: string): ContentPresentation
getRewardPresentation(reward: PendingRewardEntry): ContentPresentation
getRarityDisplayName(rarity: Rarity): string
```

장비 family mapping:

```text
dagger → equipment_dagger
sword  → equipment_sword
mace   → equipment_club
bow    → equipment_bow
staff  → equipment_staff
rod    → equipment_staff
head   → equipment_helmet
body   → equipment_armor
shield → equipment_shield
unknown definition/family → null + `장` fallback
```

- 장비 `label`, `rarity`는 `EQUIPMENT_DATA[equipmentId]`에서 가져온다. ID prefix를 파싱하지 않는다.
- rarity 한글명은 `common=일반`, `uncommon=고급`, `rare=희귀`, `heroic=영웅`, `legendary=전설` 단일 map으로 관리한다.
- 모든 알려진 `ItemId`는 이번 대표 범위에서 `item_potion`, `neutral`, rarityLabel `null`을 반환한다. 알 수 없는 아이템도 표시명 fallback을 유지하되 iconKey는 `null`로 한다.
- 알려진 스킬은 `SKILLS[skillId].activation`에 따라 `skill_active` 또는 `skill_passive`를 반환하고 rarity는 `neutral`이다. 알 수 없는 스킬은 iconKey `null`, fallback `액` 대신 중립적인 `패`를 사용하지 말고 구현 내부 기본값 `액`을 사용하되 label은 `알 수 없는 스킬`을 유지한다.
- 보상은 `reward.kind`와 실제 equipmentId/itemId/skillId를 읽어 위 selector 중 하나에 위임한다. reward 자체에 표시 데이터를 저장하지 않는다.
- 함수는 입력 객체나 콘텐츠 정의를 수정하지 않는 순수 함수로 작성한다.

### 27.5 아이콘 manifest와 React 컴포넌트

`ContentIcon.tsx`는 `import.meta.glob('../assets/icons/*.png', { eager: true, import: 'default' })`로 11개 소형 URL을 읽고 basename을 icon key에 대응시킨다.

```ts
interface ContentIconProps {
  iconKey: ContentIconKey | null
  fallbackText: string
  label: string
  rarity?: PresentationRarity
  size?: 'small' | 'normal'
}
```

처리 규칙:

1. iconKey와 URL이 있으면 `<img>`를 렌더링한다.
2. URL이 없거나 `onError`가 발생하면 같은 24×24 frame 안에 fallbackText를 표시한다.
3. 이미지와 fallback은 인접 label을 보조하므로 `aria-hidden="true"`로 중복 낭독을 막는다.
4. wrapper에 `data-rarity={rarity ?? 'neutral'}`와 size class를 둔다.
5. icon 변경 시 이전 load error 상태가 남지 않도록 iconKey를 상태 reset 기준으로 사용한다.
6. 이미지 실패는 console을 반복 출력하지 않으며 구매·장착·사용·보상 입력을 막지 않는다.

11개 아이콘은 총량이 작으므로 eager 로드를 허용한다. manifest에 없는 key를 임의 URL 문자열로 조합하지 않는다.

### 27.6 rarity CSS 계약

`styles.css`의 `:root`에 다음 token을 추가한다.

```css
--rarity-common: #f4f4f4;
--rarity-uncommon: #62c370;
--rarity-rare: #5aa9ff;
--rarity-heroic: #b678f2;
--rarity-legendary: #ffd45a;
--rarity-neutral: #8d8397;
```

- `[data-rarity='common']`부터 `[data-rarity='legendary']`까지 `--content-accent`를 해당 token으로 설정한다.
- `.content-icon`은 24×24, flex `0 0 auto`, 1px `var(--content-accent)` 테두리, 어두운 반투명 배경을 사용한다.
- `.content-icon.small`은 20×20이고 원본 이미지를 CSS로만 축소한다.
- `.content-icon img`는 100% 크기, `object-fit: contain`, `image-rendering: pixelated`를 사용한다.
- `.content-icon-fallback`은 동일 box 안에서 중앙 정렬하고 10px monospace로 표시한다.
- `.content-identity`는 `display:flex`, `align-items:center`, 최소 gap 7px를 사용하고 기존 이름·metadata 열을 내부에 유지한다.
- `.content-name`과 `.rarity-badge`는 `color: var(--content-accent)`를 사용한다. neutral 콘텐츠 이름은 기존 본문색을 유지한다.
- 장비 행은 `border-left-color: var(--content-accent)`를 사용하되 아이템·스킬 neutral은 기존 목록색을 유지한다.
- `.rarity-badge`에는 한글 등급명을 표시하고 1px 테두리를 사용한다. 색상만으로 rarity를 전달하지 않는다.
- 버튼 전체 배경은 rarity 색으로 채우지 않고 현재 hover/disabled/touch 영역을 유지한다.

위 HEX는 임시 팔레트다. 색 조정은 token만 바꾸고 component와 콘텐츠 data를 변경하지 않는다.

### 27.7 화면별 적용 사양

#### 상점과 창고

- `ShopPanel`의 각 상품 `article` 안에서 기존 `<span>`을 `.content-identity`로 교체한다.
- 장비는 아이콘·색상 이름·`{등급명} · G ...` metadata를 표시하고 article에 rarity를 전달한다.
- 아이템은 포션 대표 아이콘, 스킬은 activation 대표 아이콘을 표시하되 등급명을 추가하지 않는다.
- `StoragePanel`은 장비 instance, item stack, skill instance에 같은 selector를 사용한다. instance ID와 수량·직업 제한·동작 버튼은 유지한다.
- shield 장비는 정상 상태에서 `equipment_shield`를 표시하고 파일 누락·decode 실패 때만 `장` fallback을 사용한다. 두 경우 모두 장착·판매할 수 있어야 한다.

#### 캐릭터 관리

- 직업 스킬의 `.join(' · ')`을 스킬별 `.content-inline-list` 요소로 교체한다. 스킬이 없으면 기존 문장 형태로 `없음`을 표시한다.
- 커스텀 스킬 slot은 장착된 경우 active/passive 아이콘을 표시하고 빈 slot·잠금 slot에는 아이콘을 만들지 않는다.
- 장착 장비는 slot 제목을 유지하면서 장비 이름 옆에 대표 아이콘·rarity badge를 표시한다. 빈 slot에는 아이콘을 만들지 않는다.
- 개인 인벤토리는 포션 대표 아이콘을 표시하고 반환 동작·수량은 유지한다.

#### 탐사와 전투

- `ExplorationItems`의 캐릭터명·아이템명 앞에 normal 포션 아이콘을 둔다. 최대 높이 145px와 대상 버튼 영역을 유지한다.
- `BattleCommands` active skill 버튼은 `skill_active`, 전투 item 버튼은 `item_potion`을 표시한다. 현재 명령 목록에는 passive가 들어오지 않는 필터를 유지한다.
- 버튼 안에는 icon과 이름을 같은 첫 행에 놓고 dice/cooldown/수량 metadata는 기존 small 행에 둔다.
- 대상 선택, 리롤, 취소 버튼에는 콘텐츠 대표 아이콘을 추가하지 않는다.

#### 결과와 보상

- 신규 직업 스킬 `.join(', ')`을 스킬별 small icon 요소로 바꾸고 신규 스킬이 없으면 `없음`을 유지한다.
- `summary.unlockedRarities`는 공통 rarity label map과 token을 사용하는 badge 목록으로 표시한다.
- 자동 보관 보상의 `.join(' · ')`을 reward별 icon+name 요소로 변경한다.
- 초과 보상 checkbox label 안에도 reward presentation을 표시하되 input의 click 영역과 선택 상태를 유지한다.
- 장비 보상에만 rarity 색과 badge를 적용하고 아이템·스킬 보상은 neutral이다.

### 27.8 fallback·예외·호환성

- icon 파일 하나가 누락되거나 decode에 실패해도 해당 항목만 fallback badge로 바뀌고 다른 아이콘은 정상 표시한다.
- 정의를 찾지 못하면 기존 안전 표시명과 fallback badge를 사용한다. 원본 ID, 파일 경로와 stack/instance 내부 값은 사용자에게 새로 노출하지 않는다.
- selector lookup 실패가 버튼 disabled 여부, 가격, 장착 compatibility, 스킬 cooldown, item target, reward selection을 변경해서는 안 된다.
- 기존 profile은 migration 없이 동일하게 로드한다. 저장 round-trip 결과에 아이콘 URL·rarityLabel·CSS 값이 포함되면 안 된다.
- 최종 그래픽 교체 시 icon key와 24×24 파일 계약을 유지하면 UI code 변경 없이 PNG만 교체할 수 있어야 한다.
- `shield`를 `equipment_armor`, `skill_passive` 등 다른 아이콘으로 대체하지 않는다. `equipment_shield` 등록·로드 실패 때만 `장` fallback을 사용한다.

### 27.9 구현 순서

1. `equipment_shield.asset.json` 규격 틀을 먼저 만들고 schema·bounds·palette role을 문서와 대조한다.
2. 후속 에셋 작업에서 해당 틀을 사용해 `equipment_shield.png`를 포함한 11개 PNG를 만들고 크기·투명 배경·결정적 재생성을 검증한다.
3. `contentPresentation.ts`의 icon/rarity selector와 fallback을 구현하고 순수 테스트를 먼저 추가한다.
4. `ContentIcon.tsx`와 CSS token·공통 layout을 구현한다.
5. `ShopPanel`·`StoragePanel`에 적용해 세 content kind와 5개 rarity를 먼저 확인한다.
6. `CharacterPanel`의 join 문자열과 장착·인벤토리 표시를 구조화한다.
7. `ExplorationItems`·`BattleCommands`에 적용하고 640×360 HUD overflow를 확인한다.
8. `ResultScreen`의 신규 스킬·등급 해금·자동/초과 보상을 구조화한다.
9. 에셋 카탈로그·계획·에셋 변경 기록을 실제 구현 상태로 갱신한다.
10. 집중 테스트, typecheck, 전체 test, build, 모바일 가로 수동 검증을 수행한다.

### 27.10 자동 검증

`assets.test.ts` 또는 별도 순수 UI presentation 테스트에서 다음을 확인한다.

1. 승인된 `ContentIconKey` 11개가 각각 정확한 PNG basename과 대응한다.
2. 모든 PNG가 24×24이며 파일 수가 정확히 11개다.
3. 45개 `EQUIPMENT_DATA` 항목은 정의의 rarity를 그대로 반환한다.
4. dagger/sword/mace/bow/staff/rod/shield/head/body mapping이 표와 일치한다.
5. shield 5종은 iconKey `equipment_shield`, fallback `장`이고 rarity와 이름은 유지한다.
6. 모든 `ITEM_DATA` ID는 `item_potion`, neutral을 반환한다.
7. 모든 `SKILLS`는 activation에 따라 active/passive icon을 반환하고 unknown은 안전 fallback을 반환한다.
8. equipment/item/skill `PendingRewardEntry`가 각각 동일 selector 결과를 재사용한다.
9. rarity 한글명과 5개 CSS token key가 누락 없이 대응한다.
10. selector 호출 전후 profile·reward·definition 입력이 변경되지 않는다.

React용 신규 테스트 라이브러리는 추가하지 않는다. component의 이미지 load 실패 fallback은 browser에서 잘못된 URL을 임시 주입하거나 DevTools request blocking으로 수동 확인하고, build가 manifest를 정상 해석하는지 검증한다.

### 27.11 완료 기준

- 제작 규격 JSON이 24×24 canvas, safe bounds, palette role, fallback 계약을 정확히 보존한다.
- 생성 스크립트 재실행 결과 11개 아이콘이 오류 없이 동일하게 생성된다.
- `npm run typecheck`, 관련 Vitest, 전체 `npm run test`, `npm run build`가 성공한다.
- 상점·창고에서 동일 family의 5개 등급이 같은 아이콘과 서로 다른 5색·한글 등급명으로 표시된다.
- 아이템은 포션, 스킬은 active/passive 대표 아이콘으로 모든 지정 화면에서 표시된다.
- shield는 정상 파일에서 방패 이미지가 표시되고, 이미지 로드 실패 항목은 깨진 이미지 대신 fallback badge와 이름을 유지한다.
- 640×360 기준과 760px 이하 모바일 가로 화면에서 상점·창고·전투 명령·결과 보상에 가로 overflow, 이름 겹침과 동작 버튼 축소가 없다.
- 키보드/터치로 기존 구매·장착·반환·사용·보상 선택을 수행할 수 있고 아이콘 추가 전과 동일한 command가 발생한다.
- 기존 profile v2 저장을 로드·저장해도 데이터 schema와 판정 결과가 변하지 않는다.
- `asset-catalog.md`, `asset-plan.md`, `changelog-assets.md`, `changelog.md`가 실제 생성·배선·검증 결과와 일치한다.

### 27.12 금지 범위

- 아이콘·rarity를 영속 instance나 save envelope에 저장하지 않는다.
- 아이템·스킬 rarity를 가격·해금 시점에서 임의 생성하지 않는다.
- 장비 ID 문자열에서 rarity를 파싱하지 않고 승인된 definition을 사용한다.
- 대표 아이콘을 개별 장비 45종·아이템 9종·스킬별 아이콘 제작으로 확대하지 않는다.
- 효과 애니메이션, hover tooltip 시스템과 신규 UI 라이브러리를 추가하지 않는다.
- 색상만으로 등급을 전달하거나 아이콘만 남기고 콘텐츠 이름을 제거하지 않는다.
- React UI 아이콘을 Phaser Scene 또는 순수 게임 엔진에 중복 구현하지 않는다.

## 28. 고정 동료 종족 데이터 동기화 구현 사양

### 28.1 목표와 기준

- `raw_data_table.md` 16절의 사용자 입력 중 `race_id`를 고정 동료 신규 profile 생성 기준에 반영한다.
- 브람은 `dwarf`, 세라는 `human`, 로웬은 `elf`로 생성하고 해당 종족을 능력치·인벤토리 용량·Actor·캐릭터 에셋 선택에 일관되게 사용한다.
- 이름, character ID, 직업, 성별, 전열/후열, 파티 slot, 시작 무기와 레벨별 스킬 진행은 유지한다.
- 기존 profile version 2의 저장 종족을 자동 변경하지 않는다.

### 28.2 대상 파일

| 파일 | 변경 책임 |
|---|---|
| `src/game/content.ts` | 동료 단일 정의와 신규 profile 초기 캐릭터 생성 |
| `src/ui/SetupScreen.tsx` | 같은 동료 정의와 시작 캐릭터 계산을 사용하는 미리보기 |
| `src/tests/characters.test.ts` | 동료 identity·최종 능력치·파생 수치 |
| `src/tests/saveV2.test.ts` | 신규 종족 profile round-trip과 기존 profile 보존 |
| `src/tests/combat.test.ts` | 변경된 AGI·turn order seed 기대값 회귀 |
| `src/tests/assets.test.ts` | 세 동료 조합의 asset path·texture key 존재 |
| `asset-plan.md`, `asset-catalog.md` | 실제 구현 후 human 임시값·미확정 설명을 최신값으로 갱신 |

변경하지 않는 범위:

- `src/game/types.ts`: `RaceId`, `PersistentCharacter`, profile schema 유지
- `src/app/saveV2.ts`: 네 종족 허용 검증과 envelope version 유지
- 기존 character PNG 288개와 생성기: 필요한 조합이 이미 존재
- `raw_data_table.md`: 사용자 입력 원본을 다시 수정하지 않음

### 28.3 동료 단일 정의

`content.ts`에 표시와 초기 생성이 함께 참조하는 최소 정의를 둔다.

```ts
export interface CompanionDefinition {
  characterId: 'party_warrior' | 'party_priest' | 'party_archer'
  name: string
  raceId: RaceId
  classId: ClassId
  gender: Gender
  row: Row
  partySlot: 2 | 3 | 4
}

export const COMPANION_DATA: readonly CompanionDefinition[] = [
  { characterId: 'party_warrior', name: '브람', raceId: 'dwarf', classId: 'warrior', gender: '남성', row: 'front', partySlot: 2 },
  { characterId: 'party_priest', name: '세라', raceId: 'human', classId: 'priest', gender: '여성', row: 'back', partySlot: 3 },
  { characterId: 'party_archer', name: '로웬', raceId: 'elf', classId: 'archer', gender: '남성', row: 'back', partySlot: 4 },
]
```

- `partySlot`은 배열 index에 의존하는 에셋 색상 변형과 현재 순서를 검증하기 위한 콘텐츠 값이다. 별도 profile 필드로 저장하지 않는다.
- 성별은 이번 원시 입력에 없으므로 현재 코드값을 보존한다. 종족 변경을 성별 확정으로 해석하지 않는다.
- skill ID와 equipment ID는 정의에 중복하지 않는다. 기존 class level resolver와 `STARTING_WEAPON_BY_CLASS`를 계속 단일 원본으로 사용한다.

### 28.4 신규 profile 생성

`createInitialCharacters(main)` 처리:

1. 메인 캐릭터는 기존처럼 입력 config로 1P 전열을 생성한다.
2. `COMPANION_DATA`를 partySlot 오름차순으로 순회한다.
3. 각 동료는 정의의 race/class/gender/row와 partySlot을 `startingCharacter`에 전달한다.
4. 시작 무기는 기존 `STARTING_WEAPON_BY_CLASS[classId]`로 장착한다.
5. 반환 tuple 순서는 `party_main`, `party_warrior`, `party_priest`, `party_archer`를 유지한다.
6. 동료의 `skillIds`는 profile에 고정 저장하지 않고 기존처럼 Actor 생성 시 레벨·직업으로 계산한다.

Lv1 시작 무기 포함 기대값:

| characterId | 최종 능력치 | 파생 HP/ATK/DEF/AGI | inventory capacity |
|---|---|---|---:|
| `party_warrior` | `12/5/3/9/4/5` | `30/6/4/3` | 12 |
| `party_priest` | `5/7/10/5/6/5` | `22/3/3/4` | 11 |
| `party_archer` | `3/11/6/4/10/4` | `20/5/2/6` | 10 |

능력치 순서는 STR/DEX/INT/CON/AGI/LUK, 파생 수치는 HP/ATK/DEF/전투 AGI다.

### 28.5 준비 화면 정합화

- `SetupScreen`에 브람·세라·로웬의 race/class literal을 다시 쓰지 않는다.
- 현재 main config로 `createInitialCharacters`를 호출하거나 같은 초기 캐릭터 순수 helper를 사용해 네 행의 `PersistentCharacter`를 얻는다.
- `PartyRow`는 `PersistentCharacter`를 받아 `getFinalAttributes`와 `deriveCombatStats`를 호출한다. 시작 장비 modifier를 제외하는 `combineAttributes` 직접 호출을 제거한다.
- slot 문자열은 main `01 / 전열`, 동료 `partySlot`과 row 표시명으로 만든다. 이름이 비어 있는 main은 화면에서만 `이름 없음`을 사용하고 profile 생성 규칙은 유지한다.
- 화면 표시와 실제 `CREATE_PROFILE` 결과가 동일한 race, 최종 능력치와 파생 수치를 사용해야 한다.

### 28.6 기존 profile 호환성

- 저장된 `ProfileV2.characters[].raceId`를 로드시 `COMPANION_DATA`로 덮어쓰지 않는다.
- 기존 인간 브람·인간 로웬 profile은 기존 능력치·인벤토리 용량·스프라이트를 유지한다.
- 신규 종족은 신규 profile 생성 또는 사용자의 명시적 프로필 초기화 후 적용된다.
- profile version, key, envelope, save validator와 migration 함수를 추가하지 않는다.
- 향후 기존 profile 강제 변환이 승인되기 전까지 로웬의 11번째 item stack을 이동·삭제·overflow 처리하지 않는다.

### 28.7 캐릭터 에셋 연결

신규 profile의 목표 경로:

| 동료 | 파일 | texture key |
|---|---|---|
| 브람 | `src/assets/characters/dwarf_warrior_male_p2.png` | `party_dwarf_warrior_male_p2` |
| 세라 | `src/assets/characters/human_priest_female_p3.png` | `party_human_priest_female_p3` |
| 로웬 | `src/assets/characters/elf_archer_male_p4.png` | `party_elf_archer_male_p4` |

- 세 파일은 현재 존재하므로 PNG·generator·lazy loader를 수정하지 않는다.
- `createPartyFromCharacters`가 profile race를 `Actor.raceId`로 전달하고 기존 `characterAssets.ts`가 조합 key를 계산하는 흐름을 유지한다.
- 파일 로드 실패 시 기존 party geometry fallback을 사용한다.

### 28.8 자동 테스트

1. `COMPANION_DATA`의 ID·순서·race/class/gender/row/slot이 정확한지 확인한다.
2. 신규 profile 초기 캐릭터 race가 `main 입력/dwarf/human/elf` 순서인지 확인한다.
3. 세 동료의 시작 무기와 Lv1 skill resolver가 기존 규칙을 유지하는지 확인한다. 특히 세라는 Lv1 `heal`, Lv2 `smite`다.
4. 세 동료의 시작 장비 포함 최종 능력치·파생 수치·inventory capacity가 28.4절 표와 같은지 확인한다.
5. Setup preview가 사용하는 helper 결과와 실제 `createInitialCharacters` 결과가 같은지 확인한다.
6. 신규 종족 profile이 save round-trip을 통과하는지 확인한다.
7. 기존 세 동료가 모두 human인 유효 profile을 읽고 다시 저장해 race가 바뀌지 않는지 확인한다.
8. 로웬 AGI 6을 포함한 동일 seed turn order를 새 기대값으로 갱신하고 동일 seed 재현성을 유지한다.
9. 세 캐릭터 asset 파일과 texture key가 registry 계약에 맞는지 확인한다.
10. 기존 shield·양손·장착·성장·스킬·보상 테스트가 동료 race 변경과 무관하게 회귀한다.

### 28.9 구현 순서

1. `COMPANION_DATA`를 추가하고 `createInitialCharacters`의 동료 literal을 교체한다.
2. 동료 identity·능력치·인벤토리 단위 테스트를 추가한다.
3. `SetupScreen`을 동일 초기 캐릭터 계산으로 연결해 preview를 정합화한다.
4. save round-trip과 기존 profile 비변환 테스트를 추가한다.
5. asset path와 변경된 turn order 기대값을 갱신한다.
6. 관련 테스트, typecheck, 전체 test, build와 신규 profile 브라우저 흐름을 검증한다.
7. 실제 코드·에셋 연결 상태에 맞춰 asset 문서와 changelog를 갱신한다.

### 28.10 완료 기준과 금지 범위

- 신규 profile·준비 화면·거점·전투에서 브람 드워프, 세라 인간, 로웬 엘프가 동일하게 표시·계산된다.
- 세 동료의 시작 수치와 캐릭터 sprite가 28.4·28.7절과 일치한다.
- 기존 profile은 자동 변환·저장 거부·아이템 손실 없이 기존 race를 유지한다.
- `npm run typecheck`, 관련 테스트, 전체 `npm run test`, `npm run build`가 성공한다.
- raw 표의 세라 `smite`를 Lv1 고정 스킬로 적용하거나 시작 무기를 제거하지 않는다.
- 동료 gender, 이름, 직업, row, slot을 종족 변경과 함께 임의 수정하지 않는다.
- profile version을 올리거나 기존 profile race를 load 시 강제 정규화하지 않는다.
- 캐릭터 PNG를 중복 생성하거나 Phaser에 동료별 별도 분기 코드를 추가하지 않는다.

## 29. 퀘스트 결과 화면 모바일 overflow 개선 사양

### 29.1 목표와 범위

- 성공·실패 결과 정보가 모바일 landscape viewport보다 길어져도 모든 내용을 터치로 확인할 수 있게 한다.
- 창고 초과 여부와 관계없이 현재 단계의 필수 action을 화면 안에 항상 유지한다.
- 결과 정산 데이터, reward 선택 규칙, command와 저장 schema는 변경하지 않는다.
- 적용 화면은 React `ResultScreen`으로 한정하고 시작·거점·탐사·전투의 overflow 정책은 유지한다.

### 29.2 대상 파일

| 파일 | 변경 책임 |
|---|---|
| `src/ui/ResultScreen.tsx` | 결과 정보 scroll 영역과 고정 action footer로 DOM 책임 분리 |
| `src/styles.css` | `100dvh` 결과 shell, 내부 touch scroll, 비축소 footer, 낮은 landscape compact 규칙 |
| `src/tests/gameEngine.test.ts` | 기존 결과 command guard가 부족한 경우에만 pending 확정→거점 복귀 흐름 회귀 보강 |
| `changelog.md` | 실제 구현·검증 결과 기록 |

변경하지 않는 파일과 계약:

- `src/game/types.ts`: `GameState`, `GameCommand`, result·pending reward 타입 유지
- `src/game/gameEngine.ts`: `RETURN_TO_HUB`, `SET_REWARD_SELECTION`, `CONFIRM_REWARD_SELECTION` 처리 유지
- `src/game/rewards.ts`, `src/app/saveV2.ts`: 정산·선택·저장 규칙 유지
- 콘텐츠 수치, 표시 이름, 아이콘·rarity selector와 profile version 2 유지

### 29.3 ResultScreen DOM 사양

최상위 class와 성공/실패 class는 보존하고 내부를 다음 구조로 바꾼다.

```tsx
<main className={`menu-screen result-screen ${victory ? 'victory' : 'defeat'}`}>
  <div className="result-scroll-region" aria-label="원정 결과 상세">
    <div className="result-content">
      {/* 현재 eyebrow부터 reward-selection 목록까지 순서대로 유지 */}
    </div>
  </div>
  <footer className="result-actions" aria-label="결과 화면 동작">
    {pending
      ? <button className="danger">선택 보관·나머지 포기</button>
      : <button className="primary">거점으로</button>}
  </footer>
</main>
```

- 현재 `reward-selection` 내부의 확정 버튼만 `result-actions`로 이동한다. 제목, 창고 사용량, checkbox label 목록은 `result-content`에 남긴다.
- pending action은 기존과 동일하게 `{ type: 'CONFIRM_REWARD_SELECTION', confirmDiscardUnselected: true }`를 dispatch한다.
- 일반 action은 기존과 동일하게 `{ type: 'RETURN_TO_HUB' }`를 dispatch한다.
- 선택이 0개인 상태에서도 전체 포기를 허용하는 현재 규칙과 button enabled 상태를 임의로 바꾸지 않는다.
- 확정 dispatch 후 pending이 해소되면 별도 local state 없이 React state 갱신으로 footer가 `거점으로` action으로 교체되어야 한다.
- 결과 표시 조건과 순서, `ContentIcon`, display-name selector와 `selectedIds` 계산은 그대로 유지한다.

### 29.4 CSS 사양

기본 구조:

```css
.result-screen {
  width: 100%;
  height: 100dvh;
  min-height: 0;
  max-height: 100dvh;
  justify-content: flex-start;
  overflow: hidden;
}

.result-scroll-region {
  width: 100%;
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.result-content {
  width: 100%;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 8px;
}

.result-actions {
  width: min(720px, 95%);
  flex: 0 0 auto;
  align-self: center;
  padding-top: 8px;
}

.result-actions button { width: 100%; }
```

- 기존 `.result-screen` 색·정렬, `.settlement-details`, `.reward-selection`, `.reward-card` 규칙은 재사용한다.
- `.result-content`가 scroll viewport보다 짧을 때만 중앙에 오고, 길 때는 자체 높이가 늘어나 상단부터 시작해야 한다. 구현 브라우저에서 flex 중앙 정렬이 긴 콘텐츠 상단을 자르면 낮은 화면 media query에서 `justify-content: flex-start`를 명시한다.
- `@media (max-height: 500px)` 안에서 result 상하 padding을 각각 `max(8px, env(safe-area-inset-top/bottom))`으로 지정해 기존 10px override가 safe area를 제거하지 않게 한다.
- 같은 media query에서 `.result-content { justify-content: flex-start; }`, 결과 h1 크기, `.reward-card` margin·padding을 축소하되 10px 상세 텍스트와 44px action 버튼 최소 높이는 유지한다.
- `body`, 전체 `.menu-screen`, `.game-shell`의 overflow를 변경하지 않는다. footer에 `position: fixed`를 사용하지 않고 결과 shell의 flex 높이 계산 안에 둔다.
- scrollbar를 강제로 숨기지 않으며 scroll region 위의 수직 swipe가 checkbox toggle이나 footer tap으로 오인되지 않게 네이티브 scroll 동작을 유지한다.

### 29.5 상태별 동작 기준

| 상태 | scroll 영역 | 고정 action | dispatch 후 결과 |
|---|---|---|---|
| 성공·pending 없음 | 성장·해금·자동 보상 전체 | `거점으로` | hub, session/result 정리, profile 저장 |
| 성공·pending 있음 | 성장·해금·보상 checkbox 전체 | `선택 보관·나머지 포기` | pending 해소, 같은 결과 화면에서 `거점으로` 노출 |
| 실패 | 패배 설명·0 보상 요약 | `거점으로` | hub 복귀 |

- `pendingReward`가 있으면 `RETURN_TO_HUB`를 먼저 노출하거나 우회 dispatch하지 않는다.
- footer를 항상 표시하기 위해 정보 항목을 접거나 생략하지 않는다.
- scroll 위치는 표시 전용 UI 상태이며 profile·session에 저장하지 않는다.

### 29.6 검증 사양

정적·자동 검증:

1. `npm run typecheck`와 전체 기존 테스트가 성공한다.
2. 필요 시 engine 회귀 테스트에서 pending 상태의 조기 `RETURN_TO_HUB` 거부, reward 확정 후 `RETURN_TO_HUB` 성공을 확인한다.
3. 신규 UI 테스트 dependency는 추가하지 않는다. CSS 실제 배치는 responsive browser에서 검증한다.

브라우저 검증 viewport:

- `640×360` landscape 기준
- `760px` 이하 너비의 landscape
- 기존 단계 10 기준인 `844×390` landscape
- portrait에서 기존 회전 안내 유지

각 landscape에서 다음 세 fixture 또는 실제 상태를 확인한다.

1. 4인 성장, 신규 스킬·커스텀 슬롯, 퀘스트·등급 해금, 다수 자동 보상이 함께 있는 긴 성공 결과
2. 다수 checkbox가 있는 창고 overflow 성공 결과
3. 실패 결과

브라우저 완료 조건:

- body/document 자체에는 세로 스크롤이 생기지 않고 `result-scroll-region`만 필요할 때 스크롤된다.
- scrollTop을 처음·중간·끝으로 이동해 모든 결과 항목을 읽을 수 있다.
- 스크롤 전후 action footer의 bounding box가 visual viewport와 safe area 안에 있고 44px 이상이며 정보와 겹치지 않는다.
- overflow 상태에서 목록을 스크롤하며 항목을 선택할 수 있고 action을 터치하면 pending이 해소되어 `거점으로`가 같은 위치에 나타난다.
- `거점으로` 터치 후 hub로 복귀하고 저장·보상·성장 결과가 유지된다.
- Android Chrome과 iOS Safari에서는 한 손가락 관성 스크롤, 주소창 변화, 하단 safe area를 확인한다. 실기 미확보 시 responsive Chromium 결과와 미실행 실기 범위를 구분해 기록한다.

### 29.7 구현 순서

1. `ResultScreen`에서 현재 결과 정보와 두 action을 scroll content/footer로 분리한다.
2. result 전용 viewport flex·touch scroll·safe-area CSS를 추가한다.
3. 500px 이하 높이에서 제목·reward card를 compact 처리하되 정보·action을 유지한다.
4. typecheck와 기존 result/reward/engine 관련 테스트를 수행한다.
5. 긴 성공·overflow·실패 상태를 640×360, 760px 이하, 844×390 browser에서 검증한다.
6. 전체 테스트와 production build 후 실제 변경·검증 결과를 `changelog.md`에 기록한다.

### 29.8 완료 기준과 금지 범위

- 지원 landscape viewport에서 결과 길이와 관계없이 현재 단계의 action을 터치할 수 있다.
- 모든 결과 정보와 overflow 선택 항목에 내부 터치 스크롤로 접근할 수 있다.
- 성공·실패·pending reward command와 저장 결과가 기존과 동일하다.
- safe area, portrait 회전 안내, 탐사·전투 스크롤 차단이 회귀하지 않는다.
- 결과를 축약·삭제하거나 자동으로 hub에 이동해 접근 문제를 우회하지 않는다.
- game engine·저장 schema·정산 규칙·콘텐츠 수치를 UI overflow 수정과 함께 변경하지 않는다.
- 전역 body 스크롤 허용, 신규 modal·페이지·UI 라이브러리 또는 production 전용 test/cheat 경로를 추가하지 않는다.
