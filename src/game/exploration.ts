import { MAP_ROWS } from './content'
import type { Direction, ExplorationState } from './types'

const DIRECTIONS: Direction[] = ['north', 'east', 'south', 'west']
const VECTORS: Record<Direction, { x: number; y: number }> = {
  north: { x: 0, y: -1 }, east: { x: 1, y: 0 },
  south: { x: 0, y: 1 }, west: { x: -1, y: 0 },
}

export interface ExplorationResult {
  state: ExplorationState
  blocked: boolean
  encounterStarted: boolean
  questCompleted: boolean
}

export function createExploration(): ExplorationState {
  return { mapId: 'training_ruins', x: 1, y: 1, direction: 'east', triggeredEncounterIds: [], questStatus: 'active' }
}

export function turn(state: ExplorationState, amount: -1 | 1): ExplorationState {
  const index = DIRECTIONS.indexOf(state.direction)
  return { ...state, direction: DIRECTIONS[(index + amount + 4) % 4] }
}

export function isWall(x: number, y: number): boolean {
  return y < 0 || y >= MAP_ROWS.length || x < 0 || x >= MAP_ROWS[0].length || MAP_ROWS[y][x] === '#'
}

export function move(state: ExplorationState, backward = false): ExplorationResult {
  const vector = VECTORS[state.direction]
  const sign = backward ? -1 : 1
  const x = state.x + vector.x * sign
  const y = state.y + vector.y * sign
  if (isWall(x, y)) return { state, blocked: true, encounterStarted: false, questCompleted: false }

  const cell = MAP_ROWS[y][x]
  const encounterStarted = cell === 'E' && !state.triggeredEncounterIds.includes('ruins_goblins')
  const questCompleted = cell === 'X' && state.triggeredEncounterIds.includes('ruins_goblins')
  return {
    state: { ...state, x, y, questStatus: questCompleted ? 'completed' : state.questStatus },
    blocked: false,
    encounterStarted,
    questCompleted,
  }
}
