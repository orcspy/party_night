import { describe, expect, it } from 'vitest'
import { createEncounterEnemies, createPartyFromCharacters } from '../game/content'
import { createExploration } from '../game/exploration'
import { createInitialGameState, createProfile, reduceGame } from '../game/gameEngine'
import { settleGoblinDen, settleTrainingRuins } from '../game/rewards'
import type { CombatState, ExpeditionSession, GameCommand, GameState, MainCharacterConfig } from '../game/types'

const main: MainCharacterConfig = { name: '엔진테스터', raceId: 'elf', classId: 'archer', gender: '여성' }
const createCommand: Extract<GameCommand, { type: 'CREATE_PROFILE' }> = {
  type: 'CREATE_PROFILE', mainCharacterConfig: main, profileId: 'profile_engine', createdAt: 10, rootSeed: 99,
}

function createdState() {
  const opened = reduceGame(createInitialGameState(), { type: 'OPEN_PROFILE_CREATE' })
  return reduceGame(opened.state, createCommand).state
}

describe('pure game engine profile and expedition flow', () => {
  it('creates the approved stage 1 profile defaults', () => {
    const state = createdState()
    expect(state.screen).toBe('hub')
    expect(state.profile).toMatchObject({
      profileId: 'profile_engine', gold: 300, pendingReward: null,
      storage: { capacity: 100, equipmentInstances: [], itemStacks: [], skillInstances: [] },
      questProgress: { unlockedQuestIds: ['training_ruins_quest'], completedQuestIds: [] },
      shop: { unlockedRarities: ['common'], skillOfferIds: [] },
    })
    expect(state.profile?.characters).toHaveLength(4)
    expect(state.profile?.characters.every((character) => character.level === 1 && character.experience === 0 && character.equipment.weapon)).toBe(true)
  })

  it('derives the same expedition seed from the same profile state', () => {
    const state = createdState()
    const first = reduceGame(state, { type: 'REQUEST_QUEST_ENTRY', questId: 'training_ruins_quest' })
    const second = reduceGame(state, { type: 'REQUEST_QUEST_ENTRY', questId: 'training_ruins_quest' })
    expect(first.state.session?.seed).toBe(second.state.session?.seed)
    expect(first.state.session?.expeditionId).toBe('expedition_1')
    expect(first.state.profile?.random.nextExpeditionSequence).toBe(2)
    expect(first.persistence).toBe('save_profile')
  })

  it('settles an enemy-first defeat that occurs while entering an encounter', () => {
    const expedition = reduceGame(createdState(), { type: 'REQUEST_QUEST_ENTRY', questId: 'training_ruins_quest' }).state
    const party = expedition.session!.party.map((actor, index) => ({ ...actor, currentHp: index === 0 ? 1 : 0, agi: 1 }))
    const nearEncounter: GameState = {
      ...expedition,
      session: { ...expedition.session!, party, exploration: { ...expedition.session!.exploration, x: 2, y: 1, direction: 'east' } },
    }
    const defeated = reduceGame(nearEncounter, { type: 'MOVE_FORWARD' })
    expect(defeated.state).toMatchObject({ screen: 'result', result: { outcome: 'defeat' } })
    expect(defeated.battlePresentation?.session.combat).toMatchObject({ phase: 'ended', outcome: 'lost' })
    expect(defeated.events.some((event) => event.type === 'BATTLE_LOST')).toBe(true)
  })

  it('rejects unavailable quests without changing state or persistence', () => {
    const state = createdState()
    const rejected = reduceGame(state, { type: 'REQUEST_QUEST_ENTRY', questId: 'goblin_den_quest' })
    expect(rejected.state).toBe(state)
    expect(rejected.persistence).toBe('none')
    expect(rejected.events[0].type).toBe('COMMAND_REJECTED')
  })

  it('requires explicit confirmation when storage has two or fewer free slots', () => {
    const state = createdState()
    const crowded: GameState = {
      ...state,
      profile: {
        ...state.profile!,
        storage: {
          ...state.profile!.storage,
          itemStacks: Array.from({ length: 98 }, (_, index) => ({ stackId: `item_stack_${100 + index}`, itemId: 'bandage', quantity: 10 })),
        },
      },
    }
    const warned = reduceGame(crowded, { type: 'REQUEST_QUEST_ENTRY', questId: 'training_ruins_quest' })
    expect(warned.state).toMatchObject({ screen: 'hub', session: null, pendingQuestEntry: 'training_ruins_quest' })
    expect(warned.events[0]).toMatchObject({ type: 'QUEST_ENTRY_WARNING' })
    expect(warned.persistence).toBe('none')
    expect(reduceGame(warned.state, { type: 'CONTINUE_QUEST_ENTRY', questId: 'goblin_den_quest' }).events[0].type).toBe('COMMAND_REJECTED')

    const continued = reduceGame(warned.state, { type: 'CONTINUE_QUEST_ENTRY', questId: 'training_ruins_quest' })
    expect(continued.state).toMatchObject({ screen: 'exploration', pendingQuestEntry: null })
    expect(continued.state.session?.questId).toBe('training_ruins_quest')

    const returned = reduceGame(warned.state, { type: 'RETURN_TO_STORAGE' })
    expect(returned.state).toMatchObject({ screen: 'hub', session: null, pendingQuestEntry: null })
    expect(returned.persistence).toBe('none')
  })

  it('applies shop, storage transfer, and equipment commands only in the hub', () => {
    let state = createdState()
    const boughtItem = reduceGame(state, { type: 'BUY_ITEM', itemId: 'bandage', quantity: 2 })
    expect(boughtItem.persistence).toBe('save_profile')
    state = boughtItem.state
    const stackId = state.profile!.storage.itemStacks[0].stackId
    state = reduceGame(state, { type: 'MOVE_ITEM_TO_CHARACTER', characterId: 'party_main', stackId, quantity: 1 }).state
    expect(state.profile?.characters[0].inventorySlots[0].quantity).toBe(1)

    state = reduceGame(state, { type: 'BUY_EQUIPMENT', equipmentId: 'common_head' }).state
    const equipmentInstanceId = state.profile!.storage.equipmentInstances[0].equipmentInstanceId
    state = reduceGame(state, { type: 'EQUIP_ITEM', characterId: 'party_main', equipmentInstanceId }).state
    expect(state.profile?.characters[0].equipment.head?.equipmentId).toBe('common_head')

    const expedition = reduceGame(state, { type: 'REQUEST_QUEST_ENTRY', questId: 'training_ruins_quest' }).state
    const rejected = reduceGame(expedition, { type: 'BUY_ITEM', itemId: 'bandage', quantity: 1 })
    expect(rejected.state).toBe(expedition)
    expect(rejected.persistence).toBe('none')
  })

  it('settles the quest immediately when the third encounter is won', () => {
    const hub = createdState()
    const profile = hub.profile!
    const party = createPartyFromCharacters(profile.characters)
    const enemy = { ...createEncounterEnemies('training_ruins_encounter_3')[0], currentHp: 1, maxHp: 1, def: 0 }
    const combat: CombatState = {
      battleId: 'training_ruins_encounter_3', round: 1, phase: 'awaiting_action', participants: [...party, enemy],
      turnOrder: [party[0].id], turnIndex: 0, selectedSkillId: null, pendingRoll: null, usedSkillIdsByActor: {}, cooldownsByActor: {}, tauntsByEnemy: {}, stunnedActionsByActor: {}, itemBuffsByActor: {}, outcome: null,
    }
    const session: ExpeditionSession = {
      expeditionId: 'expedition_1', questId: 'training_ruins_quest', seed: 99, rngState: 99, party,
      exploration: createExploration(), combat, completedEncounterIds: ['training_ruins_encounter_1', 'training_ruins_encounter_2'],
      discoveredSecretIds: [], discoveredTrapIds: [], triggeredTrapIds: [], claimedSecretRewardIds: [], pendingLoot: [], logs: [],
    }
    let state: GameState = { ...hub, screen: 'battle', session }
    state = reduceGame(state, { type: 'SELECT_SKILL', skillId: 'basic_attack' }).state
    const cancelled = reduceGame(state, { type: 'CANCEL_SKILL_SELECTION' })
    expect(cancelled.state.session?.combat).toMatchObject({ phase: 'awaiting_action', selectedSkillId: null })
    expect(cancelled.persistence).toBe('none')
    state = reduceGame(cancelled.state, { type: 'SELECT_SKILL', skillId: 'basic_attack' }).state
    const settled = reduceGame(state, { type: 'SELECT_TARGET', targetId: enemy.id })
    expect(settled.state.screen).toBe('result')
    expect(settled.state.session).toBeNull()
    expect(settled.state.profile?.gold).toBe(1400)
    expect(settled.state.result).toMatchObject({ gold: 1100, settlement: { goldGranted: 1100 } })
    expect(settled.events.find((event) => event.type === 'REWARD_GRANTED')?.message).toContain('골드 1100')
    expect(settled.state.profile?.characters.every((character) => character.level === 2)).toBe(true)
    expect(settled.state.profile?.questProgress.completedQuestIds).toContain('training_ruins_quest')
    expect(settled.persistence).toBe('save_profile')
    expect(settled.battlePresentation?.session.combat).toMatchObject({ phase: 'ended', outcome: 'won' })
    expect(settled.battlePresentation?.session.combat?.participants.find((actor) => actor.id === enemy.id)?.currentHp).toBe(0)
    expect(settled.battlePresentation?.session.logs.find((log) => log.eventType === 'DAMAGE_APPLIED')?.kind).toBe('damage')
  })

  it('keeps an ordinary encounter terminal frame while canonical state returns to exploration', () => {
    const expedition = reduceGame(createdState(), { type: 'REQUEST_QUEST_ENTRY', questId: 'training_ruins_quest' }).state
    const party = expedition.session!.party
    const enemy = { ...createEncounterEnemies('training_ruins_encounter_1')[0], currentHp: 1, maxHp: 1, def: 0 }
    const combat: CombatState = {
      battleId: 'training_ruins_encounter_1', round: 1, phase: 'awaiting_action', participants: [...party, enemy],
      turnOrder: [party[0].id], turnIndex: 0, selectedSkillId: null, pendingRoll: null, usedSkillIdsByActor: {}, cooldownsByActor: {}, tauntsByEnemy: {}, stunnedActionsByActor: {}, itemBuffsByActor: {}, outcome: null,
    }
    const battleState: GameState = { ...expedition, screen: 'battle', session: { ...expedition.session!, combat } }
    const selected = reduceGame(battleState, { type: 'SELECT_SKILL', skillId: 'basic_attack' }).state
    const won = reduceGame(selected, { type: 'SELECT_TARGET', targetId: enemy.id })
    expect(won.state).toMatchObject({ screen: 'exploration', session: { combat: null } })
    expect(won.battlePresentation?.session.combat).toMatchObject({ phase: 'ended', outcome: 'won' })
    expect(won.battlePresentation?.session.logs.at(-1)?.message).toBe('전투에서 승리했다.')
  })

  it('stores healing events as green log entries without parsing messages', () => {
    const expedition = reduceGame(createdState(), { type: 'REQUEST_QUEST_ENTRY', questId: 'training_ruins_quest' }).state
    const party = expedition.session!.party.map((actor) => actor.id === 'party_priest' ? { ...actor, currentHp: 1 } : actor)
    const priest = party.find((actor) => actor.id === 'party_priest')!
    const enemy = { ...createEncounterEnemies('training_ruins_encounter_1')[0], currentHp: 999, maxHp: 999 }
    const combat: CombatState = {
      battleId: 'training_ruins_encounter_1', round: 1, phase: 'awaiting_action', participants: [...party, enemy],
      turnOrder: [priest.id], turnIndex: 0, selectedSkillId: null, pendingRoll: null, usedSkillIdsByActor: {}, cooldownsByActor: {}, tauntsByEnemy: {}, stunnedActionsByActor: {}, itemBuffsByActor: {}, outcome: null,
    }
    const battleState: GameState = { ...expedition, screen: 'battle', session: { ...expedition.session!, combat } }
    const selected = reduceGame(battleState, { type: 'SELECT_SKILL', skillId: 'heal' }).state
    const healed = reduceGame(selected, { type: 'SELECT_TARGET', targetId: priest.id })
    expect(healed.state.session?.logs.find((log) => log.eventType === 'HEAL_APPLIED')).toMatchObject({ kind: 'heal' })
  })

  it('starts goblin den and applies seek_trap discovery or one-time trap damage', () => {
    const archerHub = createdState()
    const trained = settleTrainingRuins(archerHub.profile!, 3, 'expedition_1')
    if (!trained.ok) throw new Error(trained.error)
    const hub: GameState = { ...archerHub, screen: 'hub', profile: trained.value.profile }
    const started = reduceGame(hub, { type: 'REQUEST_QUEST_ENTRY', questId: 'goblin_den_quest' }).state
    expect(started.session?.exploration.mapId).toBe('goblin_den')
    expect(started.session?.discoveredTrapIds).toEqual([])
    const beforeHp = started.session!.party.map((actor) => actor.currentHp)
    const nearTrap: GameState = { ...started, session: { ...started.session!, exploration: { ...started.session!.exploration, x: 5, y: 1, direction: 'east' } } }
    const trappedResult = reduceGame(nearTrap, { type: 'MOVE_FORWARD' })
    const trapped = trappedResult.state
    expect(trapped.session?.party.map((actor) => actor.currentHp)).toEqual(beforeHp.map((hp) => hp - 2))
    expect(trapped.session?.triggeredTrapIds).toEqual(['goblin_den_trap_1'])
    expect(trappedResult.events.find((event) => event.type === 'TRAP_TRIGGERED')).toMatchObject({ placementId: 'goblin_den_trap_1', damage: 2 })
    expect(trapped.session?.logs.filter((log) => log.message.includes('함정 발동'))).toHaveLength(1)
    expect(trapped.session?.logs.find((log) => log.eventType === 'TRAP_TRIGGERED')?.kind).toBe('damage')

    const rogueProfile = createProfile({ type: 'CREATE_PROFILE', mainCharacterConfig: { name: '도적', raceId: 'human', classId: 'rogue', gender: '남성' }, profileId: 'rogue', createdAt: 1, rootSeed: 5 })!
    const rogueTrained = settleTrainingRuins(rogueProfile, 3, 'expedition_1')
    if (!rogueTrained.ok) throw new Error(rogueTrained.error)
    const rogueStarted = reduceGame({ ...createInitialGameState(rogueTrained.value.profile), screen: 'hub' }, { type: 'REQUEST_QUEST_ENTRY', questId: 'goblin_den_quest' })
    const rogueStart = rogueStarted.state
    expect(rogueStart.session?.discoveredTrapIds).toEqual(['goblin_den_trap_1'])
    expect(rogueStart.session?.discoveredSecretIds).toEqual(['goblin_den_secret_1'])
    expect(rogueStarted.events.map((event) => event.type)).toEqual(['SESSION_STARTED', 'TRAP_DISCOVERED', 'SECRET_ROOM_DISCOVERED'])
    expect(rogueStarted.events[1]).toMatchObject({ sourceActorId: 'party_main', skillId: 'seek_trap', placementId: 'goblin_den_trap_1' })
    expect(rogueStart.session?.logs.map((log) => log.message)).toEqual(rogueStarted.events.map((event) => event.message))

    const secretNear: GameState = { ...rogueStart, session: { ...rogueStart.session!, exploration: { ...rogueStart.session!.exploration, x: 2, y: 2, direction: 'south' } } }
    const secretResult = reduceGame(secretNear, { type: 'MOVE_FORWARD' })
    expect(secretResult.events.find((event) => event.type === 'REWARD_GRANTED')?.message).toMatch(/^비밀방에서 .+을\(를\) 발견했다\.$/)
    expect(secretResult.events.find((event) => event.type === 'REWARD_GRANTED')?.message).not.toContain('goblin_den_secret_1')
  })

  it('enters ancient site and settles the ogre boss through a consumed fire bomb', () => {
    const hub = createdState()
    const trained = settleTrainingRuins(hub.profile!, 1, 'expedition_1')
    if (!trained.ok) throw new Error(trained.error)
    const goblin = settleGoblinDen(trained.value.profile, 2, 'expedition_2', [])
    if (!goblin.ok) throw new Error(goblin.error)
    const mainCharacter = { ...goblin.value.profile.characters[0], inventorySlots: [{ stackId: 'item_stack_100', itemId: 'fire_bomb', quantity: 1 }] }
    const profile = { ...goblin.value.profile, characters: [mainCharacter, ...goblin.value.profile.characters.slice(1)] as typeof goblin.value.profile.characters, random: { ...goblin.value.profile.random, nextInstanceSequence: 101 } }
    const started = reduceGame({ ...hub, screen: 'hub', profile }, { type: 'REQUEST_QUEST_ENTRY', questId: 'ancient_site_quest' })
    expect(started.state.session?.exploration.mapId).toBe('ancient_site')
    const party = started.state.session!.party
    const enemy = { ...createEncounterEnemies('ancient_site_boss')[0], currentHp: 10 }
    const combat: CombatState = {
      battleId: 'ancient_site_boss', round: 1, phase: 'awaiting_action', participants: [...party, enemy], turnOrder: [party[0].id], turnIndex: 0,
      selectedSkillId: null, pendingRoll: null, usedSkillIdsByActor: {}, cooldownsByActor: {}, tauntsByEnemy: {}, stunnedActionsByActor: {}, itemBuffsByActor: {}, outcome: null,
    }
    const battleState: GameState = { ...started.state, screen: 'battle', session: { ...started.state.session!, combat } }
    const result = reduceGame(battleState, { type: 'USE_ITEM', characterId: party[0].id, stackId: 'item_stack_100', targetId: enemy.id })
    expect(result.state.screen).toBe('result')
    expect(result.state.profile?.characters[0].inventorySlots).toEqual([])
    expect(result.state.profile?.questProgress.completedQuestIds).toContain('ancient_site_quest')
    expect(result.state.profile?.shop.unlockedRarities).toContain('rare')
    expect(result.persistence).toBe('save_profile')
    expect(result.battlePresentation?.session.combat).toMatchObject({ phase: 'ended', outcome: 'won' })
    expect(result.battlePresentation?.session.logs.some((log) => log.eventType === 'ROLL_RESOLVED')).toBe(false)
  })
})
