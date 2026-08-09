import { describe, expect, it } from 'vitest'
import { createGameStore } from '../app/gameStore'
import { PROFILE_V2_KEY } from '../app/saveV2'
import { createEnemies, createPartyFromCharacters } from '../game/content'
import { createExploration } from '../game/exploration'
import { createInitialGameState, createProfile } from '../game/gameEngine'
import type { CombatState, ExpeditionSession, GameState, MainCharacterConfig, ProfileV2 } from '../game/types'

const main: MainCharacterConfig = {
  name: '패배테스터',
  raceId: 'human',
  classId: 'warrior',
  gender: '남성',
}

function profile(): ProfileV2 {
  return createProfile({ type: 'CREATE_PROFILE', mainCharacterConfig: main, profileId: 'profile_test', createdAt: 1, rootSeed: 42 })!
}

function memoryStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size }, clear: () => values.clear(), getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null, removeItem: (key) => { values.delete(key) }, setItem: (key, value) => { values.set(key, value) },
  }
}

describe('game store defeat flow', () => {
  it('transitions to an unrewarded defeat, returns to hub, and heals the next party', () => {
    const savedProfile = { ...profile(), gold: 317 }
    const party = createPartyFromCharacters(savedProfile.characters).map((actor, index) => ({
      ...actor,
      currentHp: index === 0 ? 1 : 0,
    }))
    const enemy = { ...createEnemies()[0], maxHp: 99, currentHp: 99, def: 999 }
    const combat: CombatState = {
      battleId: 'deterministic_defeat',
      round: 1,
      phase: 'awaiting_action',
      participants: [...party, enemy],
      turnOrder: [party[0].id, enemy.id, ...party.slice(1).map((actor) => actor.id)],
      turnIndex: 0,
      selectedSkillId: null,
      pendingRoll: null,
      usedSkillIdsByActor: {},
      cooldownsByActor: {},
      tauntsByEnemy: {},
      stunnedActionsByActor: {},
      itemBuffsByActor: {},
      outcome: null,
    }
    const session: ExpeditionSession = {
      expeditionId: 'expedition_test', questId: 'training_ruins_quest', seed: 42, rngState: 42,
      party, exploration: createExploration(), combat, completedEncounterIds: [], discoveredSecretIds: [],
      discoveredTrapIds: [], triggeredTrapIds: [], claimedSecretRewardIds: [], pendingLoot: [], logs: [],
    }
    const initialState: GameState = { screen: 'battle', profile: savedProfile, session, result: null }
    const store = createGameStore({ initialState })

    store.dispatch({ type: 'SELECT_SKILL', skillId: 'basic_attack' })
    store.dispatch({ type: 'SELECT_TARGET', targetId: enemy.id })

    expect(store.getState().screen).toBe('result')
    expect(store.getState().result).toEqual({ outcome: 'defeat', gold: 0, experience: 0 })
    expect(store.getState().profile?.gold).toBe(317)

    store.dispatch({ type: 'RETURN_TO_HUB' })
    expect(store.getState().screen).toBe('hub')
    expect(store.getState().session).toBeNull()
    expect(store.getState().result).toBeNull()

    store.dispatch({ type: 'REQUEST_QUEST_ENTRY', questId: 'training_ruins_quest' })
    expect(store.getState().session?.party.every((actor) => actor.currentHp === actor.maxHp)).toBe(true)
    expect(store.getState().profile?.gold).toBe(317)
  })

  it('notifies subscribers with engine events', () => {
    const store = createGameStore({ initialState: createInitialGameState() })
    const received: string[] = []
    const unsubscribe = store.subscribe((_state, events) => received.push(...events.map((event) => event.type)))
    store.dispatch({ type: 'OPEN_PROFILE_CREATE' })
    unsubscribe()
    expect(received).toEqual(['SCREEN_CHANGED'])
  })

  it('persists an accepted hub transaction', () => {
    const storage = memoryStorage()
    const initialState = { ...createInitialGameState(profile()), screen: 'hub' as const }
    const store = createGameStore({ initialState, storage })
    const events = store.dispatch({ type: 'BUY_EQUIPMENT', equipmentId: 'common_head' })
    expect(events[0].type).toBe('SHOP_TRANSACTION')
    expect(JSON.parse(storage.getItem(PROFILE_V2_KEY)!).profile.storage.equipmentInstances).toHaveLength(1)
  })
})
