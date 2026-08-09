import { describe, expect, it } from 'vitest'
import { isProfileV2, readProfileV2, writeProfileV2 } from '../app/saveV2'
import { advanceToPlayer, selectSkill, selectTarget, startCombat } from '../game/combat'
import { expectedGrowth } from '../game/characters'
import { createEncounterEnemies, createParty, CUSTOM_SKILL_ALLOWED_CLASSES, DEEP_FOREST_RUINS_ENCOUNTERS, getMapDefinition, SKILLS, VOLCANIC_CAVE_ENCOUNTERS } from '../game/content'
import { createInitialGameState, createProfile, reduceGame } from '../game/gameEngine'
import { equipCustomSkill, usedStorageSlots } from '../game/inventory'
import { settleAncientSite, settleDeepForestRuins, settleGoblinDen, settleOldCastle, settleTrainingRuins, settleUndergroundDungeon, settleVolcanicCave } from '../game/rewards'
import { buySkill, getSkillPrice, sellSkill } from '../game/shop'
import type { Actor, CombatState, PendingRewardEntry, ProfileV2 } from '../game/types'
import { REGISTERED_ENEMY_CONTENT_IDS, enemySpriteKeyFor } from '../phaser/assets/enemyAssets'
import { REGISTERED_TERRAIN_MAP_IDS } from '../phaser/assets/terrainAssets'

const main = { name: '반복자', raceId: 'human' as const, classId: 'warrior' as const, gender: '남성' as const }

function repeatReady(): ProfileV2 {
  let profile = createProfile({ type: 'CREATE_PROFILE', mainCharacterConfig: main, profileId: 'stage_89', createdAt: 1, rootSeed: 89 })!
  const q1 = settleTrainingRuins(profile, 1, 'expedition_1'); if (!q1.ok) throw new Error(q1.error); profile = q1.value.profile
  const q2 = settleGoblinDen(profile, 2, 'expedition_2', []); if (!q2.ok) throw new Error(q2.error); profile = q2.value.profile
  const q3 = settleAncientSite(profile, 3, 'expedition_3', []); if (!q3.ok) throw new Error(q3.error); profile = q3.value.profile
  const q4 = settleUndergroundDungeon(profile, 4, 'expedition_4', []); if (!q4.ok) throw new Error(q4.error); profile = q4.value.profile
  const q5 = settleOldCastle(profile, 5, 'expedition_5', []); if (!q5.ok) throw new Error(q5.error)
  return q5.value.profile
}

function enemyTurn(enemy: Actor, party: Actor[], seed: number): ReturnType<typeof advanceToPlayer> {
  const started = startCombat(party, [enemy], seed, 'test')
  const combat: CombatState = { ...started.combat, participants: [...party, enemy], turnOrder: [enemy.id, ...party.map((actor) => actor.id)], turnIndex: 0, phase: 'awaiting_action' }
  return advanceToPlayer(combat, seed)
}

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return { get length() { return data.size }, clear: () => data.clear(), getItem: (key) => data.get(key) ?? null, key: (index) => [...data.keys()][index] ?? null, removeItem: (key) => { data.delete(key) }, setItem: (key, value) => { data.set(key, value) } }
}

