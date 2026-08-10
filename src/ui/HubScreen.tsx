import { useState } from 'react'
import { getQuestDisplayName } from '../game/displayNames'
import { usedStorageSlots } from '../game/inventory'
import type { GameCommand, GameEvent, GameState } from '../game/types'
import { CharacterPanel } from './CharacterPanel'
import { FullscreenToggle } from './FullscreenToggle'
import { ShopPanel } from './ShopPanel'
import { StoragePanel } from './StoragePanel'

type HubTab = 'quest' | 'storage' | 'characters' | 'shop'

const TAB_LABELS: Record<HubTab, string> = {
  quest: '퀘스트',
  storage: '창고',
  characters: '캐릭터',
  shop: '상점',
}

export function HubScreen({ state, dispatch }: { state: GameState; dispatch: (command: GameCommand) => GameEvent[] }) {
  const [tab, setTab] = useState<HubTab>('quest')
  const [message, setMessage] = useState('')
  const profile = state.profile
  if (!profile) return null
  const usedStorage = usedStorageSlots(profile)
  const averageLevel = profile.characters.reduce((sum, character) => sum + character.level, 0) / profile.characters.length
  const send = (command: GameCommand) => {
    const events = dispatch(command)
    setMessage(events.at(-1)?.message ?? '')
    return events
  }

  return (
    <main className="menu-screen hub-screen">
      <header className="hub-header">
        <div><p className="eyebrow">PARTY BASE</p><h1>거점</h1></div>
        <div className="screen-tools"><div className="hub-summary"><b>G {profile.gold}</b><span>창고 {usedStorage}/100</span><span>평균 Lv {averageLevel.toFixed(1)}</span></div><FullscreenToggle /></div>
      </header>
      <nav className="hub-tabs" aria-label="거점 메뉴">
        {(Object.keys(TAB_LABELS) as HubTab[]).map((id) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{TAB_LABELS[id]}</button>)}
      </nav>
      <section className="card hub-panel">
        {message && <p className="hub-message" role="status">{message}</p>}
        {tab === 'quest' && <QuestTab state={state} dispatch={send} onReturnToStorage={() => { send({ type: 'RETURN_TO_STORAGE' }); setTab('storage') }} />}
        {tab === 'storage' && <StoragePanel profile={profile} dispatch={send} />}
        {tab === 'characters' && <CharacterPanel profile={profile} dispatch={send} />}
        {tab === 'shop' && <ShopPanel profile={profile} dispatch={send} />}
      </section>
      <button className="danger hub-reset" onClick={() => send({ type: 'RESET_PROFILE' })}>프로필 초기화</button>
    </main>
  )
}

