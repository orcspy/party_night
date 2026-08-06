import { useState } from 'react'
import { CLASS_DATA, RACES } from '../game/content'
import type { ClassId, GameCommand, GameState, MainCharacterConfig, RaceId } from '../game/types'

interface Props {
  state: GameState
  dispatch: (command: GameCommand) => void
}

export function SetupScreen({ state, dispatch }: Props) {
  const [config, setConfig] = useState<MainCharacterConfig>(state.profile.mainCharacterConfig)
  if (state.screen === 'start') {
    return (
      <main className="menu-screen start-screen">
        <div className="title-mark">PN</div>
        <p className="eyebrow">DICE-BOUND EXPEDITION</p>
        <h1>PARTY NIGHT</h1>
        <p className="subtitle">네 명의 모험가, 한 번의 주사위.</p>
        <div className="menu-actions">
          <button className="primary" onClick={() => dispatch({ type: state.hasSave ? 'LOAD_PROFILE' : 'OPEN_SETUP' })}>{state.hasSave ? '이어하기' : '새 게임'}</button>
          {state.hasSave && <button className="danger" onClick={() => dispatch({ type: 'RESET_PROFILE' })}>저장 초기화</button>}
        </div>
      </main>
    )
  }

  const update = <K extends keyof MainCharacterConfig>(key: K, value: MainCharacterConfig[K]) => setConfig((current) => ({ ...current, [key]: value }))
  const valid = config.name.trim().length >= 1 && config.name.trim().length <= 12
  return (
    <main className="menu-screen setup-screen">
      <header className="setup-header">
        <div><p className="eyebrow">EXPEDITION DESK</p><h1>파티 준비</h1></div>
        <div className="wallet">G {state.profile.totalGold} <span>EXP {state.profile.totalExperience}</span></div>
      </header>
      <div className="setup-grid">
        <section className="card character-form">
          <h2>메인 캐릭터</h2>
          <label>이름<input value={config.name} maxLength={12} onChange={(event) => update('name', event.target.value)} placeholder="1~12자" /></label>
          <label>종족<select value={config.raceId} onChange={(event) => update('raceId', event.target.value as RaceId)}>{Object.entries(RACES).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          <label>직업<select value={config.classId} onChange={(event) => update('classId', event.target.value as ClassId)}>{Object.entries(CLASS_DATA).map(([id, data]) => <option key={id} value={id}>{data.name}</option>)}</select></label>
          <label>성별<select value={config.gender} onChange={(event) => update('gender', event.target.value)}><option>남성</option><option>여성</option><option>기타</option></select></label>
        </section>
        <section className="card party-preview">
          <h2>고정 파티</h2>
          <PartyRow slot="01 / 전열" name={config.name.trim() || '이름 없음'} classId={config.classId} />
          <PartyRow slot="02 / 전열" name="브람" classId="warrior" />
          <PartyRow slot="03 / 후열" name="세라" classId="priest" />
          <PartyRow slot="04 / 후열" name="로웬" classId="archer" />
        </section>
      </div>
      <button className="primary quest-button" disabled={!valid} onClick={() => dispatch({ type: 'START_QUEST', mainCharacterConfig: config })}>훈련 폐허 입장</button>
    </main>
  )
}

function PartyRow({ slot, name, classId }: { slot: string; name: string; classId: ClassId }) {
  const stats = CLASS_DATA[classId]
  return <div className="party-row"><span className="slot">{slot}</span><strong>{name}</strong><span>{stats.name}</span><small>HP {stats.hp} · ATK {stats.atk} · DEF {stats.def} · AGI {stats.agi}</small></div>
}
