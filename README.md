# Party Night

Party Night는 모바일 가로 브라우저에서 플레이하는 **4인 파티 기반 1인칭 격자 탐사 + 다이스 턴제 RPG**입니다. 현재 버전은 **v0.2.0**이며, 순차 퀘스트 5개와 반복 퀘스트 2개, Lv1~10 성장 루프를 제공합니다.

- **Play:** https://orcspy.github.io/party_night/
- **Repository:** https://github.com/orcspy/party_night
- **Version:** `0.2.0`
- **Platform:** Mobile Web / Landscape
- **Logical resolution:** `640 × 360`

## 게임 특징

- 메인 캐릭터 1명과 고정 동료 3명으로 구성하는 4인 파티
- 1인칭 격자형 던전 탐사와 조우·함정·비밀문·비밀방
- d6 기반 턴제 전투와 다이스 리롤, 상태 효과, 쿨다운
- 종족 4종·직업 6종, Lv1~10 성장
- Lv1·2·5 직업 스킬과 Lv3·7·10 커스텀 스킬 슬롯
- 장비·아이템·스킬 상점, 100칸 통합 창고, 개인 소비 아이템 인벤토리
- 순차 퀘스트 5개 + 반복 퀘스트 2개
- 브라우저 `localStorage` 기반 ProfileV2 저장
- 프로젝트 자체 절차 생성 WAV SFX 2종: 탐사 이동 `footstep`, 전투·함정 피격 `hit`

## 실행

Node.js와 npm이 준비된 환경에서 다음 명령으로 실행합니다.

```bash
npm ci
npm run dev
```

production build 확인:

```bash
npm run build
npm run preview
```

검증 명령:

```bash
npm run typecheck
npm run test
npm run build
```

## 최종 검증 상태

최종 v0.2.0 기준선 및 SFX 변경분 검증 결과는 다음과 같습니다. SFX 적용 후 사용자가 `npm run typecheck`, `npm run test`, `npm run build`를 모두 완료했고 PC·Android Chrome·iOS Safari에서 실제 재생, 일반 피격 및 광역 공격의 hit 1회 재생을 확인했습니다. 이후 적 공격 presentation의 1초 windup만 0ms로 조정했으므로 이 최종 변경분에 대해서는 아래 명령과 적 공격 체감 타이밍을 한 번 더 확인합니다.

- `npm run typecheck`: 오류 없이 완료
- `npm run test`: **20 test files / 142 tests 통과**
- `npm run build`: 성공 — Vite가 418 modules를 변환
- 독립 `THIRD_PARTY_NOTICES` Markdown asset 생성 확인
- 전체 수동 회귀 테스트 완료
- **Android phone Chrome** 실제 동작 확인
- **iOS Safari** 실제 동작 확인
- 순차 퀘스트 완료 후 반복 퀘스트를 포함한 **Lv1 → Lv10 통합 진행** 확인
- 성공·패배·창고 overflow·reload 흐름 확인
- GitHub Pages production base: `/party_night/`

production main JS는 약 1.92MB(gzip 약 475.65kB)이며 Vite의 500kB 초과 chunk warning이 남아 있지만 build 실패는 아닙니다.

## 조작과 플레이 흐름

1. 메인 캐릭터의 이름, 종족, 직업, 성별을 선택해 ProfileV2를 생성합니다.
2. 거점에서 퀘스트, 캐릭터, 장비·아이템·스킬 상점, 창고를 사용해 원정을 준비합니다.
3. 탐사 화면 Canvas의 `FWD`, `BACK`, 좌우 회전 버튼으로 격자 던전을 이동합니다.
4. 탐사 중 조우·함정·비밀문·비밀방을 처리하고 전투에 진입합니다.
5. 전투에서는 d6 기반 판정, 직업/커스텀 스킬, 상태 효과와 쿨다운을 사용합니다. 일부 스킬은 굴림 결과를 본 뒤 특정 다이스를 리롤할 수 있습니다.
6. 퀘스트 성공 또는 실패 결과를 정산하고 EXP·골드·보상·해금 상태를 반영합니다.
7. 거점으로 돌아가 파티를 재정비하고 다음 순차 또는 반복 퀘스트를 진행합니다.

화면은 `640 × 360` 논리 해상도와 모바일 가로 방향을 기준으로 합니다. 세로 방향에서는 입력을 가리는 회전 안내가 표시됩니다.

## 퀘스트와 성장 범위

| 구분 | 퀘스트 | 주요 진행 |
|---|---|---|
| 순차 1 | 훈련 폐허 | Lv1 시작, 3번째 필수 조우 완료 |
| 순차 2 | 고블린 소굴 | 홉고블린 보스, 첫 커스텀 슬롯 |
| 순차 3 | 유적지 | 오우거 보스, 소비 아이템·희귀 장비 |
| 순차 4 | 지하 던전 | 미노타우르스 보스, Lv5 직업 스킬·상태/쿨다운 |
| 순차 5 | 옛 고성 | 리치 보스, 전설 장비·반복 퀘스트 해금 |
| 반복 | 화산 동굴 | 사이클롭스 보스, Lv6~10 반복 성장 |
| 반복 | 깊은 숲 폐허 | 스켈레톤 킹 보스, Lv6~10 반복 성장 |

순차 퀘스트 5개를 완료하면 Lv6에 도달하며, 반복 퀘스트를 통해 Lv10까지 성장합니다. Lv7·Lv10에서 추가 커스텀 스킬 슬롯이 해금됩니다.

## 주요 구현 범위

