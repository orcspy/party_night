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
| 목표 버전 | `0.2.0` | 7개 퀘스트와 레벨 10 성장 |
| 확장 이름 | 7개 퀘스트와 레벨 10 성장 | approved |
| 핵심 목표 | 순차 5개·반복 2개 퀘스트와 영속 성장·거점 경제 | approved |
| 포함 시스템 | 다중 퀘스트, Lv10, 스킬, 장비·아이템 상점, 통합 창고, 함정·비밀문 | approved |
| 제외 시스템 | 서버·계정·온라인, 장비 강화·내구도·세트, 영구 사망 | approved |
| 최대 캐릭터 레벨 | 10 | approved |
| 신규 퀘스트 수 | 6 | 훈련 폐허 포함 총 7 |
| 신규 적 수 | 14 | 기존 고블린 2종 포함 총 16 |
| 신규 스킬 수 | 직업 12개 추가, 커스텀 13개 | 기본 공격·기존 직업 6개 제외 |
| 신규 장비 수 | 45 | 9 family × 5 rarity |

## 3. 전역 밸런스 설정

| key | v0.1.0 현재값 | 확장 입력값 | 단위 | 설명 |
|---|---:|---:|---|---|
| `party_size` | 4 | `TBD` | 명 | 파티 인원 |
| `front_row_size` | 2 | `TBD` | 명 | 전열 슬롯 수 |
| `back_row_size` | 2 | `TBD` | 명 | 후열 슬롯 수 |
| `base_die_sides` | 6 | `TBD` | 면 | 기본 다이스 면수 |
| `minimum_damage` | 1 | `TBD` | 피해 | 최소 피해 |
| `max_combat_log_entries` | 200 | `TBD` | 건 | 로그 보존 수 |
| `victory_gold_default` | 100 | quest별 300~1050 | gold | 22.8절 기준 |
| `victory_exp_default` | 50 | 파티 400 | exp | 캐릭터당 100 |
| `full_heal_on_return` | true | `TBD` | boolean | 준비 화면 복귀 시 완전 회복 |
| `base_custom_skill_slots` | N/A | 0 | 칸 | Lv3/7/10에 1칸씩 |

## 4. 경험치 및 레벨 테이블

### 4.1 레벨업 공통 규칙

| 항목 | 입력값 | 설명 |
|---|---|---|
| 경험치 적용 대상 | 캐릭터별 | 파티 4명 모두 동일 지급 |
| 경험치 분배 방식 | 균등 고정 지급 | 전투불능 포함 캐릭터당 100 |
| 누적 경험치 초과 이월 | true | Lv10에서 1000 고정 |
| 원정 중 레벨업 | 불가 | 성공 결과 정산 시 적용 |
| 최대 레벨 도달 후 경험치 | 정지 | 1000 고정 |
| 레벨업 회복 | 준비 복귀 완전 회복 | 원정 중에는 적용 안 함 |
| 능력치 증가 방식 | 직업별 표 | 22.3절 |

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

종족은 `STR/DEX/INT/CON/AGI/LUK` 기본 능력치를 제공한다. 네 종족의 합계는 모두 31이며, 직업 보정값을 항목별로 더해 캐릭터의 최종 능력치를 계산한다.

| race_id | 표시 이름 | STR | DEX | INT | CON | AGI | LUK | 합계 | 고정 skill_id | 외형 ID | 상태 | 비고 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|---|---|
| `human` | 인간 | 5 | 5 | 5 | 5 | 6 | 5 | 31 | `N/A` | `human` | approved | STR·DEX·INT·CON 균등 |
| `elf` | 엘프 | 3 | 7 | 6 | 4 | 7 | 4 | 31 | `N/A` | `elf` | approved | 낮은 STR·CON, 높은 DEX, 조금 높은 INT·AGI |
| `dwarf` | 드워프 | 7 | 6 | 3 | 6 | 4 | 5 | 31 | `N/A` | `dwarf` | approved | 높은 STR, 약간 높은 DEX·CON, 낮은 INT·AGI |
| `halfling` | 하플링 | 2 | 5 | 5 | 3 | 8 | 8 | 31 | `N/A` | `halfling` | approved | 낮은 STR·CON, 높은 AGI·LUK, 중립 DEX·INT |

### 5.1 성별 데이터

| 저장·UI 값 | 에셋 토큰 | 능력치 영향 | 상태 | 비고 |
|---|---|---|---|---|
| `남성` | `male` | 없음 | approved | 사용자 선택 가능 |
| `여성` | `female` | 없음 | approved | 사용자 선택 가능 |

- `기타`는 신규 선택과 Actor 생성에서 제외한다.
- 기존 version 1 저장의 `기타` 값은 다른 프로필 정보를 유지한 채 `남성`으로 정규화한다.
- 기존 `neutral` 에셋 파일은 삭제하지 않지만 신규 런타임에서는 사용하지 않는다.

## 6. 직업 기본 데이터

### 6.1 능력치 보정과 파생 설정

