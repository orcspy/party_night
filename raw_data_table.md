# Party Night 콘텐츠 확장 원시 데이터 입력표

## 1. 문서 목적과 사용 규칙

이 문서는 v0.1.0 이후 콘텐츠 확장에 필요한 수치와 목록을 사용자가 직접 입력하기 위한 원시 자료다. 입력값은 후속 설계의 기준 자료이며, 이 문서에 값을 적는 것만으로 구현 범위가 확정되지는 않는다.

### 1.1 입력 규칙

- 미정 값은 빈칸 대신 `TBD`로 표시한다.
- 사용하지 않는 항목은 `N/A`로 표시한다.
- 콘텐츠 ID는 영문 소문자 `snake_case`를 사용한다.
- 수치는 음수가 허용되는 보정값을 제외하고 0 이상의 정수를 사용한다.
- 확률 단위는 `%`, 시간 단위는 `turn` 또는 `round` 중 하나를 명시한다.
- 다중 값은 쉼표로 구분하되 ID 안에는 쉼표를 사용하지 않는다.
- 기존 MVP 값은 `현재값`으로 기재했다. 변경할 경우 변경 이유도 함께 기록한다.
- 범용 효과 문법은 아직 없으므로 복잡한 효과는 `effect_note`에 자연어로 작성한다.

### 1.2 상태 표기

| 상태 | 의미 |
|---|---|
| `current` | v0.1.0에서 사용 중 |
| `input` | 사용자 입력 완료, 아직 설계 미반영 |
| `approved` | 후속 설계에서 확정 |
| `deferred` | 현재 확장에서 제외 |

## 2. 확장 단위 기본 정보

| 항목 | 입력값 | 설명 |
|---|---|---|
| 목표 버전 | `TBD` | 예: `0.2.0` |
| 확장 이름 | `TBD` | 예: 최소 성장 및 2차 퀘스트 |
| 핵심 목표 | `TBD` | 이번 확장에서 플레이어가 새로 할 수 있는 일 |
| 포함 시스템 | `TBD` | 예: 레벨업, 장비 상점 |
| 제외 시스템 | `TBD` | 이번에도 구현하지 않을 기능 |
| 최대 캐릭터 레벨 | `TBD` | 첫 성장 확장의 상한 |
| 신규 퀘스트 수 | `TBD` | 기존 훈련 폐허 제외 |
| 신규 적 수 | `TBD` | 변형 포함 여부 별도 표기 |
| 신규 스킬 수 | `TBD` | 직업별 합계 |
| 신규 장비 수 | `TBD` | 상점·보상 합계 |

## 3. 전역 밸런스 설정

| key | v0.1.0 현재값 | 확장 입력값 | 단위 | 설명 |
|---|---:|---:|---|---|
| `party_size` | 4 | `TBD` | 명 | 파티 인원 |
| `front_row_size` | 2 | `TBD` | 명 | 전열 슬롯 수 |
| `back_row_size` | 2 | `TBD` | 명 | 후열 슬롯 수 |
| `base_die_sides` | 6 | `TBD` | 면 | 기본 다이스 면수 |
| `minimum_damage` | 1 | `TBD` | 피해 | 최소 피해 |
| `max_combat_log_entries` | 200 | `TBD` | 건 | 로그 보존 수 |
| `victory_gold_default` | 100 | `TBD` | gold | 기본 승리 골드 |
| `victory_exp_default` | 50 | `TBD` | exp | 기본 승리 경험치 |
| `full_heal_on_return` | true | `TBD` | boolean | 준비 화면 복귀 시 완전 회복 |
| `base_custom_skill_slots` | N/A | `TBD` | 칸 | 커스텀 스킬 슬롯 도입 시 사용 |

## 4. 경험치 및 레벨 테이블

### 4.1 레벨업 공통 규칙

| 항목 | 입력값 | 설명 |
|---|---|---|
| 경험치 적용 대상 | `TBD` | 파티 공통 / 캐릭터별 |
| 경험치 분배 방식 | `TBD` | 균등 / 생존자만 / 고정 지급 |
| 누적 경험치 초과 이월 | `TBD` | true / false |
| 원정 중 레벨업 | `TBD` | 허용 / 준비 화면에서만 |
| 최대 레벨 도달 후 경험치 | `TBD` | 정지 / 누적 |
| 레벨업 회복 | `TBD` | 없음 / 증가분 / 완전 회복 |
| 능력치 증가 방식 | `TBD` | 공통표 / 직업별 표 |