- 종족·직업·시작 무기는 기본 능력치와 파생 전투 수치에 반영됩니다. 성별과 전열·후열은 수치에 영향을 주지 않습니다.
- Phaser는 map별 terrain 7종 세트, 조우/보스 마커, 적 16종 registry를 사용하며 7개 퀘스트 전체에 연결됩니다. 누락·로딩 실패 시 해당 요소만 기존 Graphics 표현으로 fallback합니다.
- 파티 캐릭터는 종족 4 × 직업 6 × 성별 3 × 파티 슬롯 4 조합의 **288개 절차 생성 PNG**를 필요 시 지연 로드합니다.
- 아이템·장비·스킬은 포션, 장비 family 8종, 액티브/패시브의 **11개 대표 아이콘**을 사용합니다.
- 유적지와 오크·오우거를 포함한 terrain/enemy 이미지는 프로젝트 내부 Node 절차 생성 스크립트로 제작한 draft 에셋을 사용합니다.
- 탐사 이동과 피격 피드백은 `assets-source/audio/generate_sfx.py`로 생성한 44.1kHz/16-bit/mono WAV 2종을 사용하며 외부 음원 파일을 사용하지 않습니다.
- 승인된 소비 아이템 9종을 진행도에 따라 상점에서 해금합니다.
- 장비는 일반/고급/희귀/영웅/전설 rarity와 4개 장비 슬롯을 사용합니다.
- 100칸 통합 창고와 STR 기반 개인 소비 아이템 인벤토리 배분·회수를 제공합니다.
- 저장 키는 `party_night_profile_v2`입니다. 진행 중 원정의 HP·위치·전투 상태는 영속 저장하지 않습니다.

## 기술 구조

게임 결과는 React나 Phaser가 직접 계산하지 않고 **Pure TypeScript game engine**에서 먼저 확정합니다.

```text
React UI / Phaser Input
        │ GameCommand
        ▼
Pure TypeScript Game Engine
        │ EngineResult / GameEvent
        ├──────────────────┐
        ▼                  ▼
    React UI         Phaser Presentation
```

- **React:** 프로필 생성, 거점, 퀘스트·창고·캐릭터·상점, 전투 명령, 로그, 결과/보상 UI
- **Phaser:** 1인칭 격자 탐사, terrain/enemy/character 렌더링, 전투·다이스 연출, Canvas 터치 입력
- **Pure TypeScript Engine:** 캐릭터/파티 상태, 탐사, 행동 순서, 다이스, 상태/쿨다운, 피해, 승패, 성장, 보상, 저장 전이

게임 규칙에서 직접 `Math.random()`을 사용하지 않고 시드 기반 PRNG를 사용하며, 판정과 presentation을 분리해 연출 실패가 권위 상태에 영향을 주지 않도록 구성했습니다.

## 지원 환경 및 실기 검증

지원 대상 모바일 브라우저는 **Android Chrome**과 **iOS Safari**이며 두 환경 모두 가로 화면을 기준으로 합니다.

### Android Chrome

- Android phone Chrome에서 최신 v0.2.0 실제 동작 확인
- Fullscreen 진입 시 viewport 확장 확인
- 빠른 반복 탭, 뒤로가기, 앱 전환, 화면 회전 후 복귀 확인
- 전투 연출 중 명령 중복 입력 차단 확인
- 일반 결과와 창고 overflow 결과의 고정 footer 접근 확인
- 저장 후 reload와 Lv1~Lv10 전체 진행 확인

### iOS Safari

- iOS Safari에서 최신 v0.2.0 실제 동작 확인
- 가로 화면, safe-area, 주소창 높이 변화와 화면 회전 대응 확인
- 결과 화면 관성 스크롤 확인
- Fullscreen API 미지원 환경에서는 Fullscreen 버튼을 표시하지 않음
- 전투 timer·입력 잠금 및 탐사 이동 버튼 hit-test 확인

## Known Limitations

- 모바일 **가로 화면**을 우선 지원합니다.
- 진행 중 `ExpeditionSession`은 영속 저장하지 않으며 ProfileV2의 장기 진행만 저장합니다.
- terrain, enemy, character, content icon은 프로젝트 내부 절차 생성 스크립트로 만든 **draft 시각 에셋**입니다.
- 다이스·함정·비밀문 일부 표현은 Phaser Graphics 기반 표현을 유지합니다.
- 오디오는 현재 발소리·피격음 2종의 최소 SFX만 제공하며 BGM·볼륨 UI·환경별 사운드 variation은 포함하지 않습니다.
- production main chunk는 Vite 500kB warning 기준을 초과하지만 현재 final build와 검증을 통과했습니다.
- 계정/서버/온라인 플레이/PWA는 v0.2.0 범위에 포함되지 않습니다.

## License / Third-Party Notices

Party Night의 자체 소스 코드, 프로젝트 문서 및 원본 에셋에는 루트 [`LICENSE`](./LICENSE)의 조건이 적용됩니다.

제3자 소프트웨어의 저작권·라이선스 고지는 [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md)를 참조하십시오. 현재 dependency와 asset 검수 요약은 [`LICENSE_AUDIT_SUMMARY.md`](./LICENSE_AUDIT_SUMMARY.md)에 기록되어 있습니다.

## 프로젝트 문서

- [`AGENTS.md`](./AGENTS.md) — 장기 개발 규칙과 책임 경계
- [`architecture.md`](./architecture.md) — 시스템 구조와 설계 결정
- [`implements.md`](./implements.md) — 구현 계약과 단계별 상세
- [`raw_data_table.md`](./raw_data_table.md) — 승인된 게임 데이터
- [`asset-plan.md`](./asset-plan.md) — 에셋 계획과 구현/검증 상태
- [`asset-catalog.md`](./asset-catalog.md) — 에셋 출처·규격·라이선스·runtime 적용 상태
- [`changelog.md`](./changelog.md) / [`changelog-assets.md`](./changelog-assets.md) — 개발 및 에셋 작업 이력
