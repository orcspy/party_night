import { useLayoutEffect, useRef } from 'react'
import type { GameState } from '../game/types'
import { getMapDefinition } from '../game/content'
import { getDirectionDisplayName } from '../game/displayNames'

export function GameHud({ state }: { state: GameState }) {
  const session = state.session
  const logViewport = useRef<HTMLDivElement>(null)
  const followLatest = useRef(true)
  useLayoutEffect(() => {
    const viewport = logViewport.current
    if (viewport && followLatest.current) viewport.scrollTop = viewport.scrollHeight
  }, [session?.logs.length])
  if (!session) return null
  const combatParty = session.combat?.participants.filter((actor) => actor.side === 'party')
  const party = combatParty ?? session.party
  return (
    <>
      <header className="hud-header">
        <span>{state.screen === 'battle' ? `BATTLE / ROUND ${session.combat?.round}` : getMapDefinition(session.exploration.mapId).name}</span>
        {state.screen === 'exploration' && <b>{session.exploration.x},{session.exploration.y} / {getDirectionDisplayName(session.exploration.direction)}</b>}
      </header>
      <section className="party-status">
        {party.map((actor) => {
          const combat = session.combat
          const statuses = combat ? [
            (combat.bleedStacksByActor?.[actor.id] ?? 0) > 0 ? `출혈 ${combat.bleedStacksByActor?.[actor.id]}` : '',
            (combat.stunnedActionsByActor[actor.id] ?? 0) > 0 ? '기절' : '',
            (combat.paralyzedActionsByActor?.[actor.id] ?? 0) > 0 ? '마비' : '',
            combat.sleepingByActor?.[actor.id] ? '수면' : '', combat.neurotoxinsByActor?.[actor.id] ? '신경독' : '',
            combat.attributeChangesByActor?.[actor.id] ? '능력 변화' : '', combat.sacredRageByActor?.[actor.id] ? '신성한 분노' : '',
          ].filter(Boolean) : []
          const resource = combat?.resourcesByActor?.[actor.id]
          return <div className={`actor-hp ${actor.currentHp <= 0 ? 'down' : ''}`} key={actor.id}><span><b>{actor.name}</b><small>{statuses.join(' · ') || (actor.row === 'front' ? '전열' : '후열')}{resource && (resource.holyPower > 0 || resource.mana > 0) ? ` · 성력 ${resource.holyPower} / 마력 ${resource.mana}` : ''}</small></span><meter min="0" max={actor.maxHp} value={actor.currentHp} /><em>{actor.currentHp}/{actor.maxHp}</em></div>
        })}
      </section>
      {session.combat && <section className="battle-status" aria-label="적 상태">{session.combat.participants.filter((actor) => actor.side === 'enemy' && actor.currentHp > 0).map((actor) => {
        const combat = session.combat!
        const statuses = [(combat.bleedStacksByActor?.[actor.id] ?? 0) > 0 ? `출혈 ${combat.bleedStacksByActor?.[actor.id]}` : '', combat.sleepingByActor?.[actor.id] ? '수면' : '', combat.neurotoxinsByActor?.[actor.id] ? '신경독' : '', combat.exposedByActor?.[actor.id] ? `약점 +${combat.exposedByActor[actor.id].bonusDamage}` : '', (combat.stunnedActionsByActor[actor.id] ?? 0) > 0 ? '기절' : '', (combat.paralyzedActionsByActor?.[actor.id] ?? 0) > 0 ? '마비' : ''].filter(Boolean)
        return statuses.length > 0 ? <small key={actor.id}>{actor.name}: {statuses.join(' · ')}</small> : null
      })}</section>}
      <section className="log-box" aria-label="게임 로그">
        <h2>LOG</h2>
        <div className="log-viewport" ref={logViewport} onScroll={(event) => { const element = event.currentTarget; followLatest.current = element.scrollHeight - element.scrollTop - element.clientHeight <= 16 }}>{session.logs.map((log, index) => <p data-kind={log.kind} key={`${index}-${log.eventType}-${log.message}`}>{log.message}</p>)}</div>
      </section>
    </>
  )
}
