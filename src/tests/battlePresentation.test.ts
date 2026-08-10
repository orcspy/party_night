import { describe, expect, it } from 'vitest'
import { buildBattlePresentationPlan, ENEMY_WINDUP_MS, ROLL_DISPLAY_MS, VICTORY_HOLD_MS } from '../app/battlePresentation'
import type { DispatchEnvelope } from '../app/gameStore'
import type { GameEvent, GameState } from '../game/types'

const state: GameState = { screen: 'battle', profile: null, session: null, result: null }

function envelope(events: GameEvent[]): DispatchEnvelope {
  return { sequence: 1, previousState: state, state, events }
}

describe('battle presentation plan', () => {
  it('preserves player roll then each enemy windup and roll order', () => {
    const events: GameEvent[] = [
      { type: 'ROLL_RESOLVED', message: 'player', actorId: 'party', finalDice: [4], rollTotal: 4 },
      { type: 'TURN_STARTED', message: 'enemy one', actorId: 'enemy_1', actorSide: 'enemy' },
      { type: 'ROLL_RESOLVED', message: 'enemy one roll', actorId: 'enemy_1', finalDice: [2], rollTotal: 2 },
      { type: 'TURN_STARTED', message: 'enemy two', actorId: 'enemy_2', actorSide: 'enemy' },
      { type: 'ROLL_RESOLVED', message: 'enemy two roll', actorId: 'enemy_2', finalDice: [3], rollTotal: 3 },
    ]
    const before = JSON.stringify(events)
    const plan = buildBattlePresentationPlan(envelope(events))
    expect(ENEMY_WINDUP_MS).toBe(0)
    expect(plan.steps.map((step) => step.kind)).toEqual(['roll', 'enemy_windup', 'roll', 'enemy_windup', 'roll'])
    expect(plan.durationMs).toBe(ROLL_DISPLAY_MS * 3 + ENEMY_WINDUP_MS * 2)
    expect(plan.lockCommands).toBe(true)
    expect(JSON.stringify(events)).toBe(before)
  })

  it('holds victory for at least two seconds with or without a terminal roll', () => {
    const rolled = buildBattlePresentationPlan(envelope([
      { type: 'ROLL_RESOLVED', message: 'final roll', actorId: 'party', finalDice: [6], rollTotal: 6 },
      { type: 'BATTLE_WON', message: 'won' },
    ]))
    expect(rolled.steps.map((step) => step.kind)).toEqual(['roll', 'victory'])
    expect(rolled.durationMs).toBe(VICTORY_HOLD_MS)

    const itemVictory = buildBattlePresentationPlan(envelope([{ type: 'BATTLE_WON', message: 'won' }]))
    expect(itemVictory.steps).toEqual([{ kind: 'victory', durationMs: VICTORY_HOLD_MS }])
    expect(itemVictory.lockCommands).toBe(true)
  })

  it('does not lock commands for a player-only roll or skipped enemy', () => {
    const plan = buildBattlePresentationPlan(envelope([
      { type: 'ROLL_RESOLVED', message: 'player', actorId: 'party', finalDice: [1], rollTotal: 1 },
      { type: 'TURN_SKIPPED', message: 'enemy skipped', actorId: 'enemy' },
    ]))
    expect(plan.steps.map((step) => step.kind)).toEqual(['roll'])
    expect(plan.lockCommands).toBe(false)
  })
})
