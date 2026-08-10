import type { GameEvent } from '../../game/types'

export function hasSuccessfulMovement(events: readonly GameEvent[]): boolean {
  return events.some((event) => event.type === 'PARTY_MOVED')
}

export function hasTrapDamage(events: readonly GameEvent[]): boolean {
  return events.some((event) => event.type === 'TRAP_TRIGGERED')
}

export function isDamageRoll(event: GameEvent): boolean {
  return event.type === 'ROLL_RESOLVED' && event.resultKind === 'damage' && (event.resultValue ?? 0) > 0
}

export function hasImmediateBattleDamage(events: readonly GameEvent[]): boolean {
  const hasDamage = events.some((event) => event.type === 'DAMAGE_APPLIED')
  const hasResolvedDamageRoll = events.some(isDamageRoll)
  return hasDamage && !hasResolvedDamageRoll
}
