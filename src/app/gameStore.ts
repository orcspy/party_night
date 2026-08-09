import { createInitialGameState, reduceGame } from '../game/gameEngine'
import type { GameCommand, GameEvent, GameState } from '../game/types'
import { clearProfileV2, readProfileV2, writeProfileV2 } from './saveV2'

type Listener = (state: GameState, events: GameEvent[]) => void

export interface GameStore {
  getState: () => GameState
  dispatch: (command: GameCommand) => GameEvent[]
  subscribe: (listener: Listener) => () => void
}

interface GameStoreOptions {
  initialState?: GameState
  storage?: Storage
}

export function createGameStore(options: GameStoreOptions = {}): GameStore {
  let state = options.initialState ?? createInitialGameState(readProfileV2(options.storage))
  const listeners = new Set<Listener>()

  return {
    getState: () => state,
    dispatch: (command) => {
      const result = reduceGame(state, command)
      state = result.state
      if (result.persistence === 'clear_profile') clearProfileV2(options.storage)
      if (result.persistence === 'save_profile' && state.profile) writeProfileV2(state.profile, options.storage)
      listeners.forEach((listener) => listener(state, result.events))
      return result.events
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export const gameStore = createGameStore()
