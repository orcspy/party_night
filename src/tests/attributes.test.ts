import { describe, expect, it } from 'vitest'
import { CLASS_DATA, deriveCombatStats } from '../game/content'
import type { BaseAttributes, ClassId } from '../game/types'

const expected: Record<ClassId, { maxHp: number; atk: number; def: number; agi: number }> = {
  warrior: { maxHp: 30, atk: 5, def: 4, agi: 2 },
  rogue: { maxHp: 22, atk: 4, def: 2, agi: 6 },
  archer: { maxHp: 24, atk: 5, def: 2, agi: 5 },
  paladin: { maxHp: 28, atk: 4, def: 5, agi: 2 },
  priest: { maxHp: 23, atk: 3, def: 3, agi: 3 },
  mage: { maxHp: 18, atk: 6, def: 1, agi: 4 },
}

describe('base attributes and derived combat stats', () => {
  it('uses valid 36-point initial templates', () => {
    for (const data of Object.values(CLASS_DATA)) {
      const values = Object.values(data.attributes)
      expect(values.every((value) => Number.isInteger(value) && value >= 1 && value <= 10)).toBe(true)
      expect(values.reduce((sum, value) => sum + value, 0)).toBe(36)
    }
  })

  it('reproduces every v0.1.0 class combat stat', () => {
    for (const [classId, data] of Object.entries(CLASS_DATA) as [ClassId, (typeof CLASS_DATA)[ClassId]][]) {
      expect(deriveCombatStats(data.attributes, data.derivation)).toEqual(expected[classId])
    }
  })

  it('derives HP from CON and defense from CON, STR, and DEX', () => {
    const data = CLASS_DATA.warrior
    const strongerCon = { ...data.attributes, con: data.attributes.con + 1 }
    expect(deriveCombatStats(strongerCon, data.derivation).maxHp).toBe(expected.warrior.maxHp + 2)

    const defensive: BaseAttributes = { str: 10, dex: 10, int: 1, con: 10, agi: 1, luck: 1 }
    expect(deriveCombatStats(defensive, { attackBasis: 'str', attackModifier: 0, defenseModifier: 0 }).def).toBe(4)
  })

  it('uses only the configured attack basis and supports paladin hybrid attack', () => {
    const rogue = CLASS_DATA.rogue
    const raisedStrength = { ...rogue.attributes, str: rogue.attributes.str + 4 }
    expect(deriveCombatStats(raisedStrength, rogue.derivation).atk).toBe(expected.rogue.atk)

    const paladin = CLASS_DATA.paladin
    const raisedIntelligence = { ...paladin.attributes, int: 12 }
    expect(deriveCombatStats(raisedIntelligence, paladin.derivation).atk).toBe(6)
  })

  it('keeps LUCK inactive and clamps derived combat values to one', () => {
    const mage = CLASS_DATA.mage
    const lucky = { ...mage.attributes, luck: 999 }
    expect(deriveCombatStats(lucky, mage.derivation)).toEqual(expected.mage)

    const minimum: BaseAttributes = { str: 1, dex: 1, int: 1, con: 1, agi: 1, luck: 1 }
    const stats = deriveCombatStats(minimum, { attackBasis: 'int', attackModifier: -99, defenseModifier: -99 })
    expect(stats.atk).toBe(1)
    expect(stats.def).toBe(1)
    expect(stats.agi).toBe(1)
  })

  it('rejects non-integer attributes', () => {
    expect(() => deriveCombatStats({ ...CLASS_DATA.warrior.attributes, str: Number.NaN }, CLASS_DATA.warrior.derivation)).toThrow(TypeError)
    expect(() => deriveCombatStats({ ...CLASS_DATA.warrior.attributes, dex: 1.5 }, CLASS_DATA.warrior.derivation)).toThrow(TypeError)
    expect(() => deriveCombatStats({ ...CLASS_DATA.warrior.attributes, con: 0 }, CLASS_DATA.warrior.derivation)).toThrow(RangeError)
  })
})