function QuestTab({ state, dispatch, onReturnToStorage }: { state: GameState; dispatch: (command: GameCommand) => void; onReturnToStorage: () => void }) {
  const completed = state.profile?.questProgress.completedQuestIds.includes('training_ruins_quest') ?? false
  const goblinDenUnlocked = state.profile?.questProgress.unlockedQuestIds.includes('goblin_den_quest') ?? false
  const goblinDenCompleted = state.profile?.questProgress.completedQuestIds.includes('goblin_den_quest') ?? false
  const ancientUnlocked = state.profile?.questProgress.unlockedQuestIds.includes('ancient_site_quest') ?? false
  const dungeonUnlocked = state.profile?.questProgress.unlockedQuestIds.includes('underground_dungeon_quest') ?? false
  const dungeonCompleted = state.profile?.questProgress.completedQuestIds.includes('underground_dungeon_quest') ?? false
  const castleUnlocked = state.profile?.questProgress.unlockedQuestIds.includes('old_castle_quest') ?? false
  const castleCompleted = state.profile?.questProgress.completedQuestIds.includes('old_castle_quest') ?? false
  if (state.pendingQuestEntry) {
    const freeSlots = Math.max(0, (state.profile?.storage.capacity ?? 100) - usedStorageSlots(state.profile!))
    return (
      <section className="quest-entry-warning" role="dialog" aria-labelledby="quest-entry-warning-title" aria-modal="true">
        <h2 id="quest-entry-warning-title">창고 공간 경고</h2>
        <p>{getQuestDisplayName(state.pendingQuestEntry)} 입장 전 창고 빈칸이 {freeSlots}칸 남았습니다. 보상 일부를 포기할 수 있습니다.</p>
        <div><button className="primary" onClick={() => dispatch({ type: 'CONTINUE_QUEST_ENTRY', questId: state.pendingQuestEntry! })}>계속 진입</button><button onClick={onReturnToStorage}>창고로 돌아가기</button></div>
      </section>
    )
  }
  return (
    <div className="management-list">
      <article><span><p className="eyebrow">QUEST 01</p><b>훈련 폐허</b><small>{completed ? '완료 · 3개 필수 조우 승리' : '고블린 3개 파티와 순차 조우'}</small></span>{!completed && <button className="primary" onClick={() => dispatch({ type: 'REQUEST_QUEST_ENTRY', questId: 'training_ruins_quest' })}>입장</button>}</article>
      <article><span><p className="eyebrow">QUEST 02</p><b>고블린 소굴</b><small>{goblinDenCompleted ? '완료 · 홉고블린 격파' : goblinDenUnlocked ? '함정·비밀문·보스 조우' : '훈련 폐허 완료 시 해금'}</small></span>{goblinDenUnlocked && !goblinDenCompleted ? <button className="primary" onClick={() => dispatch({ type: 'REQUEST_QUEST_ENTRY', questId: 'goblin_den_quest' })}>입장</button> : <button disabled>{goblinDenCompleted ? '완료' : '잠김'}</button>}</article>
      <article><span><p className="eyebrow">QUEST 03</p><b>유적지</b><small>{state.profile?.questProgress.completedQuestIds.includes('ancient_site_quest') ? '완료 · 오우거 격파' : ancientUnlocked ? '오크·오우거·비밀방 탐사' : '고블린 소굴 완료 시 해금'}</small></span>{ancientUnlocked && !state.profile?.questProgress.completedQuestIds.includes('ancient_site_quest') ? <button className="primary" onClick={() => dispatch({ type: 'REQUEST_QUEST_ENTRY', questId: 'ancient_site_quest' })}>입장</button> : <button disabled>{state.profile?.questProgress.completedQuestIds.includes('ancient_site_quest') ? '완료' : '잠김'}</button>}</article>
      <article><span><p className="eyebrow">QUEST 04</p><b>지하 던전</b><small>{dungeonCompleted ? '완료 · 미노타우르스 격파' : dungeonUnlocked ? '5개 순차 조우 · 상태 이상 전투' : '유적지 완료 시 해금'}</small></span>{dungeonUnlocked && !dungeonCompleted ? <button className="primary" onClick={() => dispatch({ type: 'REQUEST_QUEST_ENTRY', questId: 'underground_dungeon_quest' })}>입장</button> : <button disabled>{dungeonCompleted ? '완료' : '잠김'}</button>}</article>
      <article><span><p className="eyebrow">QUEST 05</p><b>옛 고성</b><small>{castleCompleted ? '완료 · 리치 격파' : castleUnlocked ? '언데드 5개 순차 조우' : '지하 던전 완료 시 해금'}</small></span>{castleUnlocked && !castleCompleted ? <button className="primary" onClick={() => dispatch({ type: 'REQUEST_QUEST_ENTRY', questId: 'old_castle_quest' })}>입장</button> : <button disabled>{castleCompleted ? '완료' : '잠김'}</button>}</article>
      {castleCompleted && <article><span><p className="eyebrow">REPEAT QUEST</p><b>화산 동굴</b><small>완료 {state.profile?.questProgress.repeatCompletionCounts.volcanic_cave_quest ?? 0}회 · 사이클롭스 격파</small></span><button className="primary" onClick={() => dispatch({ type: 'REQUEST_QUEST_ENTRY', questId: 'volcanic_cave_quest' })}>입장</button></article>}
      {castleCompleted && <article><span><p className="eyebrow">REPEAT QUEST</p><b>깊은 숲 폐허</b><small>완료 {state.profile?.questProgress.repeatCompletionCounts.deep_forest_ruins_quest ?? 0}회 · 스켈레톤 킹 격파</small></span><button className="primary" onClick={() => dispatch({ type: 'REQUEST_QUEST_ENTRY', questId: 'deep_forest_ruins_quest' })}>입장</button></article>}
    </div>
  )
}
