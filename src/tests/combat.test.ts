import { describe, expect, it } from 'vitest'
import { advanceToPlayer, calculateDamage, cancelSkillSelection, determineTurnOrder, evaluateOutcome, rerollDie, selectSkill, selectTarget, sortTurnOrder, startCombat, useCombatItem } from '../game/combat'
import { createEncounterEnemies, createEnemies, createParty } from '../game/content'
import type { Actor, CombatState } from '../game/types'

const main = { name: '테스터', raceId: 'halfling' as const, classId: 'rogue' as const, gender: '남성' as const }

function actor(id: string, side: Actor['side'], agi: number, skillIds: string[] = ['basic_attack']): Actor {
  return { id, contentId: id, name: id, side, maxHp: 999, currentHp: 999, atk: 5, def: 1, agi, skillIds }
}

describe('combat rules', () => {
  it('orders by AGI and deterministically breaks ties', () => {
    const actors = [...createParty(main), ...createEnemies()]
    const first = determineTurnOrder(actors, 55)
    expect(first.order[0]).toBe('party_archer')
    expect(determineTurnOrder(actors, 55)).toEqual(first)
  })

  it('falls back to instance ID when AGI and tie values match', () => {
    const actors = createEnemies().map((actor) => ({ ...actor, agi: 3 })).reverse()
    const ties = new Map(actors.map((actor) => [actor.id, 10]))
    expect(sortTurnOrder(actors, ties)).toEqual(['training_ruins_encounter_3_goblin_guard_1', 'training_ruins_encounter_3_goblin_scout_1'])
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
    const resolvedEvent = rerolled.events.find((event) => event.type === 'ROLL_RESOLVED')
    expect(rerollEvent?.message).toContain('다이스 2')
    expect(rerolled.events.find((event) => event.type === 'DAMAGE_APPLIED')?.message).toContain(`[${before.join(', ')}]`)
    expect(resolvedEvent).toMatchObject({ actorId: archer.id, targetId: enemy.id, skillId: 'aimed_shot', originalDice: before, resultKind: 'damage' })
    expect(resolvedEvent?.finalDice).toHaveLength(before.length)
    expect(rerollDie(rolled.combat, 1, rerolled.rngState).events[0].type).toBe('DIE_REROLLED')
    const alreadyRerolled = { ...rolled.combat, pendingRoll: { ...rolled.combat.pendingRoll!, dice: rolled.combat.pendingRoll!.dice.map((die, index) => index === 1 ? { ...die, rerolled: true } : die) } }
    expect(rerollDie(alreadyRerolled, 1, rolled.rngState).events[0].type).toBe('COMMAND_REJECTED')
  })

  it('decreases cooldown_2 from the use round and enables it again on round 3', () => {
    const started = startCombat(createParty(main), createEnemies(), 5)
    const actor = started.combat.participants.find((item) => item.id === 'party_main')!
    const enemy = { ...started.combat.participants.find((item) => item.side === 'enemy')!, currentHp: 999, maxHp: 999 }
    const combat: CombatState = { ...started.combat, participants: [actor, enemy], turnOrder: [actor.id], turnIndex: 0, phase: 'awaiting_action' }
    const selected = selectSkill(combat, 'quick_stab', started.rngState)
    const used = selectTarget(selected.combat, enemy.id, selected.rngState)
    expect(used.combat.round).toBe(2)
    expect(used.combat.cooldownsByActor[actor.id]?.quick_stab).toBe(1)
    expect(selectSkill(used.combat, 'quick_stab', used.rngState).events[0].type).toBe('COMMAND_REJECTED')
    const basic = selectSkill(used.combat, 'basic_attack', used.rngState)
    const advanced = selectTarget(basic.combat, enemy.id, basic.rngState)
    expect(advanced.combat.round).toBe(3)
    expect(advanced.combat.cooldownsByActor[actor.id]?.quick_stab).toBeUndefined()
    expect(selectSkill(advanced.combat, 'quick_stab', advanced.rngState).combat.phase).toBe('awaiting_target')
  })

  it('applies quick stab and neurotoxin to normal targets for every seed and caps repeated bleed', () => {
    const rogue = actor('rogue', 'party', 10, ['basic_attack', 'quick_stab', 'neurotoxin'])
    for (const seed of [1, 2, 3, 17, 99, 123456]) {
      const target = actor(`normal_${seed}`, 'enemy', 8)
      const started = startCombat([rogue], [target], seed)
      const ready: CombatState = { ...started.combat, participants: [rogue, target], turnOrder: [rogue.id], turnIndex: 0, phase: 'awaiting_action' }
      const stabbed = selectTarget(selectSkill(ready, 'quick_stab', seed).combat, target.id, seed)
      expect(stabbed.combat.bleedStacksByActor?.[target.id]).toBe(1)

      const poisoned = selectTarget(selectSkill(ready, 'neurotoxin', seed).combat, target.id, seed)
      expect(poisoned.combat.neurotoxinsByActor?.[target.id]).toEqual({ originalAgi: 8 })
      expect(poisoned.combat.participants.find((item) => item.id === target.id)?.agi).toBe(4)
      expect(poisoned.combat.bleedStacksByActor?.[target.id]).toBe(1)

      let repeated = poisoned.combat
      for (let count = 0; count < 6; count++) {
        repeated = { ...repeated, phase: 'awaiting_action', turnOrder: [rogue.id], turnIndex: 0, cooldownsByActor: {} }
        const selected = selectSkill(repeated, 'neurotoxin', seed + count + 1)
        repeated = selectTarget(selected.combat, target.id, selected.rngState).combat
      }
      expect(repeated.participants.find((item) => item.id === target.id)?.agi).toBe(4)
      expect(repeated.neurotoxinsByActor?.[target.id]).toEqual({ originalAgi: 8 })
      expect(repeated.bleedStacksByActor?.[target.id]).toBe(5)
    }
  })

  it('uses deterministic 50 percent boss resistance for rogue status skills', () => {
    const rogue = actor('rogue', 'party', 10, ['basic_attack', 'quick_stab', 'neurotoxin'])
    const run = (skillId: 'quick_stab' | 'neurotoxin', seed: number) => {
      const boss = { ...actor('boss', 'enemy', 8), isBoss: true }
      const started = startCombat([rogue], [boss], seed)
      const ready: CombatState = { ...started.combat, participants: [rogue, boss], turnOrder: [rogue.id], turnIndex: 0, phase: 'awaiting_action' }
      const selected = selectSkill(ready, skillId, seed)
      const result = selectTarget(selected.combat, boss.id, selected.rngState)
      return { applied: (result.combat.bleedStacksByActor?.[boss.id] ?? 0) > 0, result }
    }
    for (const skillId of ['quick_stab', 'neurotoxin'] as const) {
      const outcomes = new Set<boolean>()
      for (let seed = 1; seed <= 100; seed++) outcomes.add(run(skillId, seed).applied)
      expect(outcomes).toEqual(new Set([true, false]))
      expect(run(skillId, 42)).toEqual(run(skillId, 42))
    }
  })

  it('reorders only the unacted suffix after neurotoxin and fully reorders the next round', () => {
    const rogue = actor('rogue', 'party', 10, ['basic_attack', 'neurotoxin'])
    const ally = actor('ally', 'party', 6)
    const slowAlly = actor('slow_ally', 'party', 2)
    const target = actor('target', 'enemy', 8)
    const started = startCombat([rogue, ally, slowAlly], [target], 7)
    const ready: CombatState = { ...started.combat, participants: [rogue, ally, slowAlly, target], turnOrder: [rogue.id, target.id, ally.id, slowAlly.id], turnIndex: 0, phase: 'awaiting_action' }
    const poisoned = selectTarget(selectSkill(ready, 'neurotoxin', 7).combat, target.id, 7)
    expect(poisoned.combat.turnOrder).toEqual([rogue.id, ally.id, target.id, slowAlly.id])
    expect(poisoned.combat.turnIndex).toBe(1)

    const alreadyActed: CombatState = { ...ready, participants: [rogue, ally, target], turnOrder: [target.id, rogue.id, ally.id], turnIndex: 1 }
    const latePoison = selectTarget(selectSkill(alreadyActed, 'neurotoxin', 8).combat, target.id, 8)
    expect(latePoison.combat.turnOrder).toEqual([target.id, rogue.id, ally.id])
    expect(latePoison.combat.turnIndex).toBe(2)
    const allyAttack = selectSkill(latePoison.combat, 'basic_attack', latePoison.rngState)
    const wrapped = selectTarget(allyAttack.combat, target.id, allyAttack.rngState)
    expect(wrapped.combat.round).toBe(2)
    expect(wrapped.combat.turnOrder).toEqual([rogue.id, ally.id, target.id])
    expect(wrapped.combat.turnIndex).toBe(0)
  })

  it('preserves existing tie order and reorders the suffix when neurotoxin is removed', () => {
    const rogue = actor('rogue', 'party', 10, ['basic_attack', 'neurotoxin'])
    const equal = actor('equal', 'party', 4)
    const target = actor('target', 'enemy', 8)
    const started = startCombat([rogue, equal], [target], 9)
    const ready: CombatState = { ...started.combat, participants: [rogue, equal, target], turnOrder: [rogue.id, target.id, equal.id], turnIndex: 0, phase: 'awaiting_action' }
    const poisoned = selectTarget(selectSkill(ready, 'neurotoxin', 9).combat, target.id, 9)
    expect(poisoned.combat.turnOrder).toEqual([rogue.id, target.id, equal.id])

    const healer = actor('healer', 'party', 10)
    const restored = actor('restored', 'party', 2)
    const middle = actor('middle', 'party', 6)
    const enemy = actor('enemy', 'enemy', 1)
    const cleanse: CombatState = {
      ...started.combat, participants: [healer, restored, middle, enemy], turnOrder: [healer.id, middle.id, restored.id, enemy.id], turnIndex: 0, phase: 'awaiting_action',
      bleedStacksByActor: { [restored.id]: 1 }, neurotoxinsByActor: { [restored.id]: { originalAgi: 8 } }, removableStatusesByActor: { [restored.id]: ['bleed', 'neurotoxin'] },
    }
    const cured = useCombatItem(cleanse, healer.id, 'panacea', restored.id, 10)
    expect(cured.combat.participants.find((item) => item.id === restored.id)?.agi).toBe(8)
    expect(cured.combat.turnOrder).toEqual([healer.id, restored.id, middle.id, enemy.id])
    expect(cured.combat.turnIndex).toBe(1)
  })

  it('keeps exposure through target actions and removes it after the source next action or skip', () => {
    const archer = actor('archer', 'party', 10, ['basic_attack', 'find_leak', 'head_shot'])
    const ally = actor('ally', 'party', 5)
    const target = actor('target', 'enemy', 8)
    const started = startCombat([archer, ally], [target], 11)
    const ready: CombatState = { ...started.combat, participants: [archer, ally, target], turnOrder: [archer.id, target.id, ally.id], turnIndex: 0, phase: 'awaiting_action' }
    const exposed = selectTarget(selectSkill(ready, 'find_leak', 11).combat, target.id, 11)
    expect(exposed.combat.exposedByActor?.[target.id]).toMatchObject({ sourceActorId: archer.id, sourceActionsRemaining: 1, appliedRound: 1 })
    expect(exposed.combat.turnIndex).toBe(2)

    const headShotReady: CombatState = { ...exposed.combat, turnOrder: [archer.id], turnIndex: 0, phase: 'awaiting_action' }
    const headShot = selectTarget(selectSkill(headShotReady, 'head_shot', 12).combat, target.id, 12)
    expect(headShot.events.some((event) => event.type === 'ROLL_RESOLVED' && event.skillId === 'head_shot')).toBe(true)

    const nextActionReady: CombatState = { ...exposed.combat, turnOrder: [archer.id, ally.id], turnIndex: 0, phase: 'awaiting_action' }
    const nextAction = selectTarget(selectSkill(nextActionReady, 'basic_attack', 13).combat, target.id, 13)
    expect(nextAction.combat.exposedByActor?.[target.id]).toBeUndefined()
    expect(nextAction.events.some((event) => event.type === 'STATUS_REMOVED' && event.targetId === target.id)).toBe(true)
    const rejectedHeadShot = selectTarget(selectSkill({ ...nextAction.combat, turnOrder: [archer.id], turnIndex: 0, phase: 'awaiting_action' }, 'head_shot', 14).combat, target.id, 14)
    expect(rejectedHeadShot.events[0].type).toBe('COMMAND_REJECTED')

    for (const status of ['stun', 'paralysis', 'sleep'] as const) {
      const skipped: CombatState = {
        ...exposed.combat, turnOrder: [archer.id, ally.id], turnIndex: 0, phase: 'awaiting_action',
        stunnedActionsByActor: status === 'stun' ? { [archer.id]: 1 } : {},
        paralyzedActionsByActor: status === 'paralysis' ? { [archer.id]: 1 } : {},
        sleepingByActor: status === 'sleep' ? { [archer.id]: true } : {},
      }
      expect(advanceToPlayer(skipped, 15).combat.exposedByActor?.[target.id]).toBeUndefined()
    }
  })

  it('keeps exposure after source death until round wrap, including bleed death', () => {
    const archer = actor('archer', 'party', 10)
    const ally = actor('ally', 'party', 20)
    const target = actor('target', 'enemy', 1)
    const started = startCombat([archer, ally], [target], 16)
    const exposure = { [target.id]: { bonusDamage: 2, sourceActorId: archer.id, sourceActionsRemaining: 1, appliedRound: 1 } }
    const base: CombatState = { ...started.combat, participants: [archer, ally, target], exposedByActor: exposure, turnOrder: [archer.id, ally.id], turnIndex: 0, phase: 'awaiting_action' }

    for (const bleedDeath of [false, true]) {
      const dying: CombatState = {
        ...base,
        participants: base.participants.map((item) => item.id === archer.id ? { ...item, currentHp: bleedDeath ? 1 : 0 } : item),
        bleedStacksByActor: bleedDeath ? { [archer.id]: 1 } : {},
      }
      const afterDeath = advanceToPlayer(dying, 17)
      expect(afterDeath.combat.exposedByActor?.[target.id]).toBeDefined()
      expect(afterDeath.combat.turnIndex).toBe(1)
      const wrapped = selectTarget(selectSkill(afterDeath.combat, 'basic_attack', afterDeath.rngState).combat, target.id, afterDeath.rngState)
      expect(wrapped.combat.exposedByActor?.[target.id]).toBeUndefined()
      expect(wrapped.events.some((event) => event.type === 'STATUS_REMOVED' && event.targetId === target.id)).toBe(true)
    }
  })

  it('cancels target selection without changing RNG, turn, or participants', () => {
    const started = startCombat(createParty(main), createEnemies(), 15)
    const actor = started.combat.participants.find((item) => item.id === 'party_main')!
    const combat: CombatState = { ...started.combat, turnOrder: [actor.id], turnIndex: 0, phase: 'awaiting_action' }
    const selected = selectSkill(combat, 'quick_stab', started.rngState)
    const cancelled = cancelSkillSelection(selected.combat, selected.rngState)
    expect(cancelled.combat).toMatchObject({ phase: 'awaiting_action', selectedSkillId: null, turnIndex: 0, round: 1 })
    expect(cancelled.combat.participants).toBe(selected.combat.participants)
    expect(cancelled.rngState).toBe(selected.rngState)
  })

  it('rejects passive skills as commands and applies protection pledge to direct party damage', () => {
    const party = createParty(main)
    const priestIndex = party.findIndex((actor) => actor.id === 'party_priest')
    party[priestIndex] = { ...party[priestIndex], skillIds: [...party[priestIndex].skillIds, 'protection_pledge'] }
    const enemy = createEnemies()[0]
    const protectedCombat: CombatState = { battleId: 'test', round: 1, phase: 'awaiting_action', participants: [...party, enemy], turnOrder: [enemy.id, party[0].id], turnIndex: 0, selectedSkillId: null, pendingRoll: null, usedSkillIdsByActor: {}, cooldownsByActor: {}, tauntsByEnemy: {}, stunnedActionsByActor: {}, itemBuffsByActor: {}, outcome: null }
    expect(selectSkill({ ...protectedCombat, turnOrder: [party[priestIndex].id], turnIndex: 0 }, 'protection_pledge', 2).events[0].type).toBe('COMMAND_REJECTED')
    const unprotected = advanceToPlayer({ ...protectedCombat, participants: protectedCombat.participants.map((actor) => ({ ...actor, skillIds: actor.skillIds.filter((id) => id !== 'protection_pledge') })) }, 222)
    const protectedResult = advanceToPlayer(protectedCombat, 222)
    const damagedId = protectedResult.events.find((event) => event.type === 'ROLL_RESOLVED')?.targetId
    const protectedHp = protectedResult.combat.participants.find((actor) => actor.id === damagedId)!.currentHp
    const unprotectedHp = unprotected.combat.participants.find((actor) => actor.id === damagedId)!.currentHp
    expect(protectedHp).toBe(unprotectedHp + 1)
  })

  it('applies taunt to every enemy without an application roll and resolves the next attack at 50%', () => {
    const party = createParty({ ...main, classId: 'warrior' })
    const warrior = { ...party[0], skillIds: [...party[0].skillIds, 'taunt'] }
    const ally = party[1]
    const enemies = createEnemies()
    const combat: CombatState = { battleId: 'test', round: 1, phase: 'awaiting_action', participants: [warrior, ally, ...enemies], turnOrder: [warrior.id, ally.id, ...enemies.map((enemy) => enemy.id)], turnIndex: 0, selectedSkillId: null, pendingRoll: null, usedSkillIdsByActor: {}, cooldownsByActor: {}, tauntsByEnemy: {}, stunnedActionsByActor: {}, itemBuffsByActor: {}, outcome: null }
    const applied = selectSkill(combat, 'taunt', 777)
    expect(applied.rngState).toBe(777)
    expect(Object.keys(applied.combat.tauntsByEnemy)).toHaveLength(enemies.length)
    expect(applied.events.filter((event) => event.type === 'STATUS_APPLIED')).toHaveLength(enemies.length)
    expect(applied.combat.participants.map((actor) => actor.currentHp)).toEqual(combat.participants.map((actor) => actor.currentHp))
    const enemyTurn = { ...applied.combat, turnIndex: applied.combat.turnOrder.indexOf(enemies[0].id), phase: 'awaiting_action' as const }
    const first = advanceToPlayer(enemyTurn, 999)
    const second = advanceToPlayer(enemyTurn, 999)
    expect(first.events.find((event) => event.type === 'TAUNT_TARGET_RESOLVED')).toEqual(second.events.find((event) => event.type === 'TAUNT_TARGET_RESOLVED'))
    expect(first.combat.tauntsByEnemy[enemies[0].id]).toBeUndefined()
  })

  it('lets the priest target and heal a living ally', () => {
    const party = createParty(main).map((actor) => actor.id === 'party_priest' ? { ...actor, currentHp: 1 } : actor)
    const started = startCombat(party, createEnemies(), 17)
    const priest = started.combat.participants.find((actor) => actor.id === 'party_priest')!
    const combat: CombatState = { ...started.combat, turnOrder: [priest.id], turnIndex: 0, phase: 'awaiting_action' }
    const selected = selectSkill(combat, 'heal', started.rngState)
    const healed = selectTarget(selected.combat, priest.id, selected.rngState)
    expect(healed.events.some((event) => event.type === 'HEAL_APPLIED')).toBe(true)
    expect(healed.combat.participants.find((actor) => actor.id === priest.id)!.currentHp).toBeGreaterThan(1)
  })

  it('creates the approved hobgoblin boss encounter and battle ID', () => {
    const enemies = createEncounterEnemies('goblin_den_boss')
    expect(enemies).toHaveLength(1)
    expect(enemies[0]).toMatchObject({ contentId: 'hobgoblin_boss', maxHp: 68, atk: 5, def: 4, agi: 3, skillIds: ['commanding_strike'] })
    expect(startCombat(createParty(main), enemies, 1, 'goblin_den_boss').combat.battleId).toBe('goblin_den_boss')
  })

  it('skips defeated actors and never selects them as AI targets', () => {
    const party = createParty(main).map((actor, index) => ({ ...actor, currentHp: index === 0 ? 0 : actor.currentHp }))
    const enemy = createEnemies()[0]
    const participants: Actor[] = [party[0], enemy, ...party.slice(1)]
    const combat: CombatState = { battleId: 'test', round: 1, phase: 'awaiting_action', participants, turnOrder: [party[0].id, enemy.id, ...party.slice(1).map((actor) => actor.id)], turnIndex: 0, selectedSkillId: null, pendingRoll: null, usedSkillIdsByActor: {}, cooldownsByActor: {}, tauntsByEnemy: {}, stunnedActionsByActor: {}, itemBuffsByActor: {}, outcome: null }
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
    const combat: CombatState = { battleId: 'test', round: 1, phase: 'awaiting_action', participants: [...party, enemy], turnOrder: [enemy.id, ...party.map((actor) => actor.id)], turnIndex: 0, selectedSkillId: null, pendingRoll: null, usedSkillIdsByActor: {}, cooldownsByActor: {}, tauntsByEnemy: {}, stunnedActionsByActor: {}, itemBuffsByActor: {}, outcome: null }
    const first = advanceToPlayer(combat, 999)
    const second = advanceToPlayer(combat, 999)
    expect(first.combat.participants.map((actor) => actor.currentHp)).toEqual(second.combat.participants.map((actor) => actor.currentHp))
    expect(first.events).toEqual(second.events)
  })

  it('creates the approved ancient-site enemies and ogre skill', () => {
    const orcs = createEncounterEnemies('ancient_site_encounter_3')
    expect(orcs).toHaveLength(2)
    expect(orcs[0]).toMatchObject({ contentId: 'orc_raider', maxHp: 30, atk: 6, def: 3, agi: 3, skillIds: ['basic_attack'] })
    expect(createEncounterEnemies('ancient_site_boss')[0]).toMatchObject({ contentId: 'ogre', maxHp: 92, atk: 7, def: 5, agi: 1, skillIds: ['ogre_smash'] })
  })

  it('uses fixed-damage, healing, and free tonic items through the combat engine', () => {
    const party = createParty(main)
    const actor = party[0]
    const enemy = { ...createEnemies()[0], currentHp: 30, maxHp: 30, def: 999 }
    const combat = startCombat([actor], [enemy], 12).combat
    const ready: CombatState = { ...combat, turnOrder: [actor.id], turnIndex: 0, phase: 'awaiting_action' }
    const bombed = useCombatItem(ready, actor.id, 'fire_bomb', enemy.id, 77)
    expect(bombed.events.find((event) => event.type === 'DAMAGE_APPLIED')).toMatchObject({ damage: 10, itemId: 'fire_bomb' })
    expect(bombed.combat.participants.find((item) => item.id === enemy.id)?.currentHp).toBe(20)

    const hurt = { ...ready, participants: ready.participants.map((item) => item.id === actor.id ? { ...item, currentHp: 1 } : item) }
    const healed = useCombatItem(hurt, actor.id, 'greater_healing_potion', actor.id, 77)
    expect(healed.combat.participants.find((item) => item.id === actor.id)?.currentHp).toBe(Math.min(actor.maxHp, 23))

    const buffed = useCombatItem(ready, actor.id, 'might_tonic', actor.id, 77)
    expect(buffed.combat.turnIndex).toBe(0)
    expect(buffed.combat.itemBuffsByActor[actor.id]?.might?.remainingRounds).toBe(3)
    expect(useCombatItem(buffed.combat, actor.id, 'might_tonic', actor.id, 77).events[0].type).toBe('COMMAND_REJECTED')
  })

  it('reproduces ogre smash stun with a seeded 25 percent roll', () => {
    const party = [createParty(main)[0]]
    const ogre = createEncounterEnemies('ancient_site_boss')[0]
    const base = startCombat(party, [ogre], 1).combat
    const enemyTurn: CombatState = { ...base, participants: [...party.map((actor) => ({ ...actor, maxHp: 999, currentHp: 999 })), ogre], turnOrder: [ogre.id, party[0].id], turnIndex: 0, phase: 'awaiting_action' }
    let found: ReturnType<typeof advanceToPlayer> | null = null
    for (let seed = 1; seed < 100 && !found; seed++) {
      const result = advanceToPlayer(enemyTurn, seed)
      if (result.events.some((event) => event.type === 'STATUS_APPLIED')) found = result
    }
    expect(found?.events.some((event) => event.type === 'STATUS_APPLIED' && event.skillId === 'ogre_smash')).toBe(true)
  })
})
