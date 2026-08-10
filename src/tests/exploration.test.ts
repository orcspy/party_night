import { describe, expect, it } from 'vitest'
import { getMapDefinition } from '../game/content'
import { createExploration, discoverNearbyPlacements, isWall, move, turn } from '../game/exploration'

describe('exploration', () => {
  it('does not enter walls when moving forward or backward', () => {
    const start = createExploration()
    const facingNorth = { ...start, direction: 'north' as const }
    expect(move(facingNorth, []).state).toEqual(facingNorth)
    const facingEast = { ...start, direction: 'east' as const }
    expect(move(facingEast, [], [], true).state).toEqual(facingEast)
  })

  it('turns in both directions and backward movement retains direction', () => {
    const start = createExploration()
    expect(turn(start, -1).direction).toBe('north')
    expect(turn(start, 1).direction).toBe('south')
    const moved = move({ ...start, x: 2, direction: 'east' }, [], [], true)
    expect(moved.state).toMatchObject({ x: 1, y: 1, direction: 'east' })
  })

  it('activates the three training encounters only in approved order', () => {
    const first = { ...createExploration(), x: 2, y: 1, direction: 'east' as const }
    expect(move(first, [])).toMatchObject({ encounterStarted: true, encounterId: 'training_ruins_encounter_1' })
    const second = { ...createExploration(), x: 5, y: 2, direction: 'south' as const }
    expect(move(second, [])).toMatchObject({ encounterStarted: false })
    expect(move(second, ['training_ruins_encounter_1'])).toMatchObject({ encounterStarted: true, encounterId: 'training_ruins_encounter_2' })
    const third = { ...createExploration(), x: 2, y: 5, direction: 'east' as const }
    expect(move(third, ['training_ruins_encounter_1'])).toMatchObject({ encounterStarted: false })
    expect(move(third, ['training_ruins_encounter_1', 'training_ruins_encounter_2'])).toMatchObject({ encounterStarted: true, encounterId: 'training_ruins_encounter_3' })
  })

  it('does not complete the quest by entering the old exit', () => {
    const beforeExit = { ...createExploration(), x: 4, y: 5, direction: 'east' as const }
    expect(move(beforeExit, ['training_ruins_encounter_1', 'training_ruins_encounter_2', 'training_ruins_encounter_3']).questCompleted).toBe(false)
  })

  it('identifies the approved depth-one side openings with a wall two cells ahead', () => {
    // At (3,4) facing south, depth 1 is (3,5): both side cells are open while its front cell (3,6) is blocked.
    expect(isWall('training_ruins', 3, 6, [])).toBe(true)
    expect(isWall('training_ruins', 4, 5, [])).toBe(false)
    expect(isWall('training_ruins', 2, 5, [])).toBe(false)
  })

  it('uses the goblin den map, ordered encounters, and discovered secret door', () => {
    const map = getMapDefinition('goblin_den')
    expect(map.rows).toHaveLength(7)
    expect(map.rows.every((row) => row.length === 9)).toBe(true)
    expect(isWall('goblin_den', 2, 2, [])).toBe(true)
    expect(isWall('goblin_den', 2, 2, ['goblin_den_secret_1'])).toBe(false)
    const first = { ...createExploration('goblin_den_quest'), x: 3, y: 1, direction: 'east' as const }
    expect(move(first, [])).toMatchObject({ encounterId: 'goblin_den_encounter_1' })
    const boss = { ...first, x: 5, y: 5, direction: 'west' as const }
    expect(move(boss, [])).toMatchObject({ encounterStarted: false })
    expect(move(boss, ['goblin_den_encounter_1', 'goblin_den_encounter_2'])).toMatchObject({ encounterId: 'goblin_den_boss' })
  })

  it('uses the approved ancient-site size, encounter order, trap, and secret branch', () => {
    const map = getMapDefinition('ancient_site')
    expect(map.rows).toHaveLength(9)
    expect(map.rows.every((row) => row.length === 9)).toBe(true)
    expect(map.encounterIds).toEqual(['ancient_site_encounter_1', 'ancient_site_encounter_2', 'ancient_site_encounter_3', 'ancient_site_boss'])
    expect(map.traps).toEqual([{ trapId: 'ancient_site_trap_1', x: 6, y: 5, damage: 2 }])
    expect(isWall('ancient_site', 5, 6, [])).toBe(true)
    expect(isWall('ancient_site', 5, 6, ['ancient_site_secret_1'])).toBe(false)
    expect(discoverNearbyPlacements('ancient_site', 5, 5, [], [])).toEqual({ trapIds: ['ancient_site_trap_1'], secretIds: ['ancient_site_secret_1'] })
    expect(discoverNearbyPlacements('ancient_site', 4, 5, [], [])).toEqual({ trapIds: [], secretIds: [] })
  })
})
