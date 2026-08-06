import { describe, expect, it } from 'vitest'
import { advanceToPlayer, calculateDamage, determineTurnOrder, evaluateOutcome, rerollDie, selectSkill, selectTarget, sortTurnOrder, startCombat } from '../game/combat'
import { createEnemies, createParty } from '../game/content'
import type { Actor, CombatState } from '../game/types'

const main = { name: '테스터', raceId: 'human' as const, classId: 'rogue' as const, gender: '기타' }

describe('combat rules', () => {
  it('orders by AGI and deterministically breaks ties', () => {
    const actors = [...createParty(main), ...createEnemies()]
    const first = determineTurnOrder(actors, 55)
    expect(first.order[0]).toBe('party_main')
    expect(determineTurnOrder(actors, 55)).toEqual(first)
  })

  it('falls back to instance ID when AGI and tie values match', () => {
    const actors = createEnemies().map((actor) => ({ ...actor, agi: 3 })).reverse()
    const ties = new Map(actors.map((actor) => [actor.id, 10]))
    expect(sortTurnOrder(actors, ties)).toEqual(['enemy_goblin_guard', 'enemy_goblin_scout'])
  })

  it('always deals at least one damage', () => {
    expect(calculateDamage(2, 1, 999)).toBe(1)
  })

  it('rerolls only the selected die and cannot reroll it twice', () => {
    const party = createParty(main)
    const started = startCombat(party, createEnemies(), 123)
    const archer = started.combat.participants.find((actor) => actor.id === 'party_archer')!
    const enemy = started.combat.participants.find((actor) => actor.side === 'enemy')!
    const combat: CombatState = { ...started.combat, turnOrder: [archer.id], turnIndex: 0, phase: 'awaiting_action' }
    const selected = selectSkill(combat, 'aimed_shot', started.rngState)
    const rolled = selectTarget(selected.combat, enemy.id, selected.rngState)
    const before = rolled.combat.pendingRoll!.dice.map((die) => die.value)
    const rerolled = rerollDie(rolled.combat, 1, rolled.rngState)
    const rerollEvent = rerolled.events.find((event) => event.type === 'DIE_REROLLED')
    expect(rerollEvent?.message).toContain('다이스 2')
    expect(rerolled.events.find((event) => event.type === 'DAMAGE_APPLIED')?.message).toContain(`[${before.join(', ')}]`)
    expect(rerollDie(rolled.combat, 1, rerolled.rngState).events[0].type).toBe('DIE_REROLLED')
    const alreadyRerolled = { ...rolled.combat, pendingRoll: { ...rolled.combat.pendingRoll!, dice: rolled.combat.pendingRoll!.dice.map((die, index) => index === 1 ? { ...die, rerolled: true } : die) } }
    expect(rerollDie(alreadyRerolled, 1, rolled.rngState).events[0].type).toBe('COMMAND_REJECTED')
  })

  it('rejects a once-per-battle skill already used by that actor', () => {
    const started = startCombat(createParty(main), createEnemies(), 5)
    const actor = started.combat.participants.find((item) => item.id === 'party_main')!
    const combat = { ...started.combat, turnOrder: [actor.id], turnIndex: 0, phase: 'awaiting_action' as const, usedSkillIdsByActor: { [actor.id]: ['quick_stab'] } }
    expect(selectSkill(combat, 'quick_stab', started.rngState).events[0].type).toBe('COMMAND_REJECTED')
  })

  it('skips defeated actors and never selects them as AI targets', () => {
    const party = createParty(main).map((actor, index) => ({ ...actor, currentHp: index === 0 ? 0 : actor.currentHp }))
    const enemy = createEnemies()[0]
    const participants: Actor[] = [party[0], enemy, ...party.slice(1)]
    const combat: CombatState = { battleId: 'test', round: 1, phase: 'awaiting_action', participants, turnOrder: [party[0].id, enemy.id, ...party.slice(1).map((actor) => actor.id)], turnIndex: 0, selectedSkillId: null, pendingRoll: null, usedSkillIdsByActor: {}, outcome: null }
    const result = advanceToPlayer(combat, 88)
    expect(result.events.some((event) => event.message.startsWith(`${party[0].name}의`))).toBe(false)
    expect(result.combat.participants.find((actor) => actor.id === party[0].id)?.currentHp).toBe(0)
  })

  it('detects enemy and party defeat', () => {
    const party = createParty(main)
    const enemies = createEnemies()
    expect(evaluateOutcome([...party, ...enemies.map((actor) => ({ ...actor, currentHp: 0 }))])).toBe('won')
    expect(evaluateOutcome([...party.map((actor) => ({ ...actor, currentHp: 0 })), ...enemies])).toBe('lost')
  })

  it('reproduces AI target selection with the same seed', () => {
    const party = createParty(main)
    const enemy = createEnemies()[0]
    const combat: CombatState = { battleId: 'test', round: 1, phase: 'awaiting_action', participants: [...party, enemy], turnOrder: [enemy.id, ...party.map((actor) => actor.id)], turnIndex: 0, selectedSkillId: null, pendingRoll: null, usedSkillIdsByActor: {}, outcome: null }
    const first = advanceToPlayer(combat, 999)
    const second = advanceToPlayer(combat, 999)
    expect(first.combat.participants.map((actor) => actor.currentHp)).toEqual(second.combat.participants.map((actor) => actor.currentHp))
    expect(first.events).toEqual(second.events)
  })
})
