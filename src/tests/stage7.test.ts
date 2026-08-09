import { describe, expect, it } from 'vitest'
import { isProfileV2 } from '../app/saveV2'
import { advanceToPlayer, selectSkill, selectTarget, startCombat } from '../game/combat'
import { expectedGrowth } from '../game/characters'
import { createEncounterEnemies, createParty, EQUIPMENT_DATA, getMapDefinition, OLD_CASTLE_ENCOUNTERS, SKILLS } from '../game/content'
import { createInitialGameState, createProfile, reduceGame } from '../game/gameEngine'
import { createExploration, isWall, move } from '../game/exploration'
import { usedStorageSlots } from '../game/inventory'
import { createSecretRoomReward, settleAncientSite, settleGoblinDen, settleOldCastle, settleTrainingRuins, settleUndergroundDungeon } from '../game/rewards'
import { getAvailableEquipmentIds } from '../game/shop'
import type { Actor, CombatState, PendingRewardEntry, ProfileV2 } from '../game/types'
import { REGISTERED_ENEMY_CONTENT_IDS, enemySpriteKeyFor } from '../phaser/assets/enemyAssets'
import { REGISTERED_TERRAIN_MAP_IDS } from '../phaser/assets/terrainAssets'

const main = { name: '단계칠', raceId: 'human' as const, classId: 'paladin' as const, gender: '남성' as const }

function beforeOldCastle(): ProfileV2 {
  const base = createProfile({ type: 'CREATE_PROFILE', mainCharacterConfig: main, profileId: 'stage_7', createdAt: 1, rootSeed: 77 })!
  const q1 = settleTrainingRuins(base, 1, 'expedition_1'); if (!q1.ok) throw new Error(q1.error)
  const q2 = settleGoblinDen(q1.value.profile, 2, 'expedition_2', []); if (!q2.ok) throw new Error(q2.error)
  const q3 = settleAncientSite(q2.value.profile, 3, 'expedition_3', []); if (!q3.ok) throw new Error(q3.error)
  const q4 = settleUndergroundDungeon(q3.value.profile, 4, 'expedition_4', []); if (!q4.ok) throw new Error(q4.error)
  return q4.value.profile
}

function controlledCombat(actor: Actor, target: Actor, seed: number): CombatState {
  const started = startCombat([actor], [target], seed)
  return { ...started.combat, participants: [actor, target], turnOrder: [actor.id], turnIndex: 0, phase: 'awaiting_action', outcome: null }
}

function skillDamage(actor: Actor, target: Actor, skillId: string, seed: number): number {
  const combat = controlledCombat(actor, target, seed)
  const selected = selectSkill(combat, skillId, seed)
  return selectTarget(selected.combat, target.id, selected.rngState).events.find((event) => event.type === 'ROLL_RESOLVED')?.resultValue ?? 0
}

