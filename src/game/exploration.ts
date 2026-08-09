import { getMapDefinition, getNextRequiredEncounter, getQuestDefinition } from './content'
import type { Direction, ExplorationState, QuestId } from './types'

const DIRECTIONS: Direction[] = ['north', 'east', 'south', 'west']
const VECTORS: Record<Direction, { x: number; y: number }> = {
  north: { x: 0, y: -1 }, east: { x: 1, y: 0 },
  south: { x: 0, y: 1 }, west: { x: -1, y: 0 },
}

export function discoverNearbyPlacements(mapId: string, x: number, y: number, discoveredTrapIds: readonly string[], discoveredSecretIds: readonly string[]) {
  const map = getMapDefinition(mapId)
  const nearby = (targetX: number, targetY: number) => Math.abs(targetX - x) + Math.abs(targetY - y) <= 1
  return {
    trapIds: map.traps.filter((trap) => nearby(trap.x, trap.y) && !discoveredTrapIds.includes(trap.trapId)).map((trap) => trap.trapId),
    secretIds: map.secrets.filter((secret) => nearby(secret.doorX, secret.doorY) && !discoveredSecretIds.includes(secret.secretId)).map((secret) => secret.secretId),
  }
}

export interface ExplorationResult {
  state: ExplorationState
  blocked: boolean
  encounterStarted: boolean
  encounterId: string | null
  questCompleted: boolean
}

export function createExploration(questId: QuestId = 'training_ruins_quest'): ExplorationState {
  const quest = getQuestDefinition(questId)
  if (!quest) throw new Error(`구현되지 않은 퀘스트다: ${questId}`)
  const map = getMapDefinition(quest.mapId)
  return { mapId: map.mapId, x: map.start.x, y: map.start.y, direction: map.start.direction, questStatus: 'active' }
}

export function turn(state: ExplorationState, amount: -1 | 1): ExplorationState {
  const index = DIRECTIONS.indexOf(state.direction)
  return { ...state, direction: DIRECTIONS[(index + amount + 4) % 4] }
}

export function isWall(mapId: string, x: number, y: number, discoveredSecretIds: readonly string[] = []): boolean {
  const map = getMapDefinition(mapId)
  if (y < 0 || y >= map.rows.length || x < 0 || x >= map.rows[0].length) return true
  if (map.rows[y][x] !== '#') return false
  const secret = map.secrets.find((item) => item.doorX === x && item.doorY === y)
  return !secret || !discoveredSecretIds.includes(secret.secretId)
}

export function move(state: ExplorationState, completedEncounterIds: readonly string[], discoveredSecretIds: readonly string[] = [], backward = false): ExplorationResult {
  const vector = VECTORS[state.direction]
  const sign = backward ? -1 : 1
  const x = state.x + vector.x * sign
  const y = state.y + vector.y * sign
  if (isWall(state.mapId, x, y, discoveredSecretIds)) return { state, blocked: true, encounterStarted: false, encounterId: null, questCompleted: false }

  const encounter = getNextRequiredEncounter(state.mapId, completedEncounterIds)
  const encounterStarted = encounter?.x === x && encounter.y === y
  return {
    state: { ...state, x, y },
    blocked: false,
    encounterStarted,
    encounterId: encounterStarted ? encounter.encounterId : null,
    questCompleted: false,
  }
}