describe('stage 8 and 9 repeat quests', () => {
  it('defines connected approved maps, encounter order, traps, secrets, and terrain assets', () => {
    const cases = [
      ['volcanic_cave', 11, VOLCANIC_CAVE_ENCOUNTERS, [[4,1],[9,3],[6,5],[3,8],[9,9]]],
      ['deep_forest_ruins', 13, DEEP_FOREST_RUINS_ENCOUNTERS, [[4,1],[10,3],[6,5],[3,8],[11,9]]],
    ] as const
    for (const [mapId, width, encounters, coordinates] of cases) {
      const map = getMapDefinition(mapId)
      expect(map.rows).toHaveLength(11)
      expect(map.rows.every((row) => row.length === width)).toBe(true)
      expect(map.rows[0]).toBe('#'.repeat(width)); expect(map.rows[10]).toBe('#'.repeat(width))
      expect(encounters.map(({ x, y }) => [x, y])).toEqual(coordinates)
      expect(map.encounterIds).toEqual(encounters.map(({ encounterId }) => encounterId))
      expect(map.traps.length).toBeGreaterThanOrEqual(1); expect(map.secrets.length).toBeGreaterThanOrEqual(1)
      const open = new Set<string>(); const queue = [`${map.start.x},${map.start.y}`]
      while (queue.length) { const key = queue.shift()!; if (open.has(key)) continue; open.add(key); const [x,y] = key.split(',').map(Number); for (const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) if (map.rows[ny]?.[nx] !== '#' && !open.has(`${nx},${ny}`)) queue.push(`${nx},${ny}`) }
      for (const { x, y } of encounters) expect(open.has(`${x},${y}`)).toBe(true)
      expect(REGISTERED_TERRAIN_MAP_IDS).toContain(mapId)
    }
    expect(VOLCANIC_CAVE_ENCOUNTERS.map((item) => item.enemies)).toEqual([[{ enemyId: 'imp', count: 2 }],[{ enemyId: 'kobold_skirmisher', count: 2 },{ enemyId: 'imp', count: 1 }],[{ enemyId: 'ogre', count: 1 }],[{ enemyId: 'imp', count: 2 },{ enemyId: 'kobold_skirmisher', count: 1 }],[{ enemyId: 'cyclops_boss', count: 1 }]])
    expect(DEEP_FOREST_RUINS_ENCOUNTERS.map((item) => item.enemies)).toEqual([[{ enemyId: 'skeleton_soldier', count: 2 }],[{ enemyId: 'orc_raider', count: 2 }],[{ enemyId: 'wraith', count: 1 }],[{ enemyId: 'skeleton_soldier', count: 2 },{ enemyId: 'orc_raider', count: 1 }],[{ enemyId: 'skeleton_king_boss', count: 1 }]])
  })

  it('creates approved enemies, boss and undead flags, skills, and assets', () => {
    expect(createEncounterEnemies('volcanic_cave_encounter_1')[0]).toMatchObject({ contentId: 'imp', maxHp: 34, atk: 8, def: 4, agi: 7, isBoss: false, skillIds: ['basic_attack'] })
    expect(createEncounterEnemies('volcanic_cave_midboss')[0]).toMatchObject({ contentId: 'ogre', isBoss: false })
    expect(createEncounterEnemies('volcanic_cave_boss')[0]).toMatchObject({ contentId: 'cyclops_boss', maxHp: 150, atk: 10, def: 7, agi: 2, isBoss: true, skillIds: ['crushing_blow'] })
    expect(createEncounterEnemies('deep_forest_ruins_midboss')[0]).toMatchObject({ contentId: 'wraith', maxHp: 86, atk: 10, def: 7, agi: 8, isBoss: false, isUndead: true, skillIds: ['drain_touch'] })
    expect(createEncounterEnemies('deep_forest_ruins_boss')[0]).toMatchObject({ contentId: 'skeleton_king_boss', maxHp: 145, atk: 9, def: 7, agi: 5, isBoss: true, isUndead: true, skillIds: ['royal_cleave'] })
    expect(SKILLS.crushing_blow).toMatchObject({ diceCount: 3, fixedModifier: 4 }); expect(SKILLS.drain_touch).toMatchObject({ diceCount: 3, fixedModifier: 0 }); expect(SKILLS.royal_cleave).toMatchObject({ diceCount: 2, targetMode: 'all_enemies' })
    for (const id of ['imp','cyclops_boss','wraith','skeleton_king_boss']) { expect(REGISTERED_ENEMY_CONTENT_IDS).toContain(id); expect(enemySpriteKeyFor(id)).toBe(`enemy_${id}`) }
  })

  it('resolves crushing stun deterministically and drain from actual damage with healing cap', () => {
    const party = createParty(main).map((actor) => ({ ...actor, maxHp: 999, currentHp: 999 }))
    const cyclops = createEncounterEnemies('volcanic_cave_boss')[0]
    expect(enemyTurn(cyclops, party, 321)).toEqual(enemyTurn(cyclops, party, 321))
    const stunResults = new Set<boolean>()
    let stunCount = 0
    for (let seed = 1; seed <= 100; seed++) {
      const stunned = enemyTurn(cyclops, party, Math.imul(seed, 0x9e3779b1)).events.some((event) => event.type === 'STATUS_APPLIED' && event.skillId === 'crushing_blow')
      stunResults.add(stunned)
      stunCount += stunned ? 1 : 0
    }
    expect(stunResults).toEqual(new Set([true, false]))
    expect(stunCount).toBeGreaterThanOrEqual(25)
    expect(stunCount).toBeLessThanOrEqual(55)

    const target = { ...party[0], currentHp: 5, maxHp: 5 }
    const wraith = { ...createEncounterEnemies('deep_forest_ruins_midboss')[0], currentHp: 40, maxHp: 86 }
    const drained = enemyTurn(wraith, [target], 55)
    expect(drained.combat.participants.find((actor) => actor.id === wraith.id)?.currentHp).toBe(42)
    expect(drained.events.find((event) => event.type === 'HEAL_APPLIED')).toMatchObject({ actorId: wraith.id, resultValue: 2 })
    const capped = enemyTurn({ ...wraith, currentHp: 85 }, [{ ...target, currentHp: 20, maxHp: 20 }], 55)
    expect(capped.combat.participants.find((actor) => actor.id === wraith.id)?.currentHp).toBe(86)
    expect(capped.events.find((event) => event.type === 'HEAL_APPLIED')?.resultValue).toBe(1)
  })

  it('uses one royal roll against all living party members, protection, defeat events and outcome while preserving fire ball', () => {
    const baseParty = createParty(main).map((actor, index) => ({ ...actor, def: index + 1, maxHp: 999, currentHp: 999 }))
    const king = createEncounterEnemies('deep_forest_ruins_boss')[0]
    const unprotected = enemyTurn(king, baseParty, 77)
    const protectedParty = baseParty.map((actor, index) => index === 0 ? { ...actor, skillIds: [...actor.skillIds, 'protection_pledge'] } : actor)
    const protectedResult = enemyTurn(king, protectedParty, 77)
    const roll = protectedResult.events.find((event) => event.type === 'ROLL_RESOLVED')!
    expect(protectedResult.events.filter((event) => event.type === 'DICE_ROLLED')).toHaveLength(1)
    expect(protectedResult.events.filter((event) => event.type === 'DAMAGE_APPLIED')).toHaveLength(4)
    for (const actor of baseParty) {
      const plainHp = unprotected.combat.participants.find((item) => item.id === actor.id)!.currentHp
      const guardedHp = protectedResult.combat.participants.find((item) => item.id === actor.id)!.currentHp
      expect(guardedHp).toBe(plainHp + 1)
      expect(unprotected.events.find((event) => event.type === 'DAMAGE_APPLIED' && event.targetId === actor.id)?.damage).toBe(Math.max(1, roll.rollTotal! + king.atk - actor.def))
    }
    const wiped = enemyTurn(king, baseParty.map((actor) => ({ ...actor, currentHp: 1, maxHp: 1 })), 77)
    expect(wiped.combat.outcome).toBe('lost'); expect(wiped.events.filter((event) => event.type === 'ACTOR_DEFEATED')).toHaveLength(4)

    const mage = { ...createParty({ ...main, classId: 'mage' })[0], maxHp: 999, currentHp: 999, skillIds: ['basic_attack','fire_ball'] }
    const enemies = createEncounterEnemies('volcanic_cave_encounter_1').map((enemy) => ({ ...enemy, currentHp: 999, maxHp: 999 }))
    const started = startCombat([mage], enemies, 88); const combat = { ...started.combat, turnOrder: [mage.id], turnIndex: 0, phase: 'awaiting_action' as const }
    const fire = selectSkill(combat, 'fire_ball', started.rngState)
    expect(fire.events.filter((event) => event.type === 'DAMAGE_APPLIED')).toHaveLength(2); expect(fire.combat.participants.find((actor) => actor.id === mage.id)?.currentHp).toBe(combat.participants.find((actor) => actor.id === mage.id)?.currentHp)
  })

  it('settles unlimited mixed repeats, exact growth and cap, rewards, offers, and overflow', () => {
    const ready = repeatReady(); const initialGold = ready.gold; const initialRevision = ready.random.shopRevision
    let profile = ready
    for (let index = 0; index < 3; index++) { const settled = settleVolcanicCave(profile, 100 + index, `volcanic_${index}`, []); if (!settled.ok) throw new Error(settled.error); profile = settled.value.profile }
    expect(profile.characters.every((character) => character.level === 9 && character.experience === 800)).toBe(true)
    for (const character of profile.characters) expect(character.growth).toEqual(expectedGrowth(character.classId, 9))
    const fourth = settleDeepForestRuins(profile, 200, 'forest_0', []); if (!fourth.ok) throw new Error(fourth.error); profile = fourth.value.profile
    expect(profile.characters.every((character) => character.level === 9 && character.experience === 900)).toBe(true)
    const fifth = settleDeepForestRuins(profile, 201, 'forest_1', []); if (!fifth.ok) throw new Error(fifth.error); profile = fifth.value.profile
    expect(profile.characters.every((character) => character.level === 10 && character.experience === 1000)).toBe(true)
    expect(profile.questProgress.repeatCompletionCounts).toEqual({ volcanic_cave_quest: 3, deep_forest_ruins_quest: 2 })
    expect(profile.questProgress.completedQuestIds.filter((id) => id === 'volcanic_cave_quest')).toHaveLength(1)
    expect(profile.gold - initialGold).toBe(4000 * 5); expect(profile.random.shopRevision).toBe(initialRevision + 5); expect(profile.shop.skillOfferIds).toHaveLength(3)
    const unlimited = settleVolcanicCave(profile, 300, 'volcanic_4', []); if (!unlimited.ok) throw new Error(unlimited.error)
    expect(unlimited.value.profile.characters.every((character) => character.experience === 1000)).toBe(true); expect(unlimited.value.profile.questProgress.repeatCompletionCounts.volcanic_cave_quest).toBe(4)

    const fillerCount = 98 - usedStorageSlots(ready)
    const crowded: ProfileV2 = { ...ready, storage: { ...ready.storage, itemStacks: [...ready.storage.itemStacks, ...Array.from({ length: fillerCount }, (_, index) => ({ stackId: `item_stack_${500 + index}`, itemId: 'bandage', quantity: 10 }))] }, random: { ...ready.random, nextInstanceSequence: 900 } }
    const secret: PendingRewardEntry = { rewardId: 'secret_volcanic', kind: 'item', itemId: 'panacea', quantity: 1 }
    const overflow = settleVolcanicCave(crowded, 400, 'overflow', [secret]); if (!overflow.ok) throw new Error(overflow.error)
    expect(overflow.value.rewards).toHaveLength(4); expect(overflow.value.profile.pendingReward?.rewards).toHaveLength(4); expect(usedStorageSlots(overflow.value.profile)).toBe(98)
    const storage = memoryStorage(); expect(writeProfileV2(overflow.value.profile, storage)).toBe(true)
    expect(readProfileV2(storage)?.pendingReward?.summary.characterResults.every((result) => result.unlockedCustomSlotIndices?.[0] === 1)).toBe(true)
  })

  it('supports level 7 and 10 slots, round-trip save, and stage skill prices and sales', () => {
    let profile = repeatReady()
    const low = createProfile({ type: 'CREATE_PROFILE', mainCharacterConfig: main, profileId: 'low', createdAt: 1, rootSeed: 2 })!
    const lowSale = sellSkill({ ...low, gold: 0, storage: { ...low.storage, skillInstances: [{ skillInstanceId: 'skill_5', skillId: 'first_aid' }] } }, 'skill_5')
    expect(getSkillPrice(low)).toBe(180); expect(lowSale.ok && lowSale.value.gold).toBe(90)
    const lv7 = settleVolcanicCave(profile, 1, 'r1', []); if (!lv7.ok) throw new Error(lv7.error); profile = lv7.value.profile
    expect(lv7.value.summary.characterResults.every((result) => result.unlockedCustomSlotIndices.length === 1 && result.unlockedCustomSlotIndices[0] === 1)).toBe(true)
    const level7Sale = sellSkill({ ...profile, gold: 0, storage: { ...profile.storage, skillInstances: [{ skillInstanceId: 'skill_sale', skillId: 'first_aid' }] } }, 'skill_sale')
    expect(level7Sale.ok && level7Sale.value.gold).toBe(210)
    const first = profile.storage.skillInstances.find((item) => CUSTOM_SKILL_ALLOWED_CLASSES[item.skillId as keyof typeof CUSTOM_SKILL_ALLOWED_CLASSES].includes('warrior'))!; const equipped7 = equipCustomSkill(profile, profile.characters[0].characterId, first.skillInstanceId, 1); expect(equipped7.ok).toBe(true); if (!equipped7.ok) return; profile = equipped7.value
    expect(getSkillPrice(profile)).toBe(420)
    let latestSummary = lv7.value.summary
    for (let index = 0; index < 4; index++) { const settled = settleVolcanicCave(profile, 10 + index, `next_${index}`, []); if (!settled.ok) throw new Error(settled.error); profile = settled.value.profile; latestSummary = settled.value.summary }
    expect(latestSummary.characterResults.every((result) => result.unlockedCustomSlotIndices.length === 1 && result.unlockedCustomSlotIndices[0] === 2)).toBe(true)
    const third = profile.storage.skillInstances.find((item) => item.skillId !== first.skillId && CUSTOM_SKILL_ALLOWED_CLASSES[item.skillId as keyof typeof CUSTOM_SKILL_ALLOWED_CLASSES].includes('warrior'))!; const equipped10 = equipCustomSkill(profile, profile.characters[0].characterId, third.skillInstanceId, 2); expect(equipped10.ok).toBe(true); if (!equipped10.ok) return; profile = equipped10.value
    expect(getSkillPrice(profile)).toBe(650)
    const storage = memoryStorage(); expect(writeProfileV2(profile, storage)).toBe(true); expect(readProfileV2(storage)?.characters[0].customSkillSlots.slice(1).every(Boolean)).toBe(true)
    const offered = { ...profile, gold: 1000, shop: { ...profile.shop, skillOfferIds: ['first_aid'] } }; const bought = buySkill(offered, 'first_aid'); expect(bought.ok).toBe(true); if (!bought.ok) return
    expect(bought.value.gold).toBe(350); const sold = sellSkill(bought.value, bought.value.storage.skillInstances.at(-1)!.skillInstanceId); expect(sold.ok && sold.value.gold).toBe(675)
  })

  it('connects both bosses to settlement, permits repeated entry, and rejects malformed repeat saves', () => {
    for (const [questId, bossEncounterId, gold] of [['volcanic_cave_quest','volcanic_cave_boss',4000],['deep_forest_ruins_quest','deep_forest_ruins_boss',4000]] as const) {
      const ready = repeatReady(); const entered = reduceGame({ ...createInitialGameState(ready), screen: 'hub' }, { type: 'REQUEST_QUEST_ENTRY', questId })
      const party = entered.state.session!.party.map((actor, index) => index === 0 ? { ...actor, atk: 999 } : actor); const boss = { ...createEncounterEnemies(bossEncounterId)[0], currentHp: 1 }
      const started = startCombat(party, [boss], entered.state.session!.rngState, bossEncounterId)
      const battleState = { ...entered.state, screen: 'battle' as const, session: { ...entered.state.session!, combat: { ...started.combat, participants: [...party,boss], turnOrder: [party[0].id], turnIndex: 0, phase: 'awaiting_action' as const } } }
      const selected = reduceGame(battleState, { type: 'SELECT_SKILL', skillId: 'basic_attack' }); const completed = reduceGame(selected.state, { type: 'SELECT_TARGET', targetId: boss.id })
      expect(completed.state.result).toMatchObject({ outcome: 'victory', gold }); const hub = { ...createInitialGameState(completed.state.profile), screen: 'hub' as const }
      expect(completed.events.some((event) => event.type === 'UNLOCK_GRANTED')).toBe(false)
      expect(reduceGame(hub, { type: 'REQUEST_QUEST_ENTRY', questId }).state.screen).toBe('exploration')
    }
    const ready = repeatReady()
    expect(isProfileV2({ ...ready, questProgress: { ...ready.questProgress, repeatCompletionCounts: { ...ready.questProgress.repeatCompletionCounts, volcanic_cave_quest: 1 } } })).toBe(false)
    expect(isProfileV2({ ...ready, questProgress: { ...ready.questProgress, completedQuestIds: [...ready.questProgress.completedQuestIds, 'volcanic_cave_quest'] } })).toBe(false)
    expect(isProfileV2({ ...ready, questProgress: { ...ready.questProgress, repeatCompletionCounts: { ...ready.questProgress.repeatCompletionCounts, deep_forest_ruins_quest: -1 } } })).toBe(false)
    const completed = settleVolcanicCave(ready, 9, 'valid', []); if (!completed.ok) throw new Error(completed.error); expect(isProfileV2(completed.value.profile)).toBe(true)
  })
})
