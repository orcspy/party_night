import { createInitialGameState, reduceGame, type BattlePresentationFrame } from '../game/gameEngine'
import type { GameCommand, GameEvent, GameState } from '../game/types'
import { clearProfileV2, readProfileV2, writeProfileV2 } from './saveV2'

export interface DispatchEnvelope {
  sequence: number
  previousState: GameState
  state: GameState
  events: GameEvent[]
  battlePresentation?: BattlePresentationFrame
}

type Listener = (envelope: DispatchEnvelope) => void

export interface GameStore {
  getState: () => GameState
  getSnapshot: () => DispatchEnvelope
  dispatch: (command: GameCommand) => GameEvent[]
  subscribe: (listener: Listener) => () => void
}

interface GameStoreOptions {
  initialState?: GameState
  storage?: Storage
}

export function createGameStore(options: GameStoreOptions = {}): GameStore {
  let state = options.initialState ?? createInitialGameState(readProfileV2(options.storage))
  let snapshot: DispatchEnvelope = { sequence: 0, previousState: state, state, events: [] }
  const listeners = new Set<Listener>()

  return {
    getState: () => state,
    getSnapshot: () => snapshot,
    dispatch: (command) => {
      const previousState = state
      const result = reduceGame(previousState, command)
      state = result.state
      if (result.persistence === 'clear_profile') clearProfileV2(options.storage)
      if (result.persistence === 'save_profile' && state.profile) writeProfileV2(state.profile, options.storage)
      snapshot = {
        sequence: snapshot.sequence + 1,
        previousState,
        state,
        events: result.events,
        battlePresentation: result.battlePresentation,
      }
      listeners.forEach((listener) => listener(snapshot))
      return result.events
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export const gameStore = createGameStore()
