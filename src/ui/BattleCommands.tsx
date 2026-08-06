import { SKILLS } from '../game/content'
import { currentActor } from '../game/combat'
import type { GameCommand, GameState } from '../game/types'

export function BattleCommands({ state, dispatch }: { state: GameState; dispatch: (command: GameCommand) => void }) {
  const combat = state.session?.combat
  if (!combat) return null
  const actor = currentActor(combat)
  if (!actor || actor.side !== 'party') return <section className="commands"><h2>적 행동 중</h2></section>
  const used = combat.usedSkillIdsByActor[actor.id] ?? []
  if (combat.phase === 'awaiting_action') return (
    <section className="commands">
      <h2>{actor.name} / 스킬</h2>
      <div className="command-grid">{actor.skillIds.map((id) => <button key={id} disabled={SKILLS[id].oncePerBattle && used.includes(id)} onClick={() => dispatch({ type: 'SELECT_SKILL', skillId: id })}>{SKILLS[id].name}<small>{SKILLS[id].diceCount}d6 {SKILLS[id].fixedModifier ? `+${SKILLS[id].fixedModifier}` : ''}</small></button>)}</div>
    </section>
  )
  if (combat.phase === 'awaiting_target') return (
    <section className="commands">
      <h2>공격 대상</h2>
      <div className="command-grid">{combat.participants.filter((target) => target.side === 'enemy' && target.currentHp > 0).map((target) => <button key={target.id} onClick={() => dispatch({ type: 'SELECT_TARGET', targetId: target.id })}>{target.name}<small>HP {target.currentHp}/{target.maxHp}</small></button>)}</div>
    </section>
  )
  if (combat.phase === 'awaiting_reroll' && combat.pendingRoll) return (
    <section className="commands reroll-panel">
      <h2>리롤할 다이스 선택</h2>
      <div className="dice-buttons">{combat.pendingRoll.dice.map((die, index) => <button key={index} disabled={die.rerolled} onClick={() => dispatch({ type: 'REROLL_DIE', dieIndex: index })}>{die.value}</button>)}</div>
      <button className="skip" onClick={() => dispatch({ type: 'SKIP_REROLL' })}>결과 확정</button>
    </section>
  )
  return <section className="commands"><h2>판정 중...</h2></section>
}