| class_id | STR 보정 | DEX 보정 | INT 보정 | CON 보정 | AGI 보정 | LUK 보정 | 보정 합계 | attackBasis | ATK 보정 | DEF 보정 | 상태 |
|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---|
| `warrior` | +4 | -1 | 0 | +3 | 0 | 0 | +6 | str | 0 | 1 | approved |
| `rogue` | -1 | +4 | 0 | 0 | +2 | +1 | +6 | dex | 0 | 0 | approved |
| `archer` | 0 | +3 | 0 | 0 | +3 | 0 | +6 | dex | 0 | 0 | approved |
| `paladin` | +2 | 0 | +2 | +2 | 0 | 0 | +6 | max_str_int | 0 | 3 | approved |
| `priest` | 0 | +2 | +4 | 0 | 0 | 0 | +6 | int | -2 | 1 | approved |
| `mage` | -1 | 0 | +5 | 0 | +1 | +1 | +6 | int | 1 | 0 | approved |

### 6.2 파생 공식

```text
maxHp = 11 + (CON × 2) + floor((STR + DEX) / 10)
atk = max(1, floor(attackBasis / 2) + ATK 보정)
def = max(1, floor(((CON × 2) + STR + DEX) / 10) + DEF 보정)
battleAgi = max(1, floor((AGI + 2) / 2))
```

- `max_str_int`는 `max(STR, INT)`다.
- LUK은 현 단계에서 파생값과 판정에 영향을 주지 않는다.
- 최종 능력치는 `종족 기본 능력치 + 직업 능력치 보정`으로 계산한다.
- 현재 24개 종족×직업 조합의 최종 합계는 모두 37이고 개별값 범위는 1~11이다.

### 6.3 인간 기준 계산 결과

종족에 따라 최종값이 달라지므로 아래 표는 인간 기본 능력치를 적용한 비교 기준이다.

| class_id | 표시 이름 | 최종 STR | DEX | INT | CON | AGI | LUK | 계산 HP | 계산 ATK | 계산 DEF | 계산 전투 AGI | 권장 열 | 기본 skill_id | 상태 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|
| `warrior` | 전사 | 9 | 4 | 5 | 8 | 6 | 5 | 28 | 4 | 3 | 4 | 전열 | `power_strike` | approved |
| `rogue` | 도적 | 4 | 9 | 5 | 5 | 8 | 6 | 22 | 4 | 2 | 5 | `TBD` | `quick_stab` | approved |
| `archer` | 궁수 | 5 | 8 | 5 | 5 | 9 | 5 | 22 | 4 | 2 | 5 | 후열 | `aimed_shot` | approved |
| `paladin` | 성기사 | 7 | 5 | 7 | 7 | 6 | 5 | 26 | 3 | 5 | 4 | `TBD` | `holy_strike` | approved |
| `priest` | 사제 | 5 | 7 | 9 | 5 | 6 | 5 | 22 | 2 | 3 | 4 | 후열 | `smite` | approved |
| `mage` | 마법사 | 4 | 5 | 10 | 5 | 7 | 6 | 21 | 6 | 1 | 4 | `TBD` | `arcane_bolt` | approved |

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
| `power_strike` | 강타 | warrior | active | 1 | single_enemy | 3d6 | 0 | cooldown_2 | 0 | 0 | 50% 확률로 적 1턴 기절 | current |
| `quick_stab` | 빠른 찌르기 | rogue | active | 1 | single_enemy | 2d6 | 2 | cooldown_2 | 0 | 0 | 100% 확률로 적 출혈(1dmg per turn), 누적 가능 | current |
| `aimed_shot` | 조준 사격 | archer | active | 1 | single_enemy | 3d6 | 0 | cooldown_2 | 0 | 1 | 다이스 하나 선택 리롤 | current |
| `holy_strike` | 신성한 일격 | paladin | active | 1 | single_enemy | 2d6 | 2 | cooldown_2 | 0 | 0 | 언데드에 2배 효과 | current |
| `heal` | 성스러운 치료 | priest | active | 1 | single_ally | 2d6 | 1 | none | 0 | 0 | 아군 한명 치료, 성력 1 축적(버프로 취급) | current |
| `arcane_bolt` | 비전 화살 | mage | active | 1 | single_enemy | 3d6 | 1 | cooldown_2 | 0 | 0 | overkill데미지 이전(임의의 남은 적), 마력1 축적 | current |
| `taunt` | 도발 | warrior | active | 2 | all_enemies | none | 0 | cooldown_2 | 0 | 0 | 1턴간 적이 50%확률로 자신을 공격 | input |
| `seek_trap` | 함정간파 | rogue | passive | 2 | self | none | 0 | none | 0 | 0 | 함정 및 숨겨진 문 발견 | input |
| `find_leak` | 약점노출 | archer | active | 2 | single_enemy | 1d6 | -3 | cooldown_2 | 0 | 0 | 지정대상은 다음 궁수 차례가 끝날때까지 대상이 받는 피해 증가(dice 값) | input |
| `protection_pledge` | 보호 서약 | paladin | passive | 2 | all_allies | none | 0 | none | 0 | 0 | 모든 아군이 받는 최종 피해 -1 | input |
| `smite` | 징벌 | priest | active | 2 | single_enemy | 2d6 | 1 | cooldown_2 | 0 | 0 | 언데드에 2배 효과, 성력 1축적 | input |
| `lightning_bolt` | 전격 화살 | mage | active | 2 | single_enemy | 2d6 | 3 | cooldown_2 | 0 | 0 | 100% 확률로 적 1턴 마비, 마력 1축적 | input |
| `ability_reinforcement` | 능력 강화 | warrior | active | 5 | self | none | 0 | cooldown_5 | 0 | 0 | 3턴간 모든 스테이터스 5증가, 3턴후 1턴간 모든 스테이터스 2감소 | input |
| `wound_break` | 상처 절개 | rogue | active | 5 | single_enemy | 3d6 | 5 | cooldown_5 | 0 | 0 | 적 출혈 제거, 출혈 중첩당 +x배의 데미지 | input |
| `head_shot` | 헤드 샷 | archer | active | 5 | single_enemy | 5d6 | 5 | cooldown_5 | 0 | 0 | 약점 노출중 대상에만 사용가능 | input |
| `sacred_rage` | 성스러운 분노 | paladin | active | 5 | self | 2d6 | 10 | cooldown_5 | 0 | 0 | 3턴동안 언데드에 3배 데미지. 일반 적에 2배 데미지(성스러운 분노 포함) | input |
| `celestial_shroud` | 천상의 수의 | priest | passive | 5 | self | none | 0 | none | 0 | 0 | 성력 1당 치료+2, 징벌 데미지+2 | input |
| `fire_ball` | 화염구 | mage | active | 5 | all_enemies | 3d6 | 7 | cooldown_5 | 0 | 0 | 축적된 마력 1당 +5 데미지 | input |

