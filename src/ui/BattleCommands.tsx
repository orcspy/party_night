import { useState } from 'react'
import { SKILLS } from '../game/content'
import { ITEM_DATA } from '../game/content'
import { getItemDisplayName } from '../game/displayNames'
import { currentActor, getSkillAvailability } from '../game/combat'
import type { GameCommand, GameState, ItemId } from '../game/types'

export function BattleCommands({ state, dispatch }: { state: GameState; dispatch: (command: GameCommand) => void }) {
  const [selectedItemStackId, setSelectedItemStackId] = useState<string | null>(null)
  const combat = state.session?.combat
  if (!combat) return null
  const actor = currentActor(combat)
  if (!actor || actor.side !== 'party') return <section className="commands"><h2>적 행동 중</h2></section>
  const activeSkills = actor.skillIds.map((id) => SKILLS[id]).filter((skill) => skill?.activation === 'active')
  const inventory = state.profile?.characters.find((character) => character.characterId === actor.id)?.inventorySlots ?? []
  const battleItems = inventory.filter((stack) => ITEM_DATA[stack.itemId as ItemId]?.usableIn.includes('battle'))
  const selectedStack = battleItems.find((stack) => stack.stackId === selectedItemStackId)
  const selectedItem = selectedStack ? ITEM_DATA[selectedStack.itemId as ItemId] : undefined
  if (combat.phase === 'awaiting_action' && selectedStack && selectedItem) {
    const targets = selectedItem.targetMode === 'single_enemy'
      ? combat.participants.filter((target) => target.side === 'enemy' && target.currentHp > 0)
      : combat.participants.filter((target) => target.side === 'party' && target.currentHp > 0)
    return <section className="commands"><h2>{getItemDisplayName(selectedStack.itemId)} 대상</h2><div className="command-grid">{targets.map((target) => <button key={target.id} onClick={() => { dispatch({ type: 'USE_ITEM', characterId: actor.id, stackId: selectedStack.stackId, targetId: target.id }); setSelectedItemStackId(null) }}>{target.name}<small>HP {target.currentHp}/{target.maxHp}</small></button>)}</div><button className="cancel-selection" onClick={() => setSelectedItemStackId(null)}>아이템 선택 취소</button></section>
  }
  if (combat.phase === 'awaiting_action') return (
    <section className="commands">
      <h2>{actor.name} / 스킬</h2>
      <div className="command-grid">{activeSkills.map((skill) => {
        const availability = getSkillAvailability(combat, actor.id, skill.id)
        return <button key={skill.id} disabled={!availability.available} onClick={() => dispatch({ type: 'SELECT_SKILL', skillId: skill.id })}>{skill.name}<small>{availability.remainingCooldown > 0 ? `쿨다운 ${availability.remainingCooldown}` : skill.resolution === 'taunt' ? '모든 적 도발' : `${skill.diceCount}d6 ${skill.fixedModifier ? `${skill.fixedModifier > 0 ? '+' : ''}${skill.fixedModifier}` : ''}`}</small></button>
      })}</div>
      {battleItems.length > 0 && <><h2 className="item-heading">아이템</h2><div className="command-grid">{battleItems.map((stack) => {
        const item = ITEM_DATA[stack.itemId as ItemId]
        const useSelf = item.targetMode === 'self'
        return <button key={stack.stackId} onClick={() => useSelf ? dispatch({ type: 'USE_ITEM', characterId: actor.id, stackId: stack.stackId, targetId: actor.id }) : setSelectedItemStackId(stack.stackId)}>{getItemDisplayName(stack.itemId)}<small>{stack.quantity}개 · {item.turnCost === 'free' ? '행동 무료' : '행동 소비'}</small></button>
      })}</div></>}
    </section>
  )
  if (combat.phase === 'awaiting_target') return (
    <section className="commands">
      <h2>{combat.selectedSkillId && ['single_ally', 'self'].includes(SKILLS[combat.selectedSkillId]?.targetMode) ? '회복 대상' : '공격 대상'}</h2>
      <div className="command-grid">{combat.participants.filter((target) => {
        const mode = combat.selectedSkillId ? SKILLS[combat.selectedSkillId]?.targetMode : 'single_enemy'
        return target.currentHp > 0 && (mode === 'self' ? target.id === actor.id : target.side === (mode === 'single_ally' ? 'party' : 'enemy'))
      }).map((target) => <button key={target.id} onClick={() => dispatch({ type: 'SELECT_TARGET', targetId: target.id })}>{target.name}<small>HP {target.currentHp}/{target.maxHp}</small></button>)}</div>
      <button className="cancel-selection" onClick={() => dispatch({ type: 'CANCEL_SKILL_SELECTION' })}>스킬 선택으로</button>
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
