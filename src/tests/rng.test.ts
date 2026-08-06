import { describe, expect, it } from 'vitest'
import { rollDie } from '../game/rng'

function sequence(seed: number): number[] {
  let state = seed
  return Array.from({ length: 30 }, () => {
    const result = rollDie(state)
    state = result.state
    return result.value
  })
}

describe('seeded dice', () => {
  it('repeats the same sequence for the same seed', () => {
    expect(sequence(123456)).toEqual(sequence(123456))
    expect(sequence(123456)).not.toEqual(sequence(123457))
  })

  it('only returns d6 values', () => {
    expect(sequence(42).every((value) => value >= 1 && value <= 6)).toBe(true)
  })
})