### 7.3 커스텀 스킬 목록

`target_type` 예: `single_enemy`, `all_enemies`, `self`, `single_ally`. `use_limit` 예: `none`, `once_per_battle`, `cooldown_2`.

| skill_id | 표시 이름 | class_id | 분류 | 해금 레벨 | target_type | 다이스 | 고정 보정 | use_limit | 비용 | 리롤 수 | effect_note | 상태 |
|---|---|---|---|---:|---|---|---:|---|---:|---:|---|---|
| `first_aid` | 응급 치료 | all | active | 5 | self | 1d6 | 2 | cooldown_2 | 1 | 0 | 기본 치료, 붕대 소모 | input |
| `spell_boost` | 마력 강화 | all | passive | 5 | self | none | 0 | none | 0 | 0 | 마법 데미지 +1 | input |
| `str_reinforcement` | 근력 강화 | all | passive | 5 | self | none | 0 | none | 0 | 0 | 물리 데미지 +1 | input |
| `goblin_killer` | 고블린 학살자 | all | passive | 5 | self | none | 0 | none | 0 | 0 | 고블린 대상 대미지 +3 | input |
| `kobold_killer` | 코볼트 학살자 | all | passive | 5 | self | none | 0 | none | 0 | 0 | 코볼트 대상 대미지 +3 | input |
| `bone_crusher` | 본 크러셔 | all | passive | 5 | self | none | 0 | none | 0 | 0 | 스켈레톤 대상 대미지 +3, 보스 대상시 +1 | input |
| `cutlery_expert` | 날붙이 전문가 | warrior | passive | 5 | self | none | 0 | none | 0 | 0 | 날붙이 무기류 +1 대미지 | input |
| `club_expert` | 몽둥이 전문가 | warrior | passive | 5 | self | none | 0 | none | 0 | 0 | 비 날붙이 무기류 +1 대미지 | input |
| `neurotoxin` | 신경독 | rogue | active | 5 | self | 2d6 | 2 | cooldown_2 | 0 | 0 | 누적 가능 100% 확률로 적 신경독 중독(대상의 전투 agi 50% down 중복 불가)+출혈(누적가능) | input |
| `breathing_control` | 호흡 조절 | archer | passive | 5 | self | none | 0 | none | 0 | 0 | 사격 대미지 + 2 | input |
| `sacrifice` | 희생 | paladin | active | 5 | single_ally | 2d6 | 2 | cooldown_4 | 0 | 0 | 아군에게 치료, 치료된 1/2만큼 hp소모 | current |
| `bless` | 축복 | priest | active | 5 | single_ally | 1d6 | 0 | none | 0 | 0 | 아군 한명 str, dex, int 2씩 증가, 성력 1 축적 | current |
| `sleep` | 수면 | mage | active | 5 | single_enemy | 1d6 | 0 | cooldown_2 | 0 | 0 | 50%(25%) 확률로 dice값의 1/2턴(1/4턴) 동안 수면 부여, 마력1 축적 | current |

## 8. 장비 시스템 기본 설정

### 8.1 장비 슬롯

| slot_id | 표시 이름 | 캐릭터당 수 | 양손 점유 | MVP 다음 확장 포함 | 비고 |
|---|---|---:|---|---|---|
| `weapon_main` | 주무기 | 1 | 콘텐츠별 | true | 활·지팡이·로드 양손 |
| `weapon_sub` | 보조무기/방패 | 1 | false | true | 양손 장비와 동시 장착 불가 |
| `head` | 머리 | 1 | false | true | |
| `body` | 몸통 | 1 | false | true | |
| `hands` | 손 | 1 | false | false | deferred |
| `feet` | 발 | 1 | false | false | deferred |
| `cloak` | 망토 | 1 | false | false | deferred |
| `neck` | 목 장신구 | 1 | false | false | deferred |
| `ring` | 반지 | 0 | false | false | deferred |

