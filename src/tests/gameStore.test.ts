import { describe, expect, it } from 'vitest'
import { createGameStore } from '../app/gameStore'
import { createEnemies, createParty } from '../game/content'
import { createExploration } from '../game/exploration'
import type { CombatState, GameState, MainCharacterConfig } from '../game/types'

const main: MainCharacterConfig = {
  name: '패배테스터',
  raceId: 'human',
  classId: 'warrior',
  gender: '기타',
}

describe('game store defeat flow', () => {
  it('transitions to an unrewarded defeat, returns to setup, and heals the next party', () => {
    const party = createParty(main).map((actor, index) => ({
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
      outcome: null,
    }
    const initialState: GameState = {
      screen: 'battle',
      profile: { mainCharacterConfig: main, totalGold: 17, totalExperience: 23 },
      hasSave: true,
      session: {
        seed: 42,
        rngState: 42,
        party,
        exploration: createExploration(),
        combat,
        logs: [],
      },
      result: null,
    }
    const store = createGameStore(initialState)

    store.dispatch({ type: 'SELECT_SKILL', skillId: 'basic_attack' })
    store.dispatch({ type: 'SELECT_TARGET', targetId: enemy.id })

    expect(store.getState().screen).toBe('result')
    expect(store.getState().result).toEqual({ outcome: 'defeat', gold: 0, experience: 0 })
    expect(store.getState().profile.totalGold).toBe(17)
    expect(store.getState().profile.totalExperience).toBe(23)

    store.dispatch({ type: 'RETURN_TO_SETUP' })
    expect(store.getState().screen).toBe('setup')
    expect(store.getState().session).toBeNull()
    expect(store.getState().result).toBeNull()

    store.dispatch({ type: 'START_QUEST', mainCharacterConfig: main, seed: 7 })
    expect(store.getState().session?.party.every((actor) => actor.currentHp === actor.maxHp)).toBe(true)
    expect(store.getState().profile.totalGold).toBe(17)
    expect(store.getState().profile.totalExperience).toBe(23)
  })
})