### 4.2 공통 경험치 테이블

직업별 경험치 표를 사용할 경우 아래 표의 `누적 필요 EXP`를 `N/A`로 표시하고 4.3절을 작성한다.

| 도달 레벨 | 이전 레벨 필요 EXP | 누적 필요 EXP | 스킬/슬롯 해금 ID | 비고 |
|---:|---:|---:|---|---|
| 1 | 0 | 0 | 기본 스킬 | 시작 레벨 |
| 2 | `TBD` | `TBD` | `TBD` | |
| 3 | `TBD` | `TBD` | `TBD` | |
| 4 | `TBD` | `TBD` | `TBD` | |
| 5 | `TBD` | `TBD` | `TBD` | |
| 6 | `TBD` | `TBD` | `TBD` | |
| 7 | `TBD` | `TBD` | `TBD` | |
| 8 | `TBD` | `TBD` | `TBD` | |
| 9 | `TBD` | `TBD` | `TBD` | |
| 10 | `TBD` | `TBD` | `TBD` | |

### 4.3 직업별 레벨 성장

`증가값`은 해당 레벨 도달 시 더하는 값으로 작성한다.

| class_id | 도달 레벨 | 필요 EXP | HP 증가 | ATK 증가 | DEF 증가 | AGI 증가 | 해금 skill_id | 슬롯 증가 | 비고 |
|---|---:|---:|---:|---:|---:|---:|---|---:|---|
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | |

## 5. 종족 데이터

v0.1.0에서는 종족이 수치에 영향을 주지 않는다. 확장에서 보정을 적용하려면 모든 종족의 합계와 밸런스 기준을 함께 입력한다.

| race_id | 표시 이름 | HP 보정 | ATK 보정 | DEF 보정 | AGI 보정 | 고정 skill_id | 외형 ID | 상태 | 비고 |
|---|---|---:|---:|---:|---:|---|---|---|---|
| `human` | 인간 | 0 | 0 | 0 | 0 | `N/A` | `TBD` | current | |
| `elf` | 엘프 | 0 | 0 | 0 | 0 | `N/A` | `TBD` | current | |
| `dwarf` | 드워프 | 0 | 0 | 0 | 0 | `N/A` | `TBD` | current | |
| `halfling` | 하플링 | 0 | 0 | 0 | 0 | `N/A` | `TBD` | current | |

## 6. 직업 기본 데이터

### 6.1 기본 능력치와 파생 설정

| class_id | STR | DEX | INT | CON | AGI | LUCK | attackBasis | ATK 보정 | DEF 보정 | 상태 |
|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---|
| `warrior` | 10 | 5 | 3 | 9 | 3 | 6 | str | 0 | 1 | approved |
| `rogue` | 4 | 9 | 4 | 5 | 10 | 4 | dex | 0 | 0 | approved |
| `archer` | 5 | 10 | 4 | 6 | 8 | 3 | dex | 0 | 0 | approved |
| `paladin` | 8 | 4 | 7 | 8 | 3 | 6 | max_str_int | 0 | 3 | approved |
| `priest` | 4 | 5 | 10 | 6 | 5 | 6 | int | -2 | 1 | approved |
| `mage` | 3 | 7 | 10 | 3 | 7 | 6 | int | 1 | 0 | approved |

### 6.2 파생 공식

```text
maxHp = 11 + (CON × 2) + floor((STR + DEX) / 10)
atk = max(1, floor(attackBasis / 2) + ATK 보정)
def = max(1, floor(((CON × 2) + STR + DEX) / 10) + DEF 보정)
battleAgi = max(1, floor((AGI + 2) / 2))
```

- `max_str_int`는 `max(STR, INT)`다.
- LUCK은 현 단계에서 파생값과 판정에 영향을 주지 않는다.
- 직업 초기 능력치 합계는 36이며 각 값은 1~10이다.

### 6.3 계산 결과와 현재 호환값