describe('stage 7 old castle', () => {
  it('uses the approved connected 11x11 route, ordered encounters, trap, and secret room', () => {
    const map = getMapDefinition('old_castle')
    expect(map.rows).toHaveLength(11)
    expect(map.rows.every((row) => row.length === 11)).toBe(true)
    expect(map.rows[0]).toBe('###########')
    expect(map.rows[10]).toBe('###########')
    expect(OLD_CASTLE_ENCOUNTERS.map(({ x, y }) => [x, y])).toEqual([[3, 1], [8, 2], [8, 5], [3, 8], [9, 9]])
    expect(map.encounterIds).toEqual(['old_castle_encounter_1', 'old_castle_encounter_2', 'old_castle_midboss', 'old_castle_encounter_4', 'old_castle_boss'])
    expect(OLD_CASTLE_ENCOUNTERS.map((encounter) => encounter.enemies)).toEqual([
      [{ enemyId: 'skeleton_soldier', count: 2 }], [{ enemyId: 'zombie', count: 2 }], [{ enemyId: 'ghoul', count: 1 }],
      [{ enemyId: 'skeleton_soldier', count: 1 }, { enemyId: 'zombie', count: 1 }], [{ enemyId: 'lich_boss', count: 1 }],
    ])
    expect(map.traps.length).toBeGreaterThanOrEqual(1)
    expect(map.secrets.length).toBeGreaterThanOrEqual(1)
    expect(isWall('old_castle', 5, 7, [])).toBe(true)
    expect(isWall('old_castle', 5, 7, ['old_castle_secret_1'])).toBe(false)
    const beforeBoss = { ...createExploration('old_castle_quest'), x: 9, y: 8, direction: 'south' as const }
    expect(move(beforeBoss, map.encounterIds.slice(0, 4))).toMatchObject({ encounterStarted: true, encounterId: 'old_castle_boss' })
    expect(REGISTERED_TERRAIN_MAP_IDS).toContain('old_castle')
  })

  it('creates approved undead enemies with boss status only on the boss encounter and registered assets', () => {
    expect(createEncounterEnemies('old_castle_encounter_1')[0]).toMatchObject({ contentId: 'skeleton_soldier', maxHp: 30, atk: 6, def: 5, agi: 3, isUndead: true, isBoss: false, skillIds: ['basic_attack'] })
    expect(createEncounterEnemies('old_castle_encounter_2')[0]).toMatchObject({ contentId: 'zombie', maxHp: 42, atk: 7, def: 3, agi: 1, isUndead: true, isBoss: false })
    expect(createEncounterEnemies('old_castle_midboss')[0]).toMatchObject({ contentId: 'ghoul', maxHp: 82, atk: 8, def: 5, agi: 6, isUndead: true, isBoss: false, skillIds: ['paralyzing_claw'] })
    expect(createEncounterEnemies('old_castle_boss')[0]).toMatchObject({ contentId: 'lich_boss', maxHp: 125, atk: 10, def: 7, agi: 6, isUndead: true, isBoss: true, skillIds: ['death_bolt'] })
    for (const id of ['skeleton_soldier', 'zombie', 'ghoul', 'lich_boss']) {
      expect(REGISTERED_ENEMY_CONTENT_IDS).toContain(id)
      expect(enemySpriteKeyFor(id)).toBe(`enemy_${id}`)
    }
  })

  it('uses deterministic 50 percent paralysis and approved enemy skill dice metadata', () => {
    expect(SKILLS.paralyzing_claw).toMatchObject({ diceCount: 2, fixedModifier: 2, resolution: 'damage' })
    expect(SKILLS.death_bolt).toMatchObject({ diceCount: 3, fixedModifier: 4, resolution: 'damage' })
    const ghoul = createEncounterEnemies('old_castle_midboss')[0]
    const party = createParty(main).slice(0, 2).map((actor) => ({ ...actor, maxHp: 999, currentHp: 999 }))
    const run = (seed: number) => {
      const base = startCombat(party, [ghoul], seed).combat
      const enemyTurn: CombatState = { ...base, participants: [...party, ghoul], turnOrder: [ghoul.id, party[0].id, party[1].id], turnIndex: 0, phase: 'awaiting_action' }
      return advanceToPlayer(enemyTurn, seed)
    }
    expect(run(123)).toEqual(run(123))
    let applications = 0
    for (let seed = 1; seed <= 100; seed++) applications += run(seed).events.some((event) => event.type === 'STATUS_APPLIED' && event.skillId === 'paralyzing_claw') ? 1 : 0
    expect(applications).toBeGreaterThanOrEqual(35)
    expect(applications).toBeLessThanOrEqual(65)
    const lich = createEncounterEnemies('old_castle_boss')[0]
    const lichBase = startCombat(party, [lich], 99).combat
    const lichTurn: CombatState = { ...lichBase, participants: [...party, lich], turnOrder: [lich.id, party[0].id, party[1].id], turnIndex: 0, phase: 'awaiting_action' }
    const deathBolt = advanceToPlayer(lichTurn, 99)
    expect(deathBolt.events.some((event) => event.type === 'ROLL_RESOLVED' && event.skillId === 'death_bolt')).toBe(true)
    expect(deathBolt.events.some((event) => event.type === 'STATUS_APPLIED' && event.skillId === 'death_bolt')).toBe(false)
  })

  it('preserves holy, sacred rage, and bone crusher undead interactions', () => {
    const paladin = { ...createParty(main)[0], skillIds: ['basic_attack', 'holy_strike', 'sacred_rage'] }
    const skeleton = { ...createEncounterEnemies('old_castle_encounter_1')[0], maxHp: 999, currentHp: 999 }
    const living = { ...skeleton, id: 'living_target', contentId: 'living_target', isUndead: false }
    expect(skillDamage(paladin, skeleton, 'holy_strike', 41)).toBe(skillDamage(paladin, living, 'holy_strike', 41) * 2)
    const priest = { ...createParty({ ...main, classId: 'priest' })[0], skillIds: ['basic_attack', 'smite'] }
    expect(skillDamage(priest, skeleton, 'smite', 42)).toBe(skillDamage(priest, living, 'smite', 42) * 2)

    const rageBase = controlledCombat(paladin, skeleton, 43)
    const rageSelected = selectSkill(rageBase, 'sacred_rage', 43)
    const enraged = selectTarget(rageSelected.combat, paladin.id, rageSelected.rngState)
    const attackSelected = selectSkill(enraged.combat, 'basic_attack', enraged.rngState)
    const rageDamage = selectTarget(attackSelected.combat, skeleton.id, attackSelected.rngState).events.find((event) => event.type === 'ROLL_RESOLVED')?.resultValue
    expect(rageDamage).toBe(skillDamage(paladin, skeleton, 'basic_attack', enraged.rngState) * 3)

    const crusher = { ...paladin, skillIds: ['basic_attack', 'bone_crusher'] }
    expect(skillDamage(crusher, skeleton, 'basic_attack', 44)).toBe(skillDamage({ ...crusher, skillIds: ['basic_attack'] }, skeleton, 'basic_attack', 44) + 3)
  })

  it('adds all nine approved legendary equipment definitions and exposes them only after completion', () => {
    const expected = {
      legendary_dagger: ['황금 송곳니', 'dagger', 'weapon', false, [1,5,0,0,3,2], 580, ['warrior','rogue']],
      legendary_sword: ['태양검', 'sword', 'weapon', false, [7,3,0,1,0,0], 700, ['warrior','paladin','rogue']],
      legendary_mace: ['심판의 망치', 'mace', 'weapon', false, [6,0,2,3,0,0], 700, ['warrior','paladin']],
      legendary_shield: ['태양 방패', 'shield', 'offhand', false, [3,0,0,6,0,2], 580, ['warrior','paladin']],
      legendary_bow: ['별빛 장궁', 'bow', 'weapon', true, [0,6,0,0,4,1], 740, ['warrior','archer']],
      legendary_staff: ['세계수 지팡이', 'staff', 'weapon', true, [0,0,6,3,0,2], 700, ['warrior','priest','mage']],
      legendary_rod: ['용맥의 로드', 'rod', 'weapon', true, [0,0,7,0,2,2], 740, ['warrior','mage']],
      legendary_head: ['별왕관', 'head', 'head', false, [1,2,2,1,2,3], 520, ['warrior','rogue','archer','paladin','priest','mage']],
      legendary_body: ['천명 갑옷', 'body', 'body', false, [3,1,0,6,0,1], 650, ['warrior','rogue','archer','paladin','priest','mage']],
    } as const
    for (const [id, [name, family, slot, twoHanded, modifiers, buyPrice, allowedClasses]] of Object.entries(expected)) {
      const item = EQUIPMENT_DATA[id]
      expect([item.name, item.family, item.slot, item.twoHanded, Object.values(item.modifiers), item.buyPrice, item.allowedClasses]).toEqual([name, family, slot, twoHanded, modifiers, buyPrice, allowedClasses])
      expect(item.rarity).toBe('legendary')
    }
    expect(getAvailableEquipmentIds(beforeOldCastle()).filter((id) => id.startsWith('legendary_'))).toEqual([])
    const settled = settleOldCastle(beforeOldCastle(), 5, 'expedition_5', []); if (!settled.ok) throw new Error(settled.error)
    expect(getAvailableEquipmentIds(settled.value.profile).filter((id) => id.startsWith('legendary_'))).toHaveLength(9)
  })

  it('settles gold, Lv6 growth, repeat unlocks, offers, rewards, overflow, and save invariants', () => {
    const before = beforeOldCastle()
    const secretLoot: PendingRewardEntry = { rewardId: 'secret_old_castle_secret_1', kind: 'item', itemId: 'panacea', quantity: 1 }
    const settled = settleOldCastle(before, 5, 'expedition_5', [secretLoot]); if (!settled.ok) throw new Error(settled.error)
    const profile = settled.value.profile
    expect(profile.gold - before.gold).toBe(1050)
    expect(profile.characters.every((character) => character.level === 6 && character.experience === 500)).toBe(true)
    for (const character of profile.characters) expect(character.growth).toEqual(expectedGrowth(character.classId, 6))
    expect(profile.questProgress.completedQuestIds).toContain('old_castle_quest')
    expect(settled.value.summary.unlockedQuestIds).toEqual(['volcanic_cave_quest', 'deep_forest_ruins_quest'])
    expect(profile.questProgress.unlockedQuestIds).toEqual(expect.arrayContaining(['volcanic_cave_quest', 'deep_forest_ruins_quest']))
    expect(profile.questProgress.repeatCompletionCounts).toEqual({ volcanic_cave_quest: 0, deep_forest_ruins_quest: 0 })
    expect(profile.shop.unlockedRarities).toContain('legendary')
    expect(profile.shop.skillOfferIds).toHaveLength(3)
    expect(settled.value.rewards).toHaveLength(4)
    expect(isProfileV2(profile)).toBe(true)

    const fillerCount = 98 - usedStorageSlots(before)
    const crowded: ProfileV2 = {
      ...before,
      storage: { ...before.storage, itemStacks: [...before.storage.itemStacks, ...Array.from({ length: fillerCount }, (_, index) => ({ stackId: `item_stack_${300 + index}`, itemId: 'bandage', quantity: 10 }))] },
      random: { ...before.random, nextInstanceSequence: 500 },
    }
    const overflow = settleOldCastle(crowded, 6, 'expedition_5', [secretLoot]); if (!overflow.ok) throw new Error(overflow.error)
    expect(overflow.value.profile.pendingReward?.rewards).toHaveLength(4)
    expect(usedStorageSlots(overflow.value.profile)).toBe(98)
    expect(isProfileV2(overflow.value.profile)).toBe(true)

    expect(isProfileV2({ ...before, shop: { ...before.shop, unlockedRarities: [...before.shop.unlockedRarities, 'legendary'] } })).toBe(false)
    expect(isProfileV2({ ...before, questProgress: { ...before.questProgress, unlockedQuestIds: [...before.questProgress.unlockedQuestIds, 'volcanic_cave_quest'] } })).toBe(false)
    expect(isProfileV2({ ...before, questProgress: { ...before.questProgress, unlockedQuestIds: [...before.questProgress.unlockedQuestIds, 'deep_forest_ruins_quest'] } })).toBe(false)
    expect(isProfileV2({ ...profile, questProgress: { ...profile.questProgress, unlockedQuestIds: profile.questProgress.unlockedQuestIds.filter((id) => id !== 'deep_forest_ruins_quest') } })).toBe(false)
  })

  it('can deterministically select legendary equipment from the old castle secret room', () => {
    const profile = beforeOldCastle()
    const seeds = [11, 4096, 4192, 6400, 6784]
    const rewards = seeds.map((seed) => createSecretRoomReward(profile, seed, 'old_castle_quest', 'old_castle_secret_1'))
    const repeated = seeds.map((seed) => createSecretRoomReward(profile, seed, 'old_castle_quest', 'old_castle_secret_1'))
    expect(rewards).toEqual(repeated)
    expect(rewards.some(({ reward }) => reward.kind === 'equipment' && EQUIPMENT_DATA[reward.instance.equipmentId].rarity === 'legendary')).toBe(true)
  })

  it('connects boss victory to settlement, rejects sequential reentry, and unlocks repeat entry', () => {
    const before = beforeOldCastle()
    const entered = reduceGame({ ...createInitialGameState(before), screen: 'hub' }, { type: 'REQUEST_QUEST_ENTRY', questId: 'old_castle_quest' })
    const party = entered.state.session!.party.map((actor, index) => index === 0 ? { ...actor, atk: 999 } : actor)
    const boss = { ...createEncounterEnemies('old_castle_boss')[0], currentHp: 1 }
    const battle = startCombat(party, [boss], entered.state.session!.rngState, 'old_castle_boss').combat
    const battleState = { ...entered.state, screen: 'battle' as const, session: { ...entered.state.session!, combat: { ...battle, participants: [...party, boss], turnOrder: [party[0].id], turnIndex: 0, phase: 'awaiting_action' as const, outcome: null } } }
    const selected = reduceGame(battleState, { type: 'SELECT_SKILL', skillId: 'basic_attack' })
    const completed = reduceGame(selected.state, { type: 'SELECT_TARGET', targetId: boss.id })
    expect(completed.state).toMatchObject({ screen: 'result', result: { outcome: 'victory', gold: 1050, experience: 100 } })
    expect(completed.events.some((event) => event.type === 'UNLOCK_GRANTED' && event.message.includes('화산 동굴'))).toBe(true)
    expect(completed.state.profile?.questProgress.unlockedQuestIds).toEqual(expect.arrayContaining(['volcanic_cave_quest', 'deep_forest_ruins_quest']))
    const hub = { ...createInitialGameState(completed.state.profile), screen: 'hub' as const }
    expect(reduceGame(hub, { type: 'REQUEST_QUEST_ENTRY', questId: 'old_castle_quest' }).events[0]).toMatchObject({ type: 'COMMAND_REJECTED' })
    expect(reduceGame(hub, { type: 'REQUEST_QUEST_ENTRY', questId: 'volcanic_cave_quest' }).state.screen).toBe('exploration')
    expect(reduceGame(hub, { type: 'REQUEST_QUEST_ENTRY', questId: 'deep_forest_ruins_quest' }).state.screen).toBe('exploration')
  })
})
