import { describe, expect, it } from 'vitest'
import type { GameEvent } from '../game/types'
import { hasImmediateBattleDamage, hasSuccessfulMovement, hasTrapDamage, isDamageRoll } from '../phaser/audio/sfxEvents'

describe('SFX event mapping', () => {
  it('plays footsteps only for successful movement', () => {
    expect(hasSuccessfulMovement([{ type: 'PARTY_MOVED', message: 'moved' }])).toBe(true)
    expect(hasSuccessfulMovement([{ type: 'MOVE_BLOCKED', message: 'blocked' }])).toBe(false)
    expect(hasSuccessfulMovement([{ type: 'PARTY_TURNED', message: 'turned' }])).toBe(false)
  })

  it('treats one area damage roll as one hit sound trigger', () => {
    const events: GameEvent[] = [
      { type: 'DAMAGE_APPLIED', message: 'a', targetId: 'a', damage: 5 },
      { type: 'DAMAGE_APPLIED', message: 'b', targetId: 'b', damage: 5 },
      { type: 'DAMAGE_APPLIED', message: 'c', targetId: 'c', damage: 5 },
      { type: 'DAMAGE_APPLIED', message: 'd', targetId: 'd', damage: 5 },
      { type: 'ROLL_RESOLVED', message: 'area roll', resultKind: 'damage', resultValue: 5, finalDice: [4] },
    ]
    expect(events.filter(isDamageRoll)).toHaveLength(1)
    expect(hasImmediateBattleDamage(events)).toBe(false)
  })

  it('allows separate resolved attacks to trigger separate hit sounds', () => {
    const events: GameEvent[] = [
      { type: 'DAMAGE_APPLIED', message: 'first', damage: 3 },
      { type: 'ROLL_RESOLVED', message: 'first roll', resultKind: 'damage', resultValue: 3, finalDice: [2] },
      { type: 'DAMAGE_APPLIED', message: 'second', damage: 4 },
      { type: 'ROLL_RESOLVED', message: 'second roll', resultKind: 'damage', resultValue: 4, finalDice: [3] },
    ]
    expect(events.filter(isDamageRoll)).toHaveLength(2)
    expect(hasImmediateBattleDamage(events)).toBe(false)
  })

  it('plays one immediate hit for damage without a resolved roll', () => {
    expect(hasImmediateBattleDamage([{ type: 'DAMAGE_APPLIED', message: 'bleed', damage: 2 }])).toBe(true)
  })

  it('maps a trap batch to one hit trigger', () => {
    expect(hasTrapDamage([
      { type: 'PARTY_MOVED', message: 'moved' },
      { type: 'TRAP_TRIGGERED', message: 'trap', damage: 4 },
      { type: 'ACTOR_DEFEATED', message: 'down' },
    ])).toBe(true)
  })
})