### 8.2 장비 공통 규칙

| 항목 | 입력값 | 설명 |
|---|---|---|
| 장비 구매 후 자동 장착 | false | 통합 창고로 이동 |
| 장비 판매 가격 비율 | 50% | 내림 정수 골드 |
| 직업 제한 위반 처리 | 장착 불가 | 상점에는 경고 표시 |
| 양손 무기와 보조 슬롯 | 동시 장착 불가 | 양손 장착 시 방패 반환 |
| 장비 내구도 | N/A | 사용하지 않음 |
| 장비 강화 | deferred | 현 단계 제외 |
| 장비 희귀도 | common,uncommon,rare,heroic,legendary | 흰/녹/파랑/보라/노랑 |

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
| `party_warrior` | 브람 | `dwarf` | warrior | 1 | 전열 | `N/A` | `basic_attack,power_strike` | 0 | 고정 동료 | current |
| `party_priest` | 세라 | `human` | priest | 1 | 후열 | `N/A` | `basic_attack,smite` | 0 | 고정 동료 | current |
| `party_archer` | 로웬 | `elf` | archer | 1 | 후열 | `N/A` | `basic_attack,aimed_shot` | 0 | 고정 동료 | current |
| `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | `TBD` | input |

## 17. 상점 운영 설정

| 항목 | 입력값 | 설명 |
|---|---|---|
| 상점 갱신 방식 | 장비·아이템 고정, 스킬 퀘스트 성공 후 | approved |
| 상점 재고 제한 | 장비·아이템 무제한, 스킬 offer당 1 | approved |
| 구매 수량 선택 | 소비 아이템만 true | approved |
| 판매 기능 | true | 창고 항목만, 50% |
| 가격 변동 | 없음 | approved |
| 구매 전후 능력치 비교 | true | 장비 UI |
| 장비 상점과 아이템 상점 분리 | 탭 분리 | 같은 ShopPanel |

## 18. 저장 데이터 확장 항목

성장·장비를 도입하면 저장 스키마 버전과 마이그레이션이 필요하다.

| 저장 항목 | 포함 여부 | 기본값 | 변경 시점 | 마이그레이션 규칙 |
|---|---|---|---|---|
| 캐릭터 레벨 | true | 1 | 성공 정산 | v1 migration 없음 |
| 현재/누적 경험치 | 누적 EXP true | 0 | 성공 정산 | v1 migration 없음 |
| 성장된 능력치 | true | 0 성장 | 레벨업 | 22.3절 |
| 보유 장비 | true | 시작 무기 instance | 구매·보상·판매 | v2 전용 |
| 장착 장비 | true | 직업 대표 일반 무기 | 거점 장착 | v2 전용 |
| 보유 아이템 | true | 빈 목록 | 구매·사용·이전 | v2 전용 |
| 습득 스킬 | true | 직업 Lv1 | 레벨·보상·구매 | custom은 instance |
| 장착 스킬 | true | custom 빈 슬롯 | 거점 장착 | Lv3/7/10 |
| 퀘스트 해금 | true | 훈련 폐허 | 성공 정산 | 순차·반복 진행 |

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

## 22. v0.2.0 승인 확장 데이터

이 절은 2~19절의 `TBD`, 이전 MVP 수치와 충돌할 경우 우선한다. 구현 기준은 `architecture.md` 15절과 `implements.md` 23절이다.

### 22.1 확장 기본값

| 항목 | 값 | 상태 |
|---|---|---|
| 목표 버전 | `0.2.0` | approved |
| 확장 이름 | 7개 퀘스트와 레벨 10 성장 | approved |
| 파티 크기 | 4 | approved |
| 시작 레벨 / 최대 레벨 | 1 / 10 | approved |
| 시작 골드 | 300 | approved |
| 통합 공용 창고 | 100칸 | approved |
| 소비 아이템 stack | 같은 item ID 10개/칸 | approved |
| 개인 인벤토리 | `10 + min(3, floor(finalSTR / 5))` | approved |
| 퀘스트 성공 EXP | 파티 400, 캐릭터당 100 | approved |
| 실패 보상 | 원정 보상 전부 폐기, 사용 아이템 미복구 | approved |
| 귀환 회복 | 성공·실패 후 full heal | approved |
| 저장 | `party_night_profile_v2`, version 2, v1 migration 없음 | approved |

### 22.2 경험치와 해금

| 도달 레벨 | 필요 EXP | 누적 EXP | 해금 |
|---:|---:|---:|---|
| 1 | 0 | 0 | 기본 공격, 첫 직업 스킬 |
| 2 | 100 | 100 | 두 번째 직업 스킬 |
| 3 | 100 | 200 | 커스텀 슬롯 1 |
| 4 | 100 | 300 | 없음 |
| 5 | 100 | 400 | 세 번째 직업 스킬 |
| 6 | 100 | 500 | 순차 퀘스트 완료 기준 |
| 7 | 100 | 600 | 커스텀 슬롯 2 |
| 8 | 100 | 700 | 없음 |
| 9 | 100 | 800 | 없음 |
| 10 | 200 | 1000 | 커스텀 슬롯 3, EXP 상한 |

### 22.3 직업별 레벨 성장

각 셀은 해당 레벨 도달 시 증가하는 `[STR,DEX,INT,CON,AGI,LUK]`다.

| class_id | Lv2 | Lv3 | Lv4 | Lv5 | Lv6 | Lv7 | Lv8 | Lv9 | Lv10 | 누적 합계 |
|---|---|---|---|---|---|---|---|---|---|---:|
| `warrior` | `1,0,0,1,0,0` | `1,0,0,0,1,0` | `1,0,0,1,0,0` | `0,0,0,1,0,1` | `1,0,0,1,0,0` | `1,0,0,0,1,0` | `1,0,0,1,0,0` | `0,1,0,1,0,0` | `1,0,1,0,0,0` | 18 |
| `rogue` | `0,1,0,0,1,0` | `0,1,0,0,0,1` | `0,0,0,1,1,0` | `0,1,0,0,1,0` | `0,1,0,0,0,1` | `0,1,0,0,1,0` | `0,1,0,1,0,0` | `1,0,0,0,1,0` | `0,1,1,0,0,0` | 18 |
| `archer` | `0,1,0,0,1,0` | `1,1,0,0,0,0` | `0,0,0,1,1,0` | `0,1,0,0,1,0` | `0,1,0,0,0,1` | `0,1,0,0,1,0` | `0,1,0,1,0,0` | `1,0,0,0,1,0` | `0,1,1,0,0,0` | 18 |
| `paladin` | `1,0,0,1,0,0` | `0,0,1,1,0,0` | `1,0,1,0,0,0` | `0,0,0,1,0,1` | `1,0,1,0,0,0` | `0,0,1,1,0,0` | `1,0,0,0,1,0` | `0,0,1,0,1,0` | `1,1,0,0,0,0` | 18 |
| `priest` | `0,0,1,1,0,0` | `0,1,1,0,0,0` | `0,0,1,1,0,0` | `0,0,1,0,0,1` | `0,0,0,1,1,0` | `0,0,1,1,0,0` | `0,1,1,0,0,0` | `0,0,1,0,0,1` | `1,0,0,0,1,0` | 18 |
| `mage` | `0,0,1,0,1,0` | `0,0,1,0,0,1` | `0,0,1,1,0,0` | `0,0,1,0,1,0` | `0,0,1,1,0,0` | `0,0,1,0,1,0` | `0,0,1,0,0,1` | `0,0,1,1,0,0` | `0,1,0,0,1,0` | 18 |

### 22.4 Lv10 인간 기준 무장비 능력치

| 직업 | STR | DEX | INT | CON | AGI | LUK | HP | ATK | DEF | 전투 AGI |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 전사 | 16 | 5 | 6 | 14 | 8 | 6 | 41 | 8 | 5 | 5 |
| 도적 | 5 | 16 | 6 | 7 | 13 | 8 | 27 | 8 | 3 | 7 |
| 궁수 | 7 | 15 | 6 | 7 | 14 | 6 | 27 | 7 | 3 | 8 |
| 성기사 | 12 | 6 | 12 | 11 | 8 | 6 | 34 | 6 | 7 | 5 |
| 사제 | 6 | 9 | 16 | 9 | 8 | 7 | 30 | 6 | 4 | 5 |
| 마법사 | 4 | 6 | 18 | 8 | 11 | 8 | 28 | 10 | 2 | 6 |

### 22.5 장비 데이터

장비 능력치는 `[STR,DEX,INT,CON,AGI,LUK]`, 가격은 `구매/판매`다. ID는 `{rarity}_{family}`를 사용한다.

| family / slot | common | uncommon | rare | heroic | legendary |
|---|---|---|---|---|---|
| `dagger` / weapon | `common_dagger` 낡은 단검 `0,1,0,0,0,0` `80/40` | `uncommon_dagger` 사냥꾼 단검 `0,2,0,0,1,0` `150/75` | `rare_dagger` 청람 단검 `0,3,0,0,1,1` `250/125` | `heroic_dagger` 그림자 단검 `1,4,0,0,2,1` `380/190` | `legendary_dagger` 황금 송곳니 `1,5,0,0,3,2` `580/290` |
| `sword` / weapon | `common_sword` 철제 한손검 `1,0,0,0,0,0` `100/50` | `uncommon_sword` 수호자의 검 `2,1,0,0,0,0` `180/90` | `rare_sword` 청강검 `3,2,0,0,0,0` `300/150` | `heroic_sword` 왕실 보검 `5,2,0,1,0,0` `460/230` | `legendary_sword` 태양검 `7,3,0,1,0,0` `700/350` |
| `mace` / weapon | `common_mace` 철제 둔기 `1,0,0,0,0,0` `100/50` | `uncommon_mace` 수호 철퇴 `2,0,0,1,0,0` `180/90` | `rare_mace` 청뢰 철퇴 `3,0,1,1,0,0` `300/150` | `heroic_mace` 성전 철퇴 `4,0,2,2,0,0` `460/230` | `legendary_mace` 심판의 망치 `6,0,2,3,0,0` `700/350` |
| `shield` / offhand | `common_shield` 나무 방패 `0,0,0,1,0,0` `80/40` | `uncommon_shield` 강화 방패 `1,0,0,2,0,0` `150/75` | `rare_shield` 청강 방패 `1,0,0,3,0,1` `250/125` | `heroic_shield` 성채 방패 `2,0,0,4,0,2` `380/190` | `legendary_shield` 태양 방패 `3,0,0,6,0,2` `580/290` |
| `bow` / two_hand | `common_bow` 사냥용 활 `0,1,0,0,0,0` `110/55` | `uncommon_bow` 녹림의 활 `0,2,0,0,1,0` `190/95` | `rare_bow` 청옥 장궁 `0,3,0,0,2,0` `320/160` | `heroic_bow` 자월 장궁 `0,4,0,0,3,1` `490/245` | `legendary_bow` 별빛 장궁 `0,6,0,0,4,1` `740/370` |
| `staff` / two_hand | `common_staff` 참나무 지팡이 `0,0,1,0,0,0` `100/50` | `uncommon_staff` 현자의 지팡이 `0,0,2,1,0,0` `180/90` | `rare_staff` 청옥 지팡이 `0,0,3,1,0,1` `300/150` | `heroic_staff` 주교의 지팡이 `0,0,4,2,0,2` `460/230` | `legendary_staff` 세계수 지팡이 `0,0,6,3,0,2` `700/350` |
| `rod` / two_hand | `common_rod` 견습 로드 `0,0,1,0,0,0` `110/55` | `uncommon_rod` 비취 로드 `0,0,2,0,1,0` `190/95` | `rare_rod` 청성 로드 `0,0,3,0,1,1` `320/160` | `heroic_rod` 공허의 로드 `0,0,5,0,2,1` `490/245` | `legendary_rod` 용맥의 로드 `0,0,7,0,2,2` `740/370` |
| `head` / head | `common_head` 가죽 모자 `0,1,0,0,0,0` `70/35` | `uncommon_head` 강화 두건 `0,1,0,0,1,1` `130/65` | `rare_head` 청옥 투구 `0,1,1,0,1,2` `220/110` | `heroic_head` 왕실 투구 `0,1,2,1,2,2` `340/170` | `legendary_head` 별왕관 `1,2,2,1,2,3` `520/260` |
| `body` / body | `common_body` 가죽 갑옷 `0,0,0,1,0,0` `90/45` | `uncommon_body` 강화 갑옷 `1,0,0,2,0,0` `170/85` | `rare_body` 청강 갑옷 `1,1,0,3,0,0` `280/140` | `heroic_body` 영웅의 갑옷 `2,1,0,4,0,1` `430/215` | `legendary_body` 천명 갑옷 `3,1,0,6,0,1` `650/325` |

직업 무기 제한:

| 직업 | family |
|---|---|
| warrior | dagger,sword,mace,shield,bow,staff,rod |
| rogue | dagger,sword |
| paladin | sword,mace,shield |
| archer | bow |
| priest | staff |
| mage | staff,rod |

### 22.6 소비 아이템

| item_id | 이름 | 해금 | 구매/판매 | 사용 | 행동 | 효과 |
|---|---|---|---:|---|---|---|
| `minor_healing_potion` | 소형 회복약 | 초기 | 30/15 | 전투·탐사 | 소비 | 아군 1명 HP 10 회복 |
| `bandage` | 붕대 | 초기 | 20/10 | 전투·탐사 | 소비 | `first_aid` 사용 비용 |
| `remedy` | 정화약 | 초기 | 40/20 | 전투·탐사 | 소비 | 출혈·신경독·마비·수면·능력감소 중 하나 제거 |
| `fire_bomb` | 화염병 | Q1 | 60/30 | 전투 | 소비 | 적 1명 DEF 무시 피해 10 |
| `survey_chalk` | 탐색용 분필 | Q1 | 50/25 | 탐사 | 없음 | 현재·인접 칸 함정/비밀문 1회 탐지 |
| `greater_healing_potion` | 상급 회복약 | Q3 | 70/35 | 전투·탐사 | 소비 | 아군 1명 HP 22 회복 |
| `might_tonic` | 근력 강장제 | Q3 | 70/35 | 전투 | 무료 | 3라운드 STR +2 |
| `haste_tonic` | 민첩 강장제 | Q3 | 70/35 | 전투 | 무료 | 3라운드 AGI +2 |
| `panacea` | 만능 치료제 | Q4 | 100/50 | 전투·탐사 | 소비 | 제거 가능 상태·능력 감소 전부 제거 |

### 22.7 스킬 실행 정규화

- 7.2절 직업 스킬 ID와 Lv1/2/5는 유지한다.
- `basic_attack`은 슬롯 밖 상시 명령이다.
- `power_strike`: 3d6, CD2, 피해 후 기절 일반50%/보스25%.
- `quick_stab`: 2d6+2, CD2, 피해 후 bleed +1 일반100%/보스50%.
- `heal`: 2d6+1 회복, 성력+1.
- `arcane_bolt`: 3d6+1, 초과 피해를 다른 적 1명에게 1회 이전, 마력+1.
- `taunt`: CD2, 모든 적에 도발 일반50%/보스25%, 1회 행동.
- `seek_trap`: 살아 있는 보유자가 있으면 함정·비밀문 자동 발견.
- `find_leak`: `max(1,1d6-3)` 받는 직접 피해 증가, 궁수의 다음 행동 종료까지. 궁수가 다음 행동 종료전 사망 시 해당 라운드까지만 유지.
- `protection_pledge`: 생존 중 아군 직접 최종 피해 -1.
- `smite`: 2d6+1, 언데드×2, 성력+1, CD2.
- `lightning_bolt`: 2d6+3, 마비 일반100%/보스50%, 마력+1, CD2.
- `ability_reinforcement`: 3회 행동 전능력+5 후 1회 전능력-2, CD5.
- `wound_break`: 출혈 대상, 3d6+5 피해×`1+0.5*stack`, 출혈 제거, CD5.
- `head_shot`: exposed 대상 전용 5d6+5, CD5.
- `sacred_rage`: 3회 행동 일반×2/언데드×3, CD5.
- `celestial_shroud`: 성력당 heal 회복·smite 피해 +2.
- `fire_ball`: 모든 적 공통 3d6+7, 마력당 +5, CD5.

7.3절 커스텀 스킬은 모두 장착 요구 Lv3으로 정규화한다. 추가 실행값:

- `first_aid`: 붕대 1개, 자신 1d6+2 회복, CD2.
- `neurotoxin`: 대상 `single_enemy`, 2d6+2 후 일반100%/보스50%로 전투 AGI50% 감소(중첩 불가)+bleed1, CD2.
- `sacrifice`: 실제 회복량 절반을 시전자 HP에서 차감, CD4.
- `bless`: STR/DEX/INT +2, 3회 행동, 성력+1.
- `sleep`: 다이스 없음, 일반50%/보스25%, 직접 공격 피격까지, CD2, 마력+1.
- 나머지 패시브는 7.3절 effect_note의 고정 피해 보정을 적용한다.

### 22.8 퀘스트와 경제

| 순서 | quest_id | 이름 | 권장 Lv | map_id | 완료 | 골드 | 파티 EXP | 반복 | 해금 |
|---:|---|---|---:|---|---|---:|---:|---|---|
| 1 | `training_ruins_quest` | 훈련 폐허 | 1 | `training_ruins` | 3번째 조우 | 1100 | 400 | false | 기본 |
| 2 | `goblin_den_quest` | 고블린 소굴 | 2 | `goblin_den` | 홉고블린 | 1100 | 400 | false | Q1 |
| 3 | `ancient_site_quest` | 유적지 | 3 | `ancient_site` | 오우거 | 1800 | 400 | false | Q2 |
| 4 | `underground_dungeon_quest` | 지하 던전 | 4 | `underground_dungeon` | 미노타우르스 | 2700 | 400 | false | Q3 |
| 5 | `old_castle_quest` | 옛 고성 | 5 | `old_castle` | 리치 | 4000 | 400 | false | Q4 |
| - | `volcanic_cave_quest` | 화산 동굴 | 6~8 | `volcanic_cave` | 사이클롭스 | 4000 | 400 | true | Q5 |
| - | `deep_forest_ruins_quest` | 깊은 숲 폐허 | 8~10 | `deep_forest_ruins` | 스켈레톤 킹 | 4000 | 400 | true | Q5 |

### 22.9 적 데이터

| enemy_id | 이름 | 역할 | HP | ATK | DEF | AGI | skill_id | sprite_id |
|---|---|---|---:|---:|---:|---:|---|---|
| `goblin_scout` | 고블린 정찰병 | 일반 | 18 | 3 | 2 | 4 | basic_attack | enemy_goblin_scout |
| `goblin_guard` | 고블린 경비병 | 일반 | 24 | 4 | 3 | 2 | basic_attack | enemy_goblin_guard |
| `hobgoblin_boss` | 홉고블린 대장 | boss | 68 | 5 | 4 | 3 | commanding_strike | enemy_hobgoblin_boss |
| `orc_raider` | 오크 약탈자 | 일반 | 30 | 6 | 3 | 3 | basic_attack | enemy_orc_raider |
| `ogre` | 오우거 | boss/midboss | 92 | 7 | 5 | 1 | ogre_smash | enemy_ogre |
| `kobold_skirmisher` | 코볼트 척후병 | 일반 | 25 | 5 | 3 | 6 | basic_attack | enemy_kobold_skirmisher |
| `gnoll_brute` | 놀 투사 | midboss | 74 | 7 | 5 | 5 | rending_bite | enemy_gnoll_brute |
| `minotaur_boss` | 미노타우르스 | boss | 120 | 8 | 6 | 4 | minotaur_gore | enemy_minotaur_boss |
| `skeleton_soldier` | 스켈레톤 병사 | 일반/undead | 30 | 6 | 5 | 3 | basic_attack | enemy_skeleton_soldier |
| `zombie` | 좀비 | 일반/undead | 42 | 7 | 3 | 1 | basic_attack | enemy_zombie |
| `ghoul` | 구울 | midboss/undead | 82 | 8 | 5 | 6 | paralyzing_claw | enemy_ghoul |
| `lich_boss` | 리치 | boss/undead | 125 | 10 | 7 | 6 | death_bolt | enemy_lich_boss |
| `imp` | 임프 | 일반 | 34 | 8 | 4 | 7 | basic_attack | enemy_imp |
| `cyclops_boss` | 사이클롭스 | boss | 150 | 10 | 7 | 2 | crushing_blow | enemy_cyclops_boss |
| `wraith` | 레이스 | midboss/undead | 86 | 10 | 7 | 8 | drain_touch | enemy_wraith |
| `skeleton_king_boss` | 스켈레톤 킹 | boss/undead | 145 | 9 | 7 | 5 | royal_cleave | enemy_skeleton_king_boss |

적 특수 스킬은 첫 해당 퀘스트 단계에서 단순 resolver로 추가한다: `commanding_strike` 3d6, `ogre_smash` 3d6+2·기절25%, `rending_bite` 2d6+2·bleed1 50%, `minotaur_gore` 3d6+2·기절40%, `paralyzing_claw` 2d6+2·마비50%, `death_bolt` 3d6+4, `crushing_blow` 3d6+4·기절40%, `drain_touch` 3d6·실피해 절반 회복, `royal_cleave` 모든 아군 2d6.

### 22.10 조우 순서

| quest_id | encounter party 순서 |
|---|---|
| training_ruins_quest | `goblin_scout:1` → `goblin_scout:2` → `goblin_scout:1,goblin_guard:1` |
| goblin_den_quest | `goblin_scout:2` → `goblin_scout:1,goblin_guard:1` → `hobgoblin_boss:1` |
| ancient_site_quest | `goblin_scout:1,goblin_guard:1` → `goblin_scout:1,orc_raider:1` → `orc_raider:2` → `ogre:1` |
| underground_dungeon_quest | `kobold_skirmisher:2` → `goblin_guard:1,kobold_skirmisher:1` → `gnoll_brute:1` → `goblin_guard:1,kobold_skirmisher:2` → `minotaur_boss:1` |
| old_castle_quest | `skeleton_soldier:2` → `zombie:2` → `ghoul:1` → `skeleton_soldier:1,zombie:1` → `lich_boss:1` |
| volcanic_cave_quest | `imp:2` → `kobold_skirmisher:2,imp:1` → `ogre:1` → `imp:2,kobold_skirmisher:1` → `cyclops_boss:1` |
| deep_forest_ruins_quest | `skeleton_soldier:2` → `orc_raider:2` → `wraith:1` → `skeleton_soldier:2,orc_raider:1` → `skeleton_king_boss:1` |

### 22.11 맵·에셋 메타데이터

| map_id | 크기 | 조우 좌표 순서 | terrain asset_id | fallback tint |
|---|---:|---|---|---|
| training_ruins | 7×7 | `(3,1),(5,3),(3,5)` | terrain_training_ruins | 기본 |
| goblin_den | 9×7 | `(4,1),(7,3),(4,5)` | terrain_goblin_den | 갈색 |
| ancient_site | 9×9 | `(3,1),(7,3),(3,5),(7,7)` | terrain_ancient_site | 회갈색 |
| underground_dungeon | 11×9 | `(3,1),(8,1),(8,4),(3,7),(9,7)` | terrain_underground_dungeon | 청회색 |
| old_castle | 11×11 | `(3,1),(8,2),(8,5),(3,8),(9,9)` | terrain_old_castle | 암자색 |
| volcanic_cave | 11×11 | `(4,1),(9,3),(6,5),(3,8),(9,9)` | terrain_volcanic_cave | 적갈색 |
| deep_forest_ruins | 13×11 | `(4,1),(10,3),(6,5),(3,8),(11,9)` | terrain_deep_forest_ruins | 녹회색 |

- 모든 맵은 외곽 벽, 단일 연결 주경로, 최소 1개 함정과 1개 비밀문을 가진다. 훈련 폐허는 입문 단순화를 위해 함정·비밀문을 생략할 수 있다.
- 일반 조우는 `marker_encounter`, 보스는 `marker_boss`를 사용하고 미구현 시 붉은 tint의 조우 마커로 fallback한다.
- 신규 적 sprite가 없으면 기존 적 도형을 사용하고 boss/midboss는 scale과 tint로 구분한다.

### 22.12 상점·창고·보상

| 조건 | 장비 등급 | 신규 소비 아이템 |
|---|---|---|
| 시작 | common | minor_healing_potion, bandage, remedy |
| Q1 | uncommon | fire_bomb, survey_chalk |
| Q3 | rare | greater_healing_potion, might_tonic, haste_tonic |
| Q4 | heroic | panacea |
| Q5 | legendary | 없음 |

- 스킬 offer 가격은 파티 최대 슬롯 단계 기준 Lv3 180, Lv7 420, Lv10 650이다. 판매가는 절반이다.
- 퀘스트 성공마다 커스텀 스킬 3개 instance 보상을 생성하고 상점 offer 3종을 갱신한다.
- 창고 빈칸 2 이하 진입 경고, overflow 사용자 선택, 미선택 보상 포기 규칙을 적용한다.
- secret room은 해당 퀘스트 해금 등급 이하 장비 또는 소비 아이템 1개를 생성한다.
