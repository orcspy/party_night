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
