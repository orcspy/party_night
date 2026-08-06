import type { GameState } from '../game/types'

export function GameHud({ state }: { state: GameState }) {
  const session = state.session
  if (!session) return null
  const combatParty = session.combat?.participants.filter((actor) => actor.side === 'party')
  const party = combatParty ?? session.party
  return (
    <>
      <header className="hud-header">
        <span>{state.screen === 'battle' ? `BATTLE / ROUND ${session.combat?.round}` : 'TRAINING RUINS'}</span>
        {state.screen === 'exploration' && <b>{session.exploration.x},{session.exploration.y} / {session.exploration.direction.toUpperCase()}</b>}
      </header>
      <section className="party-status">
        {party.map((actor) => <div className={`actor-hp ${actor.currentHp <= 0 ? 'down' : ''}`} key={actor.id}><span><b>{actor.name}</b><small>{actor.row === 'front' ? '전열' : '후열'}</small></span><meter min="0" max={actor.maxHp} value={actor.currentHp} /><em>{actor.currentHp}/{actor.maxHp}</em></div>)}
      </section>
      <section className="log-box" aria-label="게임 로그">
        <h2>LOG</h2>
        <div>{session.logs.slice(-7).reverse().map((log, index) => <p key={`${session.logs.length - index}-${log}`}>{log}</p>)}</div>
      </section>
    </>
  )
}
