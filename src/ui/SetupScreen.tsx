import { useState } from 'react'
import { CLASS_DATA, combineAttributes, deriveCombatStats, RACE_DATA } from '../game/content'
import type { ClassId, GameCommand, GameState, Gender, MainCharacterConfig, RaceId } from '../game/types'

interface Props {
  state: GameState
  dispatch: (command: GameCommand) => void
}

export function SetupScreen({ state, dispatch }: Props) {
  const [config, setConfig] = useState<MainCharacterConfig>({ name: '', raceId: 'human', classId: 'warrior', gender: '남성' })
  if (state.screen === 'start') {
    return (
      <main className="menu-screen start-screen">
        <div className="title-mark">PN</div>
        <p className="eyebrow">DICE-BOUND EXPEDITION</p>
        <h1>PARTY NIGHT</h1>
        <p className="subtitle">네 명의 모험가, 한 번의 주사위.</p>
        <div className="menu-actions">
          <button className="primary" onClick={() => dispatch({ type: state.profile ? 'LOAD_PROFILE' : 'OPEN_PROFILE_CREATE' })}>{state.profile ? '이어하기' : '새 게임'}</button>
          {state.profile && <button className="danger" onClick={() => dispatch({ type: 'RESET_PROFILE' })}>저장 초기화</button>}
        </div>
      </main>
    )
  }

  const update = <K extends keyof MainCharacterConfig>(key: K, value: MainCharacterConfig[K]) => setConfig((current) => ({ ...current, [key]: value }))
  const valid = config.name.trim().length >= 1 && config.name.trim().length <= 12
  return (
    <main className="menu-screen setup-screen">
      <header className="setup-header">
        <div><p className="eyebrow">ADVENTURER REGISTRY</p><h1>프로필 생성</h1></div>
        <div className="wallet">START G 300</div>
      </header>
      <div className="setup-grid">
        <section className="card character-form">
          <h2>메인 캐릭터</h2>
          <label>이름<input value={config.name} maxLength={12} onChange={(event) => update('name', event.target.value)} placeholder="1~12자" /></label>
          <label>종족<select value={config.raceId} onChange={(event) => update('raceId', event.target.value as RaceId)}>{Object.entries(RACE_DATA).map(([id, data]) => <option key={id} value={id}>{data.name}</option>)}</select></label>
          <label>직업<select value={config.classId} onChange={(event) => update('classId', event.target.value as ClassId)}>{Object.entries(CLASS_DATA).map(([id, data]) => <option key={id} value={id}>{data.name}</option>)}</select></label>
          <label>성별<select value={config.gender} onChange={(event) => update('gender', event.target.value as Gender)}><option>남성</option><option>여성</option></select></label>
        </section>
        <section className="card party-preview">
          <h2>고정 파티</h2>
          <PartyRow slot="01 / 전열" name={config.name.trim() || '이름 없음'} raceId={config.raceId} classId={config.classId} />
          <PartyRow slot="02 / 전열" name="브람" raceId="human" classId="warrior" />
          <PartyRow slot="03 / 후열" name="세라" raceId="human" classId="priest" />
          <PartyRow slot="04 / 후열" name="로웬" raceId="human" classId="archer" />
        </section>
      </div>
      <button className="primary quest-button" disabled={!valid} onClick={() => {
        const createdAt = Date.now()
        const words = new Uint32Array(1)
        const rootSeed = typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
          ? crypto.getRandomValues(words)[0]
          : 0x6d2b79f5
        dispatch({ type: 'CREATE_PROFILE', mainCharacterConfig: config, profileId: `profile_${createdAt.toString(36)}_${rootSeed.toString(36)}`, createdAt, rootSeed })
      }}>프로필 생성</button>
    </main>
  )
}

function PartyRow({ slot, name, raceId, classId }: { slot: string; name: string; raceId: RaceId; classId: ClassId }) {
  const classData = CLASS_DATA[classId]
  const attributes = combineAttributes(RACE_DATA[raceId].baseAttributes, classData.attributeModifiers)
  const stats = deriveCombatStats(attributes, classData.derivation)
  return (
    <div className="party-row">
      <span className="slot">{slot}</span><strong>{name}</strong><span>{classData.name}</span>
      <small>STR {attributes.str} · DEX {attributes.dex} · INT {attributes.int} · CON {attributes.con} · AGI {attributes.agi} · LUK {attributes.luck}</small>
      <small>HP {stats.maxHp} · ATK {stats.atk} · DEF {stats.def} · 전투 AGI {stats.agi}</small>
    </div>
  )
}
