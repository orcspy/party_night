export interface RandomResult {
  value: number
  state: number
}

export function normalizeSeed(seed: number): number {
  const normalized = seed >>> 0
  return normalized === 0 ? 0x6d2b79f5 : normalized
}

export function nextRandom(state: number): RandomResult {
  let next = normalizeSeed(state)
  next ^= next << 13
  next ^= next >>> 17
  next ^= next << 5
  const unsigned = next >>> 0
  return { value: unsigned / 0x100000000, state: unsigned }
}

export function rollDie(state: number, sides = 6): RandomResult {
  const next = nextRandom(state)
  return { value: Math.floor(next.value * sides) + 1, state: next.state }
}

export function randomIndex(state: number, length: number): RandomResult {
  if (length <= 0) throw new Error('Cannot choose from an empty collection')
  const next = nextRandom(state)
  return { value: Math.floor(next.value * length), state: next.state }
}
