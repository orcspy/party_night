import type { DispatchEnvelope } from './gameStore'
import type { GameEvent } from '../game/types'

export const ENEMY_WINDUP_MS = 1000
export const ROLL_DISPLAY_MS = 1000
export const VICTORY_HOLD_MS = 2000

export type BattlePresentationStep =
  | { kind: 'enemy_windup'; actorId: string; durationMs: number }
  | { kind: 'roll'; event: GameEvent; durationMs: number }
  | { kind: 'victory'; durationMs: number }

export interface BattlePresentationPlan {
  sequence: number
  steps: BattlePresentationStep[]
  durationMs: number
  lockCommands: boolean
  terminalOutcome: 'won' | 'lost' | null
}

export function buildBattlePresentationPlan(envelope: DispatchEnvelope): BattlePresentationPlan {
  const steps: BattlePresentationStep[] = []
  let terminalOutcome: BattlePresentationPlan['terminalOutcome'] = null

  for (const event of envelope.events) {
    if (event.type === 'TURN_STARTED' && event.actorSide === 'enemy' && event.actorId) {
      steps.push({ kind: 'enemy_windup', actorId: event.actorId, durationMs: ENEMY_WINDUP_MS })
    }
    if (event.type === 'ROLL_RESOLVED' && event.finalDice && event.finalDice.length > 0) {
      steps.push({ kind: 'roll', event, durationMs: ROLL_DISPLAY_MS })
    }
    if (event.type === 'BATTLE_WON') terminalOutcome = 'won'
    if (event.type === 'BATTLE_LOST') terminalOutcome = 'lost'
  }

  let durationMs = steps.reduce((total, step) => total + step.durationMs, 0)
  if (terminalOutcome === 'won' && durationMs < VICTORY_HOLD_MS) {
    const remaining = VICTORY_HOLD_MS - durationMs
    steps.push({ kind: 'victory', durationMs: remaining })
    durationMs += remaining
  }

  return {
    sequence: envelope.sequence,
    steps,
    durationMs,
    lockCommands: terminalOutcome !== null || steps.some((step) => step.kind === 'enemy_windup'),
    terminalOutcome,
  }
}