| class_id | 표시 이름 | 계산 HP | 계산 ATK | 계산 DEF | 계산 전투 AGI | 권장 열 | 역할 설명 | 기본 skill_id | 상태 |
|---|---|---:|---:|---:|---:|---|---|---|---|
| `warrior` | 전사 | 30 | 5 | 4 | 2 | 전열 | `TBD` | `power_strike` | approved |
| `rogue` | 도적 | 22 | 4 | 2 | 6 | `TBD` | `TBD` | `quick_stab` | approved |
| `archer` | 궁수 | 24 | 5 | 2 | 5 | 후열 | `TBD` | `aimed_shot` | approved |
| `paladin` | 성기사 | 28 | 4 | 5 | 2 | `TBD` | `TBD` | `holy_strike` | approved |
| `priest` | 사제 | 23 | 3 | 3 | 3 | 후열 | `TBD` | `smite` | approved |
| `mage` | 마법사 | 18 | 6 | 1 | 4 | `TBD` | `TBD` | `arcane_bolt` | approved |

## 7. 스킬 데이터

### 7.1 스킬 공통 규칙

| 항목 | 입력값 | 설명 |
|---|---|---|
| 전투당 장착 액티브 수 | `TBD` | 기본 공격 제외 여부 명시 |
| 패시브 슬롯 수 | `TBD` | 미사용 시 `N/A` |
| 동일 스킬 중복 장착 | `TBD` | 허용 / 불허 |
| 쿨다운 단위 | `TBD` | turn / round |
| 스킬 자원 | `TBD` | 없음 / MP / 횟수 |
| 전투 중 스킬 교체 | 불가 | 현재 기준 |
| 대상 선택 실패 처리 | `TBD` | 명령 거부 / 자동 변경 |

### 7.2 직업별 스킬 목록

`target_type` 예: `single_enemy`, `all_enemies`, `self`, `single_ally`. `use_limit` 예: `none`, `once_per_battle`, `cooldown_2`.

| skill_id | 표시 이름 | class_id | 분류 | 해금 레벨 | target_type | 다이스 | 고정 보정 | use_limit | 비용 | 리롤 수 | effect_note | 상태 |
|---|---|---|---|---:|---|---|---:|---|---:|---:|---|---|
| `basic_attack` | 기본 공격 | all | active | 1 | single_enemy | 2d6 | 0 | none | 0 | 0 | 기본 피해식 | current |
| `power_strike` | 강타 | warrior | active | 1 | single_enemy | 3d6 | 0 | once_per_battle | 0 | 0 | `TBD` | current |
| `quick_stab` | 빠른 찌르기 | rogue | active | 1 | single_enemy | 2d6 | 2 | once_per_battle | 0 | 0 | `TBD` | current |
| `aimed_shot` | 조준 사격 | archer | active | 1 | single_enemy | 3d6 | 0 | once_per_battle | 0 | 1 | 다이스 하나 선택 리롤 | current |
| `holy_strike` | 신성한 일격 | paladin | active | 1 | single_enemy | 2d6 | 2 | once_per_battle | 0 | 0 | `TBD` | current |
| `smite` | 징벌 | priest | active | 1 | single_enemy | 2d6 | 1 | once_per_battle | 0 | 0 | `TBD` | current |
| `arcane_bolt` | 비전 화살 | mage | active | 1 | single_enemy | 3d6 | 1 | once_per_battle | 0 | 0 | `TBD` | current |
| `TBD` | `TBD` | warrior | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | rogue | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | archer | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | paladin | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | priest | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | mage | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |

## 8. 장비 시스템 기본 설정

### 8.1 장비 슬롯

| slot_id | 표시 이름 | 캐릭터당 수 | 양손 점유 | MVP 다음 확장 포함 | 비고 |
|---|---|---:|---|---|---|
| `weapon_main` | 주무기 | 1 | `TBD` | `TBD` | |
| `weapon_sub` | 보조무기/방패 | 1 | `TBD` | `TBD` | |
| `head` | 머리 | 1 | false | `TBD` | |
| `body` | 몸통 | 1 | false | `TBD` | |
| `hands` | 손 | 1 | false | `TBD` | |
| `feet` | 발 | 1 | false | `TBD` | |
| `cloak` | 망토 | 1 | false | `TBD` | |
| `neck` | 목 장신구 | 1 | false | `TBD` | |
| `ring` | 반지 | `TBD` | false | `TBD` | |

### 8.2 장비 공통 규칙

