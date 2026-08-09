import { describe, expect, it } from 'vitest'
import { isProfileV2 } from '../app/saveV2'
import { advanceToPlayer, getSkillAvailability, selectSkill, selectTarget, startCombat, useCombatItem } from '../game/combat'
import { createEncounterEnemies, createParty, getMapDefinition, SKILLS } from '../game/content'
import { createProfile, createInitialGameState, reduceGame } from '../game/gameEngine'
import { move, createExploration, isWall } from '../game/exploration'
import { settleAncientSite, settleGoblinDen, settleTrainingRuins, settleUndergroundDungeon } from '../game/rewards'
import type { Actor, CombatState, ProfileV2 } from '../game/types'

const main = { name: '단계육', raceId: 'human' as const, classId: 'warrior' as const, gender: '남성' as const }

function ready(skillIds: string[] = ['basic_attack']) {
  const actor = { ...createParty(main)[0], skillIds }
  const enemy = { ...createEncounterEnemies('underground_dungeon_boss')[0], maxHp: 999, currentHp: 999 }
  const started = startCombat([actor], [enemy], 1)
  return { actor, enemy, combat: { ...started.combat, participants: [actor, enemy], turnOrder: [actor.id], turnIndex: 0, phase: 'awaiting_action' as const, outcome: null }, rngState: started.rngState }
}

function progressedProfile(): ProfileV2 {
  const base = createProfile({ type: 'CREATE_PROFILE', mainCharacterConfig: main, profileId: 'stage_6', createdAt: 1, rootSeed: 22 })!
  const q1 = settleTrainingRuins(base, 1, 'expedition_1'); if (!q1.ok) throw new Error(q1.error)
  const q2 = settleGoblinDen(q1.value.profile, 2, 'expedition_2', []); if (!q2.ok) throw new Error(q2.error)
  const q3 = settleAncientSite(q2.value.profile, 3, 'expedition_3', []); if (!q3.ok) throw new Error(q3.error)
  return q3.value.profile
}

