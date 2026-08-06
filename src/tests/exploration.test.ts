import { describe, expect, it } from 'vitest'
import { createExploration, move, turn } from '../game/exploration'

describe('exploration', () => {
  it('does not enter walls when moving forward or backward', () => {
    const start = createExploration()
    const facingNorth = { ...start, direction: 'north' as const }
    expect(move(facingNorth).state).toEqual(facingNorth)
    const facingEast = { ...start, direction: 'east' as const }
    expect(move(facingEast, true).state).toEqual(facingEast)
  })

  it('turns in both directions and backward movement retains direction', () => {
    const start = createExploration()
    expect(turn(start, -1).direction).toBe('north')
    expect(turn(start, 1).direction).toBe('south')
    const moved = move({ ...start, x: 2, direction: 'east' }, true)
    expect(moved.state).toMatchObject({ x: 1, y: 1, direction: 'east' })
  })

  it('starts the fixed encounter only before it is recorded', () => {
    const beforeEncounter = { ...createExploration(), x: 2, y: 5, direction: 'east' as const }
    expect(move(beforeEncounter).encounterStarted).toBe(true)
    expect(move({ ...beforeEncounter, triggeredEncounterIds: ['ruins_goblins'] }).encounterStarted).toBe(false)
  })

  it('completes the exit only after the encounter victory', () => {
    const beforeExit = { ...createExploration(), x: 4, y: 5, direction: 'east' as const }
    expect(move(beforeExit).questCompleted).toBe(false)
    const won = { ...beforeExit, triggeredEncounterIds: ['ruins_goblins'] }
    expect(move(won).questCompleted).toBe(true)
    expect(move(won).state.questStatus).toBe('completed')
  })
})