| 항목 | 입력값 | 설명 |
|---|---|---|
| 장비 구매 후 자동 장착 | `TBD` | true / false |
| 장비 판매 가격 비율 | `TBD` | 구매가 대비 % |
| 직업 제한 위반 처리 | `TBD` | 표시 안 함 / 구매 불가 |
| 양손 무기와 보조 슬롯 | `TBD` | 동시 장착 불가 여부 |
| 장비 내구도 | `TBD` | 미사용 권장 시 `N/A` |
| 장비 강화 | deferred | 현 단계 제외 |
| 장비 희귀도 | `TBD` | 미사용 시 `N/A` |

## 9. 1차 장비 상점 목록

허용 직업은 class_id를 쉼표로 입력한다. `all`도 허용한다.

| item_id | 표시 이름 | slot_id | 허용 직업 | 구매가 | 판매가 | HP | ATK | DEF | AGI | 다이스 변화 | 리롤 변화 | 제공 skill_id | 해금 조건 | effect_note | 상태 |
|---|---|---|---|---:|---:|---:|---:|---:|---:|---|---:|---|---|---|---|
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |

## 10. 1차 소비 아이템 상점 목록

| item_id | 표시 이름 | 분류 | 구매가 | 판매가 | 최대 중첩 | 사용 시점 | target_type | 수치 | effect_note | 상태 |
|---|---|---|---:|---:|---:|---|---|---:|---|---|
| `TBD` | `TBD` | 회복 | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | 상태 회복 | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | 전투 | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | 탐사 | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |

## 11. 적 데이터

| enemy_id | 표시 이름 | HP | ATK | DEF | AGI | 기본 skill_id | 추가 skill_id | 골드 | EXP | sprite_id | AI 설명 | 상태 |
|---|---|---:|---:|---:|---:|---|---|---:|---:|---|---|---|
| `goblin_scout` | 고블린 정찰병 | 18 | 3 | 2 | 4 | `basic_attack` | `N/A` | `TBD` | `TBD` | `TBD` | 무작위 생존 파티원 공격 | current |
| `goblin_guard` | 고블린 경비병 | 24 | 4 | 3 | 2 | `basic_attack` | `N/A` | `TBD` | `TBD` | `TBD` | 무작위 생존 파티원 공격 | current |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |

## 12. 조우 데이터

| encounter_id | 표시 이름 | enemy_id와 수량 | 발생 방식 | 위치/확률 | 세션당 횟수 | 승리 후 상태 | 도주 가능 | 비고 | 상태 |
|---|---|---|---|---|---:|---|---|---|---|
| `ruins_goblins` | 폐허 고블린 조우 | `goblin_scout:1,goblin_guard:1` | fixed_cell | `(3,5)` | 1 | 재발생 안 함 | false | v0.1.0 | current |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |

## 13. 퀘스트 데이터

| quest_id | 표시 이름 | map_id | 권장 레벨 | 입장 비용 | 완료 조건 | 실패 조건 | 골드 보상 | EXP 보상 | 추가 보상 ID | 반복 가능 | 해금 조건 | 상태 |
|---|---|---|---:|---:|---|---|---:|---:|---|---|---|---|
| `training_ruins_quest` | 훈련 폐허 | `training_ruins` | 1 | 0 | 조우 승리 후 출구 도달 | 파티 전멸 | 100 | 50 | `N/A` | true | 기본 | current |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |

## 14. 맵 데이터

### 14.1 맵 메타데이터

| map_id | 표시 이름 | 유형 | 너비 | 높이 | 시작 좌표 | 시작 방향 | 출구 좌표 | encounter_id | 시야 거리 | 상태 |
|---|---|---|---:|---:|---|---|---|---|---:|---|
| `training_ruins` | 훈련 폐허 | dungeon | 7 | 7 | `(1,1)` | east | `(5,5)` | `ruins_goblins` | 3 | current |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |

### 14.2 신규 맵 격자 입력

기호: `#` 벽, `.` 통로, `S` 시작, `E` 조우, `X` 출구. 다른 기호가 필요하면 먼저 의미를 정의한다.

```text
TBD
```

## 15. 보상 및 드롭 테이블

| reward_table_id | 항목 ID | 분류 | 수량 최소 | 수량 최대 | 확률 % | 중복 허용 | 지급 시점 | 상태 |
|---|---|---|---:|---:|---:|---|---|---|
| `TBD` | `TBD` | gold/exp/equipment/item/skill | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |

## 16. 동료 및 파티 후보 데이터

| companion_id | 표시 이름 | race_id | class_id | 시작 레벨 | 전열/후열 | 고정 장비 ID | 고정 스킬 ID | 모집 비용 | 계약 규칙 | 상태 |
|---|---|---|---|---:|---|---|---|---:|---|---|
| `party_warrior` | 브람 | `TBD` | warrior | 1 | 전열 | `N/A` | `basic_attack,power_strike` | 0 | 고정 동료 | current |
| `party_priest` | 세라 | `TBD` | priest | 1 | 후열 | `N/A` | `basic_attack,smite` | 0 | 고정 동료 | current |
| `party_archer` | 로웬 | `TBD` | archer | 1 | 후열 | `N/A` | `basic_attack,aimed_shot` | 0 | 고정 동료 | current |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |

## 17. 상점 운영 설정

| 항목 | 입력값 | 설명 |
|---|---|---|
| 상점 갱신 방식 | `TBD` | 고정 / 퀘스트 후 / 시간 |
| 상점 재고 제한 | `TBD` | 무제한 / 수량제 |
| 구매 수량 선택 | `TBD` | true / false |
| 판매 기능 | `TBD` | true / false |
| 가격 변동 | `TBD` | 없음 권장 / 조건부 |
| 구매 전후 능력치 비교 | `TBD` | true / false |
| 장비 상점과 아이템 상점 분리 | `TBD` | true / false |

## 18. 저장 데이터 확장 항목

성장·장비를 도입하면 저장 스키마 버전과 마이그레이션이 필요하다.

| 저장 항목 | 포함 여부 | 기본값 | 변경 시점 | 마이그레이션 규칙 |
|---|---|---|---|---|
| 캐릭터 레벨 | `TBD` | 1 | `TBD` | `TBD` |
| 현재/누적 경험치 | `TBD` | 0 | `TBD` | `TBD` |
| 성장된 능력치 | `TBD` | 직업 기본값 | `TBD` | `TBD` |
| 보유 장비 | `TBD` | 빈 목록 | `TBD` | `TBD` |
| 장착 장비 | `TBD` | 기본 장비 | `TBD` | `TBD` |
| 보유 아이템 | `TBD` | 빈 목록 | `TBD` | `TBD` |
| 습득 스킬 | `TBD` | 기본 스킬 | `TBD` | `TBD` |
| 장착 스킬 | `TBD` | 직업 기본값 | `TBD` | `TBD` |
| 퀘스트 해금 | `TBD` | 훈련 폐허 | `TBD` | `TBD` |

## 19. UI·에셋 연결값

| 콘텐츠 ID | icon_id | sprite_id | animation_id | effect_id | sound_id | 임시 사용 가능 | 비고 |
|---|---|---|---|---|---|---|---|
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | true | |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | true | |

## 20. 사용자 우선 입력 체크리스트

다음 순서대로 입력하면 후속 설계를 시작할 수 있다.

1. 목표 버전과 포함·제외 시스템.
2. 최대 레벨과 경험치 테이블.
3. 직업별 성장값과 신규 스킬 목록.
4. 장비 슬롯 중 첫 확장에 사용할 슬롯.
5. 1차 장비 상점 목록과 가격.
6. 보상을 소비하는 방식과 저장 항목.
7. 신규 퀘스트·맵·적·조우·보상.
8. 상점 운영 방식.
9. 필요한 아이콘·스프라이트 연결값.

## 21. 설계 전 필수 합계 검증

- 경험치 테이블의 누적값이 역전되지 않는지 확인한다.
- 직업별 레벨 증가 합계와 최종 능력치를 계산한다.
- 장비 가격이 퀘스트 골드 보상과 맞는 구매 주기를 만드는지 확인한다.
- 스킬 다이스·보정이 기존 기본 공격을 항상 무의미하게 만들지 않는지 확인한다.
- 적 HP·DEF가 권장 레벨 파티의 예상 라운드 수와 맞는지 확인한다.
- 적 공격력이 의도한 패배 가능성과 난이도를 만드는지 확인한다.
- 모든 ID 참조가 실제 테이블 행과 연결되는지 확인한다.
- 저장 항목 추가 시 save version과 마이그레이션 기본값이 있는지 확인한다.