describe('stage 6 underground dungeon', () => {
  it('uses the approved connected 11x9 map and five ordered encounters', () => {
    const map = getMapDefinition('underground_dungeon')
    expect(map.rows).toHaveLength(9)
    expect(map.rows.every((row) => row.length === 11)).toBe(true)
    expect(map.encounterIds).toEqual(['underground_dungeon_encounter_1', 'underground_dungeon_encounter_2', 'underground_dungeon_midboss', 'underground_dungeon_encounter_4', 'underground_dungeon_boss'])
    expect(map.traps.length).toBeGreaterThanOrEqual(1)
    expect(map.secrets.length).toBeGreaterThanOrEqual(1)
    expect(isWall(map.mapId, 5, 6, [])).toBe(true)
    expect(isWall(map.mapId, 5, 6, ['underground_dungeon_secret_1'])).toBe(false)
    const boss = { ...createExploration('underground_dungeon_quest'), x: 8, y: 7, direction: 'east' as const }
    expect(move(boss, map.encounterIds.slice(0, 4))).toMatchObject({ encounterStarted: true, encounterId: 'underground_dungeon_boss' })
  })

  it('creates approved enemies and reproduces their status rolls', () => {
    expect(createEncounterEnemies('underground_dungeon_encounter_1')[0]).toMatchObject({ contentId: 'kobold_skirmisher', maxHp: 25, atk: 5, def: 3, agi: 6 })
    expect(createEncounterEnemies('underground_dungeon_midboss')[0]).toMatchObject({ contentId: 'gnoll_brute', maxHp: 74, skillIds: ['rending_bite'] })
    const minotaur = createEncounterEnemies('underground_dungeon_boss')[0]
    expect(minotaur).toMatchObject({ contentId: 'minotaur_boss', maxHp: 120, atk: 8, def: 6, agi: 4, isBoss: true, skillIds: ['minotaur_gore'] })
    expect(SKILLS.minotaur_gore).toMatchObject({ diceCount: 3, fixedModifier: 2 })
    const party = [{ ...createParty(main)[0], maxHp: 999, currentHp: 999 }]
    const base = startCombat(party, [minotaur], 5).combat
    const enemyTurn: CombatState = { ...base, turnOrder: [minotaur.id, party[0].id], turnIndex: 0, phase: 'awaiting_action' }
    expect(advanceToPlayer(enemyTurn, 81)).toEqual(advanceToPlayer(enemyTurn, 81))
    let minotaurStuns = 0
    for (let seed = 1; seed <= 100; seed++) minotaurStuns += advanceToPlayer(enemyTurn, seed).events.some((event) => event.type === 'STATUS_APPLIED' && event.skillId === 'minotaur_gore') ? 1 : 0
    expect(minotaurStuns).toBeGreaterThanOrEqual(25)
    expect(minotaurStuns).toBeLessThanOrEqual(55)

    const attacker = { ...createParty({ ...main, classId: 'rogue' })[0], skillIds: ['basic_attack', 'quick_stab'] }
    const normal = { ...createEncounterEnemies('underground_dungeon_encounter_1')[0], maxHp: 999, currentHp: 999 }
    const boss = { ...normal, id: 'boss_target', isBoss: true }
    let normalApplications = 0; let bossApplications = 0
    for (let seed = 1; seed <= 100; seed++) {
      const run = (target: Actor) => {
        const base = startCombat([attacker], [target], seed).combat
        const combat: CombatState = { ...base, participants: [attacker, target], turnOrder: [attacker.id], turnIndex: 0, phase: 'awaiting_action', outcome: null }
        const selected = selectSkill(combat, 'quick_stab', seed)
        return selectTarget(selected.combat, target.id, selected.rngState).combat.bleedStacksByActor?.[target.id] ?? 0
      }
      normalApplications += run(normal) > 0 ? 1 : 0
      bossApplications += run(boss) > 0 ? 1 : 0
    }
    expect(normalApplications).toBe(100)
    expect(bossApplications).toBeGreaterThan(30)
    expect(bossApplications).toBeLessThan(70)
  })

  it('ticks capped bleed at turn start and keeps sleep through bleed but clears it after direct damage', () => {
    const state = ready()
    const bleeding: CombatState = { ...state.combat, participants: state.combat.participants.map((item) => item.id === state.actor.id ? { ...item, currentHp: 20 } : item), bleedStacksByActor: { [state.actor.id]: 5 }, removableStatusesByActor: { [state.actor.id]: ['bleed'] } }
    const ticked = advanceToPlayer(bleeding, 9)
    expect(ticked.combat.participants.find((item) => item.id === state.actor.id)?.currentHp).toBe(15)
    expect(ticked.combat.bleedStacksByActor?.[state.actor.id]).toBe(5)

    const sleeping: CombatState = { ...state.combat, sleepingByActor: { [state.enemy.id]: true }, bleedStacksByActor: { [state.enemy.id]: 2 }, removableStatusesByActor: { [state.enemy.id]: ['sleep', 'bleed'] } }
    const selected = selectSkill(sleeping, 'basic_attack', state.rngState)
    const hit = selectTarget(selected.combat, state.enemy.id, selected.rngState)
    expect(hit.combat.sleepingByActor?.[state.enemy.id]).toBeUndefined()
    expect(hit.combat.bleedStacksByActor?.[state.enemy.id]).toBe(2)
  })

  it('cleanses all removable statuses and restores neurotoxin AGI with panacea', () => {
    const state = ready()
    const poisonedActor = { ...state.actor, agi: Math.max(1, Math.floor(state.actor.agi / 2)) }
    const poisoned: CombatState = {
      ...state.combat, participants: [poisonedActor, state.enemy], bleedStacksByActor: { [state.actor.id]: 2 }, sleepingByActor: { [state.actor.id]: true },
      neurotoxinsByActor: { [state.actor.id]: { originalAgi: state.actor.agi } }, removableStatusesByActor: { [state.actor.id]: ['bleed', 'neurotoxin', 'sleep'] },
    }
    const cured = useCombatItem(poisoned, state.actor.id, 'panacea', state.actor.id, 7)
    expect(cured.combat.removableStatusesByActor?.[state.actor.id]).toEqual([])
    expect(cured.combat.bleedStacksByActor?.[state.actor.id]).toBeUndefined()
    expect(cured.combat.sleepingByActor?.[state.actor.id]).toBeUndefined()
    expect(cured.combat.participants.find((item) => item.id === state.actor.id)?.agi).toBe(state.actor.agi)
    const remedied = useCombatItem({ ...poisoned, sleepingByActor: {} }, state.actor.id, 'remedy', state.actor.id, 7)
    expect(remedied.combat.bleedStacksByActor?.[state.actor.id]).toBeUndefined()
    expect(remedied.combat.neurotoxinsByActor?.[state.actor.id]).toBeDefined()
  })

  it('uses cooldown 5 from the use round and resolves Lv5 prerequisites and shared fireball roll', () => {
    const state = ready(['basic_attack', 'ability_reinforcement'])
    let selected = selectSkill(state.combat, 'ability_reinforcement', state.rngState)
    expect(selected.events).toEqual([])
    let used = selectTarget(selected.combat, state.actor.id, selected.rngState)
    expect(used.events.find((event) => event.type === 'COMMAND_REJECTED')).toBeUndefined()
    expect(used.combat.cooldownsByActor[state.actor.id]?.ability_reinforcement).toBe(4)
    expect(used.combat.participants.find((item) => item.id === state.actor.id)?.attributes?.str).toBe((state.actor.attributes?.str ?? 0) + 5)
    for (let count = 0; count < 4; count++) {
      selected = selectSkill(used.combat, 'basic_attack', used.rngState)
      used = selectTarget(selected.combat, state.enemy.id, selected.rngState)
    }
    expect(getSkillAvailability(used.combat, state.actor.id, 'ability_reinforcement').available).toBe(true)

    const rogue = ready(['basic_attack', 'wound_break', 'head_shot'])
    expect(selectTarget(selectSkill(rogue.combat, 'wound_break', rogue.rngState).combat, rogue.enemy.id, rogue.rngState).events[0].type).toBe('COMMAND_REJECTED')
    expect(selectTarget(selectSkill(rogue.combat, 'head_shot', rogue.rngState).combat, rogue.enemy.id, rogue.rngState).events[0].type).toBe('COMMAND_REJECTED')
    const woundedCombat: CombatState = { ...rogue.combat, bleedStacksByActor: { [rogue.enemy.id]: 3 }, removableStatusesByActor: { [rogue.enemy.id]: ['bleed'] } }
    const woundSelected = selectSkill(woundedCombat, 'wound_break', rogue.rngState)
    const wound = selectTarget(woundSelected.combat, rogue.enemy.id, woundSelected.rngState)
    expect(wound.combat.bleedStacksByActor?.[rogue.enemy.id]).toBeUndefined()
    expect(wound.events.find((event) => event.type === 'DAMAGE_APPLIED')?.message).toContain('피해')
    const exposedCombat: CombatState = { ...rogue.combat, exposedByActor: { [rogue.enemy.id]: { bonusDamage: 2, sourceActorId: rogue.actor.id, sourceActionsRemaining: 1, appliedRound: 1 } } }
    const headSelected = selectSkill(exposedCombat, 'head_shot', rogue.rngState)
    expect(selectTarget(headSelected.combat, rogue.enemy.id, headSelected.rngState).events.some((event) => event.skillId === 'head_shot' && event.type === 'ROLL_RESOLVED')).toBe(true)

    const paladin = ready(['basic_attack', 'sacred_rage'])
    const rageSelected = selectSkill(paladin.combat, 'sacred_rage', paladin.rngState)
    const enraged = selectTarget(rageSelected.combat, paladin.actor.id, rageSelected.rngState)
    const rageAttack = selectSkill(enraged.combat, 'basic_attack', enraged.rngState)
    const rageHit = selectTarget(rageAttack.combat, paladin.enemy.id, rageAttack.rngState)
    const plainAttack = selectSkill(paladin.combat, 'basic_attack', paladin.rngState)
    const plainHit = selectTarget(plainAttack.combat, paladin.enemy.id, plainAttack.rngState)
    expect(rageHit.events.find((event) => event.type === 'ROLL_RESOLVED')?.resultValue).toBe((plainHit.events.find((event) => event.type === 'ROLL_RESOLVED')?.resultValue ?? 0) * 2)

    const priest = ready(['basic_attack', 'heal', 'celestial_shroud'])
    const hurtPriest = { ...priest.actor, currentHp: 1 }
    const holyCombat: CombatState = { ...priest.combat, participants: [hurtPriest, priest.enemy], resourcesByActor: { [priest.actor.id]: { holyPower: 2, mana: 0 } } }
    const healSelected = selectSkill(holyCombat, 'heal', priest.rngState)
    const holyHeal = selectTarget(healSelected.combat, priest.actor.id, healSelected.rngState)
    expect(holyHeal.events.find((event) => event.type === 'ROLL_RESOLVED')?.resultValue).toBeGreaterThanOrEqual(5)

    const mage = ready(['basic_attack', 'fire_ball'])
    const secondEnemy: Actor = { ...mage.enemy, id: 'second_enemy' }
    const fireCombat: CombatState = { ...mage.combat, participants: [mage.actor, mage.enemy, secondEnemy], resourcesByActor: { [mage.actor.id]: { holyPower: 0, mana: 2 } } }
    const fire = selectSkill(fireCombat, 'fire_ball', mage.rngState)
    expect(fire.events.filter((event) => event.type === 'DAMAGE_APPLIED')).toHaveLength(2)
    expect(fire.combat.participants.find((item) => item.id === mage.enemy.id)?.currentHp).toBe(fire.combat.participants.find((item) => item.id === secondEnemy.id)?.currentHp)
  })

  it('settles Lv5, heroic gear and panacea unlocks, saves invariants, and rejects reentry', () => {
    const before = progressedProfile()
    const settled = settleUndergroundDungeon(before, 4, 'expedition_4', [])
    if (!settled.ok) throw new Error(settled.error)
    expect(settled.value.profile.gold - before.gold).toBe(2700)
    expect(settled.value.profile.characters.every((character) => character.level === 5 && character.experience === 400)).toBe(true)
    expect(settled.value.profile.characters[0].classId === 'warrior' && settled.value.summary.characterResults[0].unlockedClassSkillIds).toContain('ability_reinforcement')
    expect(settled.value.profile.questProgress.unlockedQuestIds).toContain('old_castle_quest')
    expect(settled.value.profile.shop.unlockedRarities).toContain('heroic')
    expect(isProfileV2(settled.value.profile)).toBe(true)
    const entered = reduceGame({ ...createInitialGameState(before), screen: 'hub' }, { type: 'REQUEST_QUEST_ENTRY', questId: 'underground_dungeon_quest' })
    const party = entered.state.session!.party.map((actor, index) => index === 0 ? { ...actor, atk: 999 } : actor)
    const boss = { ...createEncounterEnemies('underground_dungeon_boss')[0], currentHp: 1 }
    const battle = startCombat(party, [boss], entered.state.session!.rngState, 'underground_dungeon_boss').combat
    const battleState = { ...entered.state, screen: 'battle' as const, session: { ...entered.state.session!, combat: { ...battle, participants: [...party, boss], turnOrder: [party[0].id], turnIndex: 0, phase: 'awaiting_action' as const, outcome: null } } }
    const selected = reduceGame(battleState, { type: 'SELECT_SKILL', skillId: 'basic_attack' })
    const completed = reduceGame(selected.state, { type: 'SELECT_TARGET', targetId: boss.id })
    expect(completed.state).toMatchObject({ screen: 'result', result: { outcome: 'victory', gold: 2700, experience: 100 } })
    const state = { ...createInitialGameState(settled.value.profile), screen: 'hub' as const }
    expect(reduceGame(state, { type: 'REQUEST_QUEST_ENTRY', questId: 'underground_dungeon_quest' }).events[0].type).toBe('COMMAND_REJECTED')
  })

  it('transfers arcane bolt overkill once to a deterministic living enemy', () => {
    const mage = ready(['basic_attack', 'arcane_bolt'])
    const first = { ...mage.enemy, id: 'arcane_first', currentHp: 1, maxHp: 1 }
    const second = { ...mage.enemy, id: 'arcane_second', currentHp: 2, maxHp: 2 }
    const third = { ...mage.enemy, id: 'arcane_third', currentHp: 2, maxHp: 2 }
    const combat: CombatState = { ...mage.combat, participants: [mage.actor, first, second, third] }
    const run = () => {
      const selected = selectSkill(combat, 'arcane_bolt', 444)
      return selectTarget(selected.combat, first.id, selected.rngState)
    }
    const result = run()
    expect(run()).toEqual(result)
    const transferEvents = result.events.filter((event) => event.type === 'DAMAGE_APPLIED' && event.message.includes('초과 피해'))
    expect(transferEvents).toHaveLength(1)
    expect(transferEvents[0].damage).toBeGreaterThan(0)
    expect(result.events.some((event) => event.type === 'ACTOR_DEFEATED' && event.targetId === transferEvents[0].targetId)).toBe(true)
    expect([second.id, third.id].map((id) => result.combat.participants.find((item) => item.id === id)?.currentHp).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([0, 2])
    expect(result.combat.resourcesByActor?.[mage.actor.id]?.mana).toBe(1)
  })

  it('applies find leak exposure without dealing damage or reporting a damage result', () => {
    const archer = ready(['basic_attack', 'find_leak'])
    const beforeHp = archer.enemy.currentHp
    const selected = selectSkill(archer.combat, 'find_leak', 88)
    const result = selectTarget(selected.combat, archer.enemy.id, selected.rngState)
    expect(result.combat.participants.find((item) => item.id === archer.enemy.id)?.currentHp).toBe(beforeHp)
    expect(result.combat.exposedByActor?.[archer.enemy.id]?.bonusDamage).toBeGreaterThanOrEqual(1)
    expect(result.events.some((event) => event.type === 'DAMAGE_APPLIED')).toBe(false)
    expect(result.events.find((event) => event.type === 'ROLL_RESOLVED')).toMatchObject({ skillId: 'find_leak', resultKind: undefined, resultValue: undefined })
  })

  it('charges self sacrifice from the healed HP using the actual heal amount', () => {
    const paladin = ready(['basic_attack', 'sacrifice'])
    const hurt = { ...paladin.actor, currentHp: 1 }
    const combat: CombatState = { ...paladin.combat, participants: [hurt, paladin.enemy] }
    const selected = selectSkill(combat, 'sacrifice', 99)
    const result = selectTarget(selected.combat, hurt.id, selected.rngState)
    const actualHeal = result.events.find((event) => event.type === 'ROLL_RESOLVED')?.resultValue ?? 0
    expect(actualHeal).toBeGreaterThan(0)
    expect(result.combat.participants.find((item) => item.id === hurt.id)?.currentHp).toBe(1 + actualHeal - Math.floor(actualHeal / 2))
  })
})
